-- Amazon raw import: read-only staging tables for "show me what's on
-- Amazon" before any of it is matched to items or turned into invoices.
-- Deliberately separate from amazon_orders/amazon_product_mappings (which
-- back the Settings > Integrations "Sync Now" flow and DO create real
-- invoices) — nothing written here ever touches invoices or items.
--
-- Apply this manually against Supabase, the same way
-- db/amazon-integration-migration.sql was applied (no Supabase CLI
-- migration history exists in this project).

-- ============================================================================
-- 1. amazon_raw_orders — one row per Amazon order, as fetched, unmatched.
-- ============================================================================

create table if not exists public.amazon_raw_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  amazon_connection_id uuid not null references public.amazon_connections(id) on delete cascade,
  amazon_order_id text not null,
  marketplace_id text,
  order_status text,
  fulfillment_channel text,
  purchase_date timestamptz,
  order_total_amount numeric(15, 2),
  order_total_currency text,
  raw_payload jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, amazon_order_id)
);

alter table public.amazon_raw_orders enable row level security;

create policy amazon_raw_orders_select_own_business on public.amazon_raw_orders
  for select
  using (
    exists (select 1 from public.businesses b where b.id = amazon_raw_orders.business_id and b.user_id = auth.uid())
  );

create index if not exists idx_amazon_raw_orders_connection on public.amazon_raw_orders(amazon_connection_id);
create index if not exists idx_amazon_raw_orders_business on public.amazon_raw_orders(business_id);

-- ============================================================================
-- 2. amazon_raw_order_items — line items / SKUs per raw order.
-- ============================================================================

create table if not exists public.amazon_raw_order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  amazon_connection_id uuid not null references public.amazon_connections(id) on delete cascade,
  amazon_order_id text not null,
  order_item_id text not null,
  seller_sku text,
  asin text,
  title text,
  quantity_ordered integer,
  item_price_amount numeric(15, 2),
  item_price_currency text,
  raw_payload jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (business_id, amazon_order_id, order_item_id)
);

alter table public.amazon_raw_order_items enable row level security;

create policy amazon_raw_order_items_select_own_business on public.amazon_raw_order_items
  for select
  using (
    exists (select 1 from public.businesses b where b.id = amazon_raw_order_items.business_id and b.user_id = auth.uid())
  );

create index if not exists idx_amazon_raw_order_items_connection on public.amazon_raw_order_items(amazon_connection_id);
create index if not exists idx_amazon_raw_order_items_business on public.amazon_raw_order_items(business_id);
create index if not exists idx_amazon_raw_order_items_sku on public.amazon_raw_order_items(business_id, seller_sku);

-- ============================================================================
-- 3. amazon_raw_inventory — FBA inventory summaries (fba/inventory/v1).
--    Only covers Fulfilled-by-Amazon stock — self/merchant-fulfilled
--    listings have no equivalent bulk "inventory" endpoint on SP-API, so
--    this table can legitimately be empty for an all-MFN seller.
-- ============================================================================

create table if not exists public.amazon_raw_inventory (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  amazon_connection_id uuid not null references public.amazon_connections(id) on delete cascade,
  seller_sku text not null,
  asin text,
  condition text,
  marketplace_id text,
  total_quantity integer,
  fulfillable_quantity integer,
  raw_payload jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, amazon_connection_id, seller_sku)
);

alter table public.amazon_raw_inventory enable row level security;

create policy amazon_raw_inventory_select_own_business on public.amazon_raw_inventory
  for select
  using (
    exists (select 1 from public.businesses b where b.id = amazon_raw_inventory.business_id and b.user_id = auth.uid())
  );

create index if not exists idx_amazon_raw_inventory_connection on public.amazon_raw_inventory(amazon_connection_id);
create index if not exists idx_amazon_raw_inventory_business on public.amazon_raw_inventory(business_id);

-- ============================================================================
-- 4. RPCs (security definer, same ownership-check pattern as every other
--    rpc_* function in this project) — service role does all the writes
--    (via the raw-import API route), these RPCs are the only client read path.
-- ============================================================================

create or replace function public.rpc_get_amazon_raw_orders(
  p_business_id uuid,
  p_connection_id uuid default null,
  p_limit integer default 1000
)
returns setof public.amazon_raw_orders
language sql
security definer
set search_path = public
as $$
  select o.* from public.amazon_raw_orders o
  join public.businesses b on b.id = o.business_id
  where o.business_id = p_business_id
    and b.user_id = auth.uid()
    and (p_connection_id is null or o.amazon_connection_id = p_connection_id)
  order by o.purchase_date desc nulls last, o.created_at desc
  limit p_limit;
$$;

create or replace function public.rpc_get_amazon_raw_order_items(
  p_business_id uuid,
  p_connection_id uuid default null,
  p_limit integer default 5000
)
returns setof public.amazon_raw_order_items
language sql
security definer
set search_path = public
as $$
  select i.* from public.amazon_raw_order_items i
  join public.businesses b on b.id = i.business_id
  where i.business_id = p_business_id
    and b.user_id = auth.uid()
    and (p_connection_id is null or i.amazon_connection_id = p_connection_id)
  order by i.created_at desc
  limit p_limit;
$$;

create or replace function public.rpc_get_amazon_raw_inventory(
  p_business_id uuid,
  p_connection_id uuid default null,
  p_limit integer default 5000
)
returns setof public.amazon_raw_inventory
language sql
security definer
set search_path = public
as $$
  select v.* from public.amazon_raw_inventory v
  join public.businesses b on b.id = v.business_id
  where v.business_id = p_business_id
    and b.user_id = auth.uid()
    and (p_connection_id is null or v.amazon_connection_id = p_connection_id)
  order by v.seller_sku asc
  limit p_limit;
$$;
