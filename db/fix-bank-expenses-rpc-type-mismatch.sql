-- Fix: rpc_get_bank_accounts and rpc_get_expenses were live on the database
-- with an older signature (from db/supabase-migration.sql) that hardcodes
-- "TEXT" for columns that are actually VARCHAR(255)/VARCHAR(50) on the real
-- tables (bank_accounts.bank_name, expenses.category). Postgres treats that
-- as a hard type mismatch at call time:
--   "structure of query does not match function result type -
--    Returned type character varying(255) does not match expected type
--    text in column 3"
-- This surfaced in the app as an opaque "Query error: {}" in the browser
-- console (lib/supabase.ts -> queryBuilder), because the Supabase JS client
-- doesn't propagate this particular error shape cleanly through the app's
-- RPC-compatibility proxy.
--
-- The fix: re-apply the resilient versions of both functions from
-- db/rpc-hardening-migration.sql, which use `returns setof <table>` instead
-- of a hardcoded column list - that derives types from the table itself, so
-- it can never drift out of sync with the table's real column types again.
--
-- Run this once in the Supabase SQL Editor for this project.

create or replace function public.rpc_get_bank_accounts(p_business_id uuid)
returns setof public.bank_accounts
language sql
security definer
set search_path = public
as $$
  select ba.* from public.bank_accounts ba
  join public.businesses b on b.id = ba.business_id
  where ba.business_id = p_business_id and b.user_id = auth.uid();
$$;

create or replace function public.rpc_get_expenses(p_business_id uuid)
returns setof public.expenses
language sql
security definer
set search_path = public
as $$
  select e.* from public.expenses e
  join public.businesses b on b.id = e.business_id
  where e.business_id = p_business_id and b.user_id = auth.uid()
  order by e.date desc, e.created_at desc;
$$;
