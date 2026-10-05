-- Fixes "Could not choose the best candidate function between
-- rpc_create_invoice(...)" — db/amazon-integration-migration.sql added a
-- p_source parameter to rpc_create_invoice via CREATE OR REPLACE, but
-- Postgres only replaces a function in place when the parameter list is
-- identical. A different parameter list creates a second overload instead
-- of replacing the first, so the database ended up with two
-- rpc_create_invoice functions (21 params without p_source, 22 params
-- with p_source) that are ambiguous for any call made without p_source
-- explicitly set. Apply manually against Supabase, same as the other
-- db/*.sql files in this repo.

drop function if exists public.rpc_create_invoice(
  uuid, text, date, text, text, text, numeric, text, uuid, text, jsonb,
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, date, text
);
