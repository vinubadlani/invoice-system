-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  gstin TEXT,
  pan TEXT,
  invoice_template TEXT DEFAULT 'classic',
  terms_conditions TEXT DEFAULT 'Payment due within 30 days
Goods once sold will not be taken back
Interest @ 18% p.a. will be charged on overdue amounts
Subject to jurisdiction only',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parties table
CREATE TABLE IF NOT EXISTS public.parties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  gstin TEXT,
  pan TEXT,
  type TEXT CHECK (type IN ('Debtor', 'Creditor', 'Expense')) NOT NULL DEFAULT 'Debtor',
  opening_balance DECIMAL(15,2) DEFAULT 0,
  balance_type TEXT CHECK (balance_type IN ('To Collect', 'To Pay')) NOT NULL DEFAULT 'To Collect',
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create items table
CREATE TABLE IF NOT EXISTS public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  hsn_code TEXT,
  gst_percent DECIMAL(5,2) DEFAULT 0,
  unit TEXT NOT NULL,
  sales_price DECIMAL(15,2) DEFAULT 0,
  purchase_price DECIMAL(15,2) DEFAULT 0,
  opening_stock INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, code)
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  invoice_no TEXT NOT NULL,
  date DATE NOT NULL,
  party_name TEXT NOT NULL,
  gstin TEXT,
  state TEXT NOT NULL,
  address TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total_tax DECIMAL(15,2) DEFAULT 0,
  round_off DECIMAL(15,2) DEFAULT 0,
  net_total DECIMAL(15,2) NOT NULL,
  payment_received DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) DEFAULT 0,
  type TEXT CHECK (type IN ('sales', 'purchase')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, invoice_no)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  party_name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Received', 'Paid')) NOT NULL,
  invoice_no TEXT,
  amount DECIMAL(15,2) NOT NULL,
  mode TEXT NOT NULL DEFAULT 'Cash',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('Savings', 'Current', 'Fixed Deposit', 'Credit Card')) NOT NULL,
  ifsc_code TEXT NOT NULL,
  branch TEXT NOT NULL,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bank_transactions table
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT CHECK (type IN ('Credit', 'Debit')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  reference_number TEXT,
  balance_after DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  vendor_name TEXT,
  invoice_no TEXT,
  remarks TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_parties_business_id ON public.parties(business_id);
CREATE INDEX IF NOT EXISTS idx_items_business_id ON public.items(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(type);
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_business_id ON public.bank_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_business_id ON public.bank_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_id ON public.bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON public.expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
