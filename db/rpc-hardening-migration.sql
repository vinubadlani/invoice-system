-- Invoice system RPC hardening migration
-- Safe to apply on existing project with pre-existing public.users table.

create extension if not exists pgcrypto;

-- Ensure users table has fields expected by invoice app auth sync.
alter table if exists public.users add column if not exists full_name text;
alter table if exists public.users add column if not exists updated_at timestamptz default now();

-- Core invoice tables
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  address text not null default '',
  city text not null default '',
  state text not null default '',
  pincode text not null default '',
  phone text not null default '',
  email text not null default '',
  gstin text,
  pan text,
  terms_conditions text default 'Payment due within 30 days',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  invoice_template text default 'classic'
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  bank_name text not null,
  account_number text not null,
  ifsc_code text not null,
  account_type text not null check (account_type in ('Savings', 'Current', 'CC', 'OD')),
  branch_name text not null,
  account_holder_name text not null,
  opening_balance numeric(15,2) default 0,
  current_balance numeric(15,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  date date not null,
  bank_name text not null,
  account_no text not null,
  type text not null check (type in ('Deposit', 'Withdrawal', 'Expense')),
  amount numeric(15,2) not null,
  purpose text not null,
  created_at timestamptz default now()
);

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  mobile text not null,
  email text,
  gstin text,
  pan text,
  type text not null default 'Debtor' check (type in ('Debtor', 'Creditor', 'Expense')),
  opening_balance numeric(15,2) default 0,
  balance_type text not null default 'To Collect' check (balance_type in ('To Collect', 'To Pay')),
  address text not null default '',
  city text not null default '',
  state text not null default '',
  pincode text not null default '',
  created_at timestamptz default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  code text not null,
  hsn_code text,
  gst_percent numeric(5,2) default 0,
  unit text not null default 'pcs',
  sales_price numeric(15,2) default 0,
  purchase_price numeric(15,2) default 0,
  opening_stock integer default 0,
  description text,
  created_at timestamptz default now(),
  unique (business_id, code)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_no text not null,
  date date not null,
  party_name text not null,
  party_id uuid references public.parties(id) on delete set null,
  gstin text,
  state text not null default '',
  address text not null default '',
  items jsonb default '[]'::jsonb not null,
  subtotal numeric(15,2) default 0,
  discount_amount numeric(15,2) default 0,
  discount_percent numeric(5,2) default 0,
  total_tax numeric(15,2) default 0,
  round_off numeric(15,2) default 0,
  net_total numeric(15,2) not null,
  payment_received numeric(15,2) default 0,
  balance_due numeric(15,2) default 0,
  type text not null check (type in ('sales', 'purchase')),
  status text default 'draft' check (status in ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
  due_date date,
  payment_method text default 'Cash',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  item_name text not null,
  item_code text,
  hsn_code text,
  quantity numeric(15,3) not null,
  unit text not null,
  rate numeric(15,2) not null,
  amount numeric(15,2) not null,
  gst_percent numeric(5,2) default 0,
  gst_amount numeric(15,2) default 0,
  total_amount numeric(15,2) not null,
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  date date not null,
  party_name text not null,
  type text not null check (type in ('Received', 'Paid')),
  invoice_no text,
  amount numeric(15,2) not null,
  mode text not null default 'Cash',
  remarks text,
  created_at timestamptz default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text not null,
  description text not null,
  amount numeric(15,2) not null,
  date date not null,
  receipt_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_businesses_user_id on public.businesses(user_id);
create index if not exists idx_parties_business_id on public.parties(business_id);
create index if not exists idx_items_business_id on public.items(business_id);
create index if not exists idx_invoices_business_id on public.invoices(business_id);
create index if not exists idx_payments_business_id on public.payments(business_id);
create index if not exists idx_expenses_business_id on public.expenses(business_id);
create index if not exists idx_sales_items_invoice_id on public.sales_items(invoice_id);

-- Enable RLS
alter table public.businesses enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.parties enable row level security;
alter table public.items enable row level security;
alter table public.invoices enable row level security;
alter table public.sales_items enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

-- Policies (idempotent)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses' and policyname='invoice_business_select') then
    create policy invoice_business_select on public.businesses for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses' and policyname='invoice_business_insert') then
    create policy invoice_business_insert on public.businesses for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses' and policyname='invoice_business_update') then
    create policy invoice_business_update on public.businesses for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses' and policyname='invoice_business_delete') then
    create policy invoice_business_delete on public.businesses for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='parties' and policyname='invoice_parties_all') then
    create policy invoice_parties_all on public.parties
      for all
      using (business_id in (select id from public.businesses where user_id = auth.uid()))
      with check (business_id in (select id from public.businesses where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='items' and policyname='invoice_items_all') then
    create policy invoice_items_all on public.items
      for all
      using (business_id in (select id from public.businesses where user_id = auth.uid()))
      with check (business_id in (select id from public.businesses where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='invoice_invoices_all') then
    create policy invoice_invoices_all on public.invoices
      for all
      using (business_id in (select id from public.businesses where user_id = auth.uid()))
      with check (business_id in (select id from public.businesses where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='invoice_payments_all') then
    create policy invoice_payments_all on public.payments
      for all
      using (business_id in (select id from public.businesses where user_id = auth.uid()))
      with check (business_id in (select id from public.businesses where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='expenses' and policyname='invoice_expenses_all') then
    create policy invoice_expenses_all on public.expenses
      for all
      using (business_id in (select id from public.businesses where user_id = auth.uid()))
      with check (business_id in (select id from public.businesses where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sales_items' and policyname='invoice_sales_items_all') then
    create policy invoice_sales_items_all on public.sales_items
      for all
      using (business_id in (select id from public.businesses where user_id = auth.uid()))
      with check (business_id in (select id from public.businesses where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bank_accounts' and policyname='invoice_bank_accounts_all') then
    create policy invoice_bank_accounts_all on public.bank_accounts
      for all
      using (business_id in (select id from public.businesses where user_id = auth.uid()))
      with check (business_id in (select id from public.businesses where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bank_transactions' and policyname='invoice_bank_tx_all') then
    create policy invoice_bank_tx_all on public.bank_transactions
      for all
      using (business_id in (select id from public.businesses where user_id = auth.uid()))
      with check (business_id in (select id from public.businesses where user_id = auth.uid()));
  end if;
end $$;

-- Auth profile sync
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    now(),
    now()
  )
  on conflict (id)
  do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.rpc_sync_user_profile(p_full_name text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  insert into public.users (id, email, full_name, created_at, updated_at)
  values (
    auth.uid(),
    coalesce((select email from auth.users where id = auth.uid()), ''),
    coalesce(p_full_name, split_part(coalesce((select email from auth.users where id = auth.uid()), ''), '@', 1)),
    now(),
    now()
  )
  on conflict (id)
  do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    updated_at = now();

  return true;
end;
$$;

-- RPC functions used by app
create or replace function public.rpc_get_businesses(p_user_id uuid default null)
returns setof public.businesses
language sql
security definer
set search_path = public
as $$
  select * from public.businesses
  where user_id = coalesce(p_user_id, auth.uid())
  order by created_at desc;
$$;

create or replace function public.rpc_get_business_by_id(p_id uuid)
returns setof public.businesses
language sql
security definer
set search_path = public
as $$
  select * from public.businesses
  where id = p_id and user_id = auth.uid();
$$;

create or replace function public.rpc_create_business(
  p_name text,
  p_address text,
  p_city text,
  p_state text,
  p_pincode text,
  p_phone text,
  p_email text,
  p_gstin text default null,
  p_pan text default null,
  p_terms_conditions text default null,
  p_invoice_template text default 'classic'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.businesses (
    user_id, name, address, city, state, pincode, phone, email, gstin, pan, terms_conditions, invoice_template
  )
  values (
    auth.uid(), p_name, coalesce(p_address, ''), coalesce(p_city, ''), coalesce(p_state, ''), coalesce(p_pincode, ''),
    coalesce(p_phone, ''), coalesce(p_email, ''), p_gstin, p_pan, p_terms_conditions, coalesce(p_invoice_template, 'classic')
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_update_business(
  p_id uuid,
  p_name text default null,
  p_address text default null,
  p_city text default null,
  p_state text default null,
  p_pincode text default null,
  p_phone text default null,
  p_email text default null,
  p_gstin text default null,
  p_pan text default null,
  p_terms_conditions text default null,
  p_invoice_template text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.businesses
  set
    name = coalesce(p_name, name),
    address = coalesce(p_address, address),
    city = coalesce(p_city, city),
    state = coalesce(p_state, state),
    pincode = coalesce(p_pincode, pincode),
    phone = coalesce(p_phone, phone),
    email = coalesce(p_email, email),
    gstin = coalesce(p_gstin, gstin),
    pan = coalesce(p_pan, pan),
    terms_conditions = coalesce(p_terms_conditions, terms_conditions),
    invoice_template = coalesce(p_invoice_template, invoice_template),
    updated_at = now()
  where id = p_id and user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.rpc_delete_business(p_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  delete from public.businesses where id = p_id and user_id = auth.uid();
  select found;
$$;

create or replace function public.rpc_get_parties(p_business_id uuid)
returns setof public.parties
language sql
security definer
set search_path = public
as $$
  select p.* from public.parties p
  join public.businesses b on b.id = p.business_id
  where p.business_id = p_business_id and b.user_id = auth.uid()
  order by p.name asc;
$$;

create or replace function public.rpc_create_party(
  p_business_id uuid,
  p_name text,
  p_mobile text,
  p_address text,
  p_city text,
  p_state text,
  p_pincode text,
  p_email text default null,
  p_gstin text default null,
  p_pan text default null,
  p_type text default 'Debtor',
  p_opening_balance numeric default 0,
  p_balance_type text default 'To Collect'
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
  insert into public.parties (business_id, name, mobile, email, gstin, pan, type, opening_balance, balance_type, address, city, state, pincode)
  values (p_business_id, p_name, p_mobile, p_email, p_gstin, p_pan, p_type, p_opening_balance, p_balance_type, p_address, p_city, p_state, p_pincode)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_update_party(
  p_id uuid,
  p_name text default null,
  p_mobile text default null,
  p_email text default null,
  p_gstin text default null,
  p_pan text default null,
  p_type text default null,
  p_opening_balance numeric default null,
  p_balance_type text default null,
  p_address text default null,
  p_city text default null,
  p_state text default null,
  p_pincode text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.parties p
  set
    name = coalesce(p_name, p.name),
    mobile = coalesce(p_mobile, p.mobile),
    email = coalesce(p_email, p.email),
    gstin = coalesce(p_gstin, p.gstin),
    pan = coalesce(p_pan, p.pan),
    type = coalesce(p_type, p.type),
    opening_balance = coalesce(p_opening_balance, p.opening_balance),
    balance_type = coalesce(p_balance_type, p.balance_type),
    address = coalesce(p_address, p.address),
    city = coalesce(p_city, p.city),
    state = coalesce(p_state, p.state),
    pincode = coalesce(p_pincode, p.pincode)
  from public.businesses b
  where p.id = p_id and b.id = p.business_id and b.user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.rpc_delete_party(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.parties p using public.businesses b
  where p.id = p_id and b.id = p.business_id and b.user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.rpc_get_items(p_business_id uuid)
returns setof public.items
language sql
security definer
set search_path = public
as $$
  select i.* from public.items i
  join public.businesses b on b.id = i.business_id
  where i.business_id = p_business_id and b.user_id = auth.uid()
  order by i.name asc;
$$;

create or replace function public.rpc_create_item(
  p_business_id uuid,
  p_name text,
  p_code text,
  p_unit text,
  p_hsn_code text default null,
  p_gst_percent numeric default 0,
  p_sales_price numeric default 0,
  p_purchase_price numeric default 0,
  p_opening_stock integer default 0,
  p_description text default null
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
  insert into public.items (business_id, name, code, hsn_code, gst_percent, unit, sales_price, purchase_price, opening_stock, description)
  values (p_business_id, p_name, p_code, p_hsn_code, p_gst_percent, p_unit, p_sales_price, p_purchase_price, p_opening_stock, p_description)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rpc_update_item(
  p_id uuid,
  p_name text default null,
  p_code text default null,
  p_hsn_code text default null,
  p_gst_percent numeric default null,
  p_unit text default null,
  p_sales_price numeric default null,
  p_purchase_price numeric default null,
  p_opening_stock integer default null,
  p_description text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.items i
  set
    name = coalesce(p_name, i.name),
    code = coalesce(p_code, i.code),
    hsn_code = coalesce(p_hsn_code, i.hsn_code),
    gst_percent = coalesce(p_gst_percent, i.gst_percent),
    unit = coalesce(p_unit, i.unit),
    sales_price = coalesce(p_sales_price, i.sales_price),
    purchase_price = coalesce(p_purchase_price, i.purchase_price),
    opening_stock = coalesce(p_opening_stock, i.opening_stock),
    description = coalesce(p_description, i.description)
  from public.businesses b
  where i.id = p_id and b.id = i.business_id and b.user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.rpc_delete_item(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.items i using public.businesses b
  where i.id = p_id and b.id = i.business_id and b.user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.rpc_get_invoices(p_business_id uuid, p_type text default null)
returns setof public.invoices
language sql
security definer
set search_path = public
as $$
  select inv.* from public.invoices inv
  join public.businesses b on b.id = inv.business_id
  where inv.business_id = p_business_id
    and b.user_id = auth.uid()
    and (p_type is null or inv.type = p_type)
  order by inv.date desc, inv.created_at desc;
$$;

create or replace function public.rpc_get_invoice_by_id(p_id uuid)
returns setof public.invoices
language sql
security definer
set search_path = public
as $$
  select inv.* from public.invoices inv
  join public.businesses b on b.id = inv.business_id
  where inv.id = p_id and b.user_id = auth.uid();
$$;

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
  p_payment_method text default 'Cash'
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
    payment_received, balance_due, type, status, due_date, payment_method
  ) values (
    p_business_id, p_invoice_no, p_date, p_party_name, p_party_id, p_gstin, p_state, p_address, p_items,
    p_subtotal, p_discount_amount, p_discount_percent, p_total_tax, p_round_off, p_net_total,
    p_payment_received, p_balance_due, p_type, p_status, p_due_date, p_payment_method
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.rpc_update_invoice(
  p_id uuid,
  p_invoice_no text default null,
  p_date date default null,
  p_party_name text default null,
  p_party_id uuid default null,
  p_gstin text default null,
  p_state text default null,
  p_address text default null,
  p_items jsonb default null,
  p_subtotal numeric default null,
  p_discount_amount numeric default null,
  p_discount_percent numeric default null,
  p_total_tax numeric default null,
  p_round_off numeric default null,
  p_net_total numeric default null,
  p_payment_received numeric default null,
  p_balance_due numeric default null,
  p_status text default null,
  p_due_date date default null,
  p_payment_method text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invoices inv
  set
    invoice_no = coalesce(p_invoice_no, inv.invoice_no),
    date = coalesce(p_date, inv.date),
    party_name = coalesce(p_party_name, inv.party_name),
    party_id = coalesce(p_party_id, inv.party_id),
    gstin = coalesce(p_gstin, inv.gstin),
    state = coalesce(p_state, inv.state),
    address = coalesce(p_address, inv.address),
    items = coalesce(p_items, inv.items),
    subtotal = coalesce(p_subtotal, inv.subtotal),
    discount_amount = coalesce(p_discount_amount, inv.discount_amount),
    discount_percent = coalesce(p_discount_percent, inv.discount_percent),
    total_tax = coalesce(p_total_tax, inv.total_tax),
    round_off = coalesce(p_round_off, inv.round_off),
    net_total = coalesce(p_net_total, inv.net_total),
    payment_received = coalesce(p_payment_received, inv.payment_received),
    balance_due = coalesce(p_balance_due, inv.balance_due),
    status = coalesce(p_status, inv.status),
    due_date = coalesce(p_due_date, inv.due_date),
    payment_method = coalesce(p_payment_method, inv.payment_method),
    updated_at = now()
  from public.businesses b
  where inv.id = p_id and b.id = inv.business_id and b.user_id = auth.uid();

  return found;
end;
$$;

create or replace function public.rpc_delete_invoice(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.invoices inv using public.businesses b
  where inv.id = p_id and b.id = inv.business_id and b.user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.rpc_get_payments(p_business_id uuid)
returns setof public.payments
language sql
security definer
set search_path = public
as $$
  select pay.* from public.payments pay
  join public.businesses b on b.id = pay.business_id
  where pay.business_id = p_business_id and b.user_id = auth.uid()
  order by pay.date desc, pay.created_at desc;
$$;

create or replace function public.rpc_create_payment(
  p_business_id uuid,
  p_date date,
  p_party_name text,
  p_type text,
  p_amount numeric,
  p_invoice_no text default null,
  p_mode text default 'Cash',
  p_remarks text default null
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

  insert into public.payments (business_id, date, party_name, type, invoice_no, amount, mode, remarks)
  values (p_business_id, p_date, p_party_name, p_type, p_invoice_no, p_amount, p_mode, p_remarks)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.rpc_update_payment(
  p_id uuid,
  p_date date default null,
  p_party_name text default null,
  p_type text default null,
  p_invoice_no text default null,
  p_amount numeric default null,
  p_mode text default null,
  p_remarks text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments pay
  set
    date = coalesce(p_date, pay.date),
    party_name = coalesce(p_party_name, pay.party_name),
    type = coalesce(p_type, pay.type),
    invoice_no = coalesce(p_invoice_no, pay.invoice_no),
    amount = coalesce(p_amount, pay.amount),
    mode = coalesce(p_mode, pay.mode),
    remarks = coalesce(p_remarks, pay.remarks)
  from public.businesses b
  where pay.id = p_id and b.id = pay.business_id and b.user_id = auth.uid();

  return found;
end;
$$;

create or replace function public.rpc_delete_payment(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.payments pay using public.businesses b
  where pay.id = p_id and b.id = pay.business_id and b.user_id = auth.uid();
  return found;
end;
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

create or replace function public.rpc_create_expense(
  p_business_id uuid,
  p_category text,
  p_description text,
  p_amount numeric,
  p_date date,
  p_receipt_url text default null
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

  insert into public.expenses (business_id, category, description, amount, date, receipt_url)
  values (p_business_id, p_category, p_description, p_amount, p_date, p_receipt_url)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.rpc_update_expense(
  p_id uuid,
  p_category text default null,
  p_description text default null,
  p_amount numeric default null,
  p_date date default null,
  p_receipt_url text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.expenses e
  set
    category = coalesce(p_category, e.category),
    description = coalesce(p_description, e.description),
    amount = coalesce(p_amount, e.amount),
    date = coalesce(p_date, e.date),
    receipt_url = coalesce(p_receipt_url, e.receipt_url),
    updated_at = now()
  from public.businesses b
  where e.id = p_id and b.id = e.business_id and b.user_id = auth.uid();

  return found;
end;
$$;

create or replace function public.rpc_delete_expense(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.expenses e using public.businesses b
  where e.id = p_id and b.id = e.business_id and b.user_id = auth.uid();
  return found;
end;
$$;

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

create or replace function public.rpc_create_bank_account(
  p_business_id uuid,
  p_bank_name text,
  p_account_number text,
  p_ifsc_code text,
  p_account_type text,
  p_branch_name text,
  p_account_holder_name text,
  p_opening_balance numeric default 0,
  p_current_balance numeric default 0
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

  insert into public.bank_accounts (
    business_id, bank_name, account_number, ifsc_code, account_type, branch_name,
    account_holder_name, opening_balance, current_balance
  ) values (
    p_business_id, p_bank_name, p_account_number, p_ifsc_code, p_account_type,
    p_branch_name, p_account_holder_name, p_opening_balance, p_current_balance
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.rpc_update_bank_account(
  p_id uuid,
  p_bank_name text default null,
  p_account_number text default null,
  p_ifsc_code text default null,
  p_account_type text default null,
  p_branch_name text default null,
  p_account_holder_name text default null,
  p_current_balance numeric default null,
  p_is_active boolean default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bank_accounts ba
  set
    bank_name = coalesce(p_bank_name, ba.bank_name),
    account_number = coalesce(p_account_number, ba.account_number),
    ifsc_code = coalesce(p_ifsc_code, ba.ifsc_code),
    account_type = coalesce(p_account_type, ba.account_type),
    branch_name = coalesce(p_branch_name, ba.branch_name),
    account_holder_name = coalesce(p_account_holder_name, ba.account_holder_name),
    current_balance = coalesce(p_current_balance, ba.current_balance),
    is_active = coalesce(p_is_active, ba.is_active),
    updated_at = now()
  from public.businesses b
  where ba.id = p_id and b.id = ba.business_id and b.user_id = auth.uid();

  return found;
end;
$$;

create or replace function public.rpc_delete_bank_account(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.bank_accounts ba using public.businesses b
  where ba.id = p_id and b.id = ba.business_id and b.user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.rpc_get_bank_transactions(p_business_id uuid)
returns setof public.bank_transactions
language sql
security definer
set search_path = public
as $$
  select bt.* from public.bank_transactions bt
  join public.businesses b on b.id = bt.business_id
  where bt.business_id = p_business_id and b.user_id = auth.uid()
  order by bt.date desc, bt.created_at desc;
$$;

create or replace function public.rpc_create_bank_transaction(
  p_business_id uuid,
  p_date date,
  p_bank_name text,
  p_account_no text,
  p_type text,
  p_amount numeric,
  p_purpose text
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

  insert into public.bank_transactions (business_id, date, bank_name, account_no, type, amount, purpose)
  values (p_business_id, p_date, p_bank_name, p_account_no, p_type, p_amount, p_purpose)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.rpc_delete_bank_transaction(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.bank_transactions bt using public.businesses b
  where bt.id = p_id and b.id = bt.business_id and b.user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.rpc_get_sales_items_by_invoice(p_invoice_id uuid)
returns setof public.sales_items
language sql
security definer
set search_path = public
as $$
  select si.* from public.sales_items si
  join public.invoices inv on inv.id = si.invoice_id
  join public.businesses b on b.id = inv.business_id
  where si.invoice_id = p_invoice_id and b.user_id = auth.uid()
  order by si.created_at asc;
$$;

-- Enforce RPC-only for invoice module tables.
revoke all on public.businesses, public.bank_accounts, public.bank_transactions, public.parties, public.items, public.invoices, public.sales_items, public.payments, public.expenses from anon, authenticated;
grant execute on all functions in schema public to authenticated;
grant execute on function public.rpc_sync_user_profile(text) to authenticated;
