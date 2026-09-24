-- Adds the actions the E-commerce page needs on top of the read-only
-- amazon_raw_* tables from db/amazon-raw-import-migration.sql (apply that
-- one first): converting a fetched order into a real sale, and manually
-- linking/creating a catalog item for a SKU. Apply manually against
-- Supabase, same as the other db/*.sql files in this repo.

-- ============================================================================
-- 1. amazon_raw_orders gets an invoice_id once "Convert to Sale" is used —
--    lets the UI show "View Sale" instead of "Convert to Sale" again, and
--    stops the same Amazon order from being converted twice.
-- ============================================================================

alter table public.amazon_raw_orders
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create or replace function public.rpc_link_amazon_raw_order_invoice(
  p_raw_order_id uuid,
  p_invoice_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.amazon_raw_orders o
  set invoice_id = p_invoice_id, updated_at = now()
  from public.businesses b
  where o.id = p_raw_order_id and b.id = o.business_id and b.user_id = auth.uid();

  return found;
end;
$$;

-- ============================================================================
-- 2. Manual SKU -> item linking/creation from the E-commerce SKUs tab.
--    Reuses amazon_product_mappings (already backing the Settings SKU
--    mapping table) so both views stay consistent, but this path is
--    always an explicit user click — nothing here is auto-matched.
--    business_id/marketplace_id are derived server-side from the
--    connection, never trusted from the client.
-- ============================================================================

create or replace function public.rpc_upsert_amazon_sku_mapping(
  p_connection_id uuid,
  p_amazon_sku text,
  p_amazon_asin text default null,
  p_title text default null,
  p_item_id uuid default null,
  p_mapping_status text default 'mapped'
)
returns public.amazon_product_mappings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_marketplace_id text;
  v_row public.amazon_product_mappings;
begin
  if p_mapping_status not in ('unmapped', 'mapped', 'ignored') then
    raise exception 'Invalid mapping status';
  end if;

  select c.business_id, c.marketplace_id into v_business_id, v_marketplace_id
  from public.amazon_connections c
  join public.businesses b on b.id = c.business_id
  where c.id = p_connection_id and b.user_id = auth.uid();

  if v_business_id is null then
    raise exception 'Unauthorized';
  end if;

  insert into public.amazon_product_mappings (
    business_id, amazon_connection_id, amazon_sku, amazon_asin, marketplace_id,
    item_id, mapping_status, last_seen_product_title
  ) values (
    v_business_id, p_connection_id, p_amazon_sku, p_amazon_asin, v_marketplace_id,
    p_item_id, p_mapping_status, p_title
  )
  on conflict (business_id, amazon_connection_id, amazon_sku)
  do update set
    item_id = excluded.item_id,
    mapping_status = excluded.mapping_status,
    last_seen_product_title = coalesce(excluded.last_seen_product_title, public.amazon_product_mappings.last_seen_product_title),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;
