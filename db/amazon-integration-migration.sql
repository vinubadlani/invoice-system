-- Amazon SP-API integration: multi-tenant connections, OAuth state, order sync
-- bookkeeping, and SKU mapping. Mirrors the tenant-isolation and RPC
-- conventions already used throughout db/rpc-hardening-migration.sql
-- (business_id scoping, security definer + auth.uid() ownership checks).
--
-- Apply this manually against Supabase, the same way the other db/*.sql
-- files in this repo are applied (no Supabase CLI migration history exists
-- in this project).

-- ============================================================================
-- 1. invoices: one additive, backward-compatible column
-- ============================================================================

alter table public.invoices
  add column if not exists source text not null default 'manual';

alter table public.invoices
  drop constraint if exists invoices_source_check;
alter table public.invoices
  add constraint invoices_source_check check (source in ('manual', 'amazon'));

-- Extend rpc_create_invoice with an optional p_source param (appended at the
-- end with a default so existing callers that don't pass it are unaffected).
create or replace function public.rpc_create_invoice(
  p_business_id uuid,
  p_invoice_no text,
  p_date date,
  p_party_name text,
  p_state text,
  p_address text,
  p_net_total numeric,
  p_type text,
  p_party_id uuid default null,
  p_gstin text default null,
  p_items jsonb default '[]'::jsonb,
  p_subtotal numeric default 0,
  p_discount_amount numeric default 0,
  p_discount_percent numeric default 0,
  p_total_tax numeric default 0,
  p_round_off numeric default 0,
  p_payment_received numeric default 0,
  p_balance_due numeric default 0,
  p_status text default 'draft',
  p_due_date date default null,
  p_payment_method text default 'Cash',
  p_source text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.businesses where id = p_business_id and user_id = auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  insert into public.invoices (
    business_id, invoice_no, date, party_name, party_id, gstin, state, address, items,
    subtotal, discount_amount, discount_percent, total_tax, round_off, net_total,
    payment_received, balance_due, type, status, due_date, payment_method, source
  ) values (
    p_business_id, p_invoice_no, p_date, p_party_name, p_party_id, p_gstin, p_state, p_address, p_items,
    p_subtotal, p_discount_amount, p_discount_percent, p_total_tax, p_round_off, p_net_total,
    p_payment_received, p_balance_due, p_type, p_status, p_due_date, p_payment_method, p_source
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ============================================================================
-- 2. amazon_connections — one row per connected Amazon Seller Central account
-- ============================================================================

create table if not exists public.amazon_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid not null,
  seller_id text not null,
  marketplace_id text not null,
  region text not null default 'eu',
  environment text not null default 'sandbox',
  status text not null default 'connected',
  encrypted_refresh_token text,
  token_iv text,
  token_auth_tag text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  last_error text,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint amazon_connections_environment_check check (environment in ('sandbox', 'production')),
  constraint amazon_connections_status_check check (status in ('connected', 'disconnected', 'error', 'reauth_required')),
  constraint amazon_connections_region_check check (region in ('na', 'eu', 'fe')),
  unique (business_id, seller_id, marketplace_id)
);

alter table public.amazon_connections enable row level security;
-- Deliberately no policy is granted to authenticated/anon: this table holds
-- the encrypted refresh token, so it must be reachable only via
-- security-definer RPCs (below) or the service-role key used by our API
-- routes — never by a direct client-side select, even a `select *` bug.

create index if not exists idx_amazon_connections_business on public.amazon_connections(business_id);

-- ============================================================================
-- 3. amazon_oauth_states — single-use, tenant-bound CSRF state for the OAuth
--    redirect flow. Written/read only by our server (service role) — the
--    callback recovers business_id/user_id from this row, never from
--    anything the browser sends.
-- ============================================================================

create table if not exists public.amazon_oauth_states (
  state text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null,
  environment text not null default 'sandbox',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table public.amazon_oauth_states enable row level security;
-- No policies for authenticated/anon — service role only.

create index if not exists idx_amazon_oauth_states_expires on public.amazon_oauth_states(expires_at);

-- ============================================================================
-- 4. amazon_orders — sync bookkeeping + idempotency anchor.
--    unique(business_id, amazon_order_id) is what makes re-running sync
--    safe: the sync service always upserts here before ever touching
--    invoices, so the same Amazon order can never produce two invoices.
-- ============================================================================

create table if not exists public.amazon_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  amazon_connection_id uuid not null references public.amazon_connections(id) on delete cascade,
  amazon_order_id text not null,
  marketplace_id text not null,
  order_status text not null,
  purchase_date timestamptz,
  order_total_amount numeric(15, 2),
  order_total_currency text,
  invoice_id uuid references public.invoices(id) on delete set null,
  sync_status text not null default 'pending',
  last_synced_at timestamptz,
  last_error text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint amazon_orders_sync_status_check check (sync_status in ('pending', 'synced', 'needs_mapping', 'failed')),
  unique (business_id, amazon_order_id)
);

alter table public.amazon_orders enable row level security;

create policy amazon_orders_select_own_business on public.amazon_orders
  for select
  using (
    exists (select 1 from public.businesses b where b.id = amazon_orders.business_id and b.user_id = auth.uid())
  );

create index if not exists idx_amazon_orders_connection on public.amazon_orders(amazon_connection_id);
create index if not exists idx_amazon_orders_business_status on public.amazon_orders(business_id, sync_status);

-- ============================================================================
-- 5. amazon_product_mappings — Amazon SKU -> HisabKitab item
-- ============================================================================

create table if not exists public.amazon_product_mappings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  amazon_connection_id uuid not null references public.amazon_connections(id) on delete cascade,
  amazon_sku text not null,
  amazon_asin text,
  marketplace_id text not null,
  item_id uuid references public.items(id) on delete set null,
  mapping_status text not null default 'unmapped',
  last_seen_product_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint amazon_product_mappings_status_check check (mapping_status in ('unmapped', 'mapped', 'ignored')),
  unique (business_id, amazon_connection_id, amazon_sku)
);

alter table public.amazon_product_mappings enable row level security;

create policy amazon_product_mappings_select_own_business on public.amazon_product_mappings
  for select
  using (
    exists (select 1 from public.businesses b where b.id = amazon_product_mappings.business_id and b.user_id = auth.uid())
  );

create index if not exists idx_amazon_mappings_connection on public.amazon_product_mappings(amazon_connection_id);

-- ============================================================================
-- 6. RPCs (security definer, p_-prefixed params, explicit auth.uid() checks —
--    same pattern as every other rpc_* function in this project)
-- ============================================================================

-- Safe connection status for the frontend. Deliberately hand-picks columns —
-- encrypted_refresh_token/token_iv/token_auth_tag are never selected here.
create or replace function public.rpc_get_amazon_connections(p_business_id uuid)
returns table (
  id uuid,
  business_id uuid,
  seller_id text,
  marketplace_id text,
  region text,
  environment text,
  status text,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  last_error text,
  disconnected_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id, c.business_id, c.seller_id, c.marketplace_id, c.region, c.environment, c.status,
    c.connected_at, c.last_sync_at, c.last_successful_sync_at, c.last_error, c.disconnected_at,
    c.created_at, c.updated_at
  from public.amazon_connections c
  join public.businesses b on b.id = c.business_id
  where c.business_id = p_business_id
    and b.user_id = auth.uid()
  order by c.connected_at desc;
$$;

-- Disconnects a connection: marks it disconnected and wipes the encrypted
-- token material. No Amazon API call is required for this (Amazon exposes
-- no app-initiated revoke endpoint — the seller can also remove access
-- directly in Seller Central). Historical invoices/amazon_orders rows are
-- left untouched so the user can reconnect later without losing history.
create or replace function public.rpc_disconnect_amazon_connection(p_connection_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.amazon_connections c
  set
    status = 'disconnected',
    encrypted_refresh_token = null,
    token_iv = null,
    token_auth_tag = null,
    disconnected_at = now(),
    updated_at = now()
  from public.businesses b
  where c.id = p_connection_id and b.id = c.business_id and b.user_id = auth.uid();

  return found;
end;
$$;

create or replace function public.rpc_get_amazon_orders(
  p_business_id uuid,
  p_connection_id uuid default null,
  p_limit integer default 200
)
returns setof public.amazon_orders
language sql
security definer
set search_path = public
as $$
  select o.* from public.amazon_orders o
  join public.businesses b on b.id = o.business_id
  where o.business_id = p_business_id
    and b.user_id = auth.uid()
    and (p_connection_id is null or o.amazon_connection_id = p_connection_id)
  order by o.purchase_date desc nulls last, o.created_at desc
  limit p_limit;
$$;

create or replace function public.rpc_get_amazon_product_mappings(
  p_business_id uuid,
  p_connection_id uuid default null,
  p_mapping_status text default null
)
returns setof public.amazon_product_mappings
language sql
security definer
set search_path = public
as $$
  select m.* from public.amazon_product_mappings m
  join public.businesses b on b.id = m.business_id
  where m.business_id = p_business_id
    and b.user_id = auth.uid()
    and (p_connection_id is null or m.amazon_connection_id = p_connection_id)
    and (p_mapping_status is null or m.mapping_status = p_mapping_status)
  order by m.updated_at desc;
$$;

create or replace function public.rpc_map_amazon_sku(
  p_mapping_id uuid,
  p_item_id uuid default null,
  p_mapping_status text default 'mapped'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_mapping_status not in ('unmapped', 'mapped', 'ignored') then
    raise exception 'Invalid mapping status';
  end if;

  update public.amazon_product_mappings m
  set
    item_id = p_item_id,
    mapping_status = p_mapping_status,
    updated_at = now()
  from public.businesses b
  where m.id = p_mapping_id and b.id = m.business_id and b.user_id = auth.uid();

  return found;
end;
$$;
