-- Fix bank schema migration
-- This script ensures the bank tables have the correct schema

-- Drop existing bank_transactions table if it has the wrong schema
DROP TABLE IF EXISTS public.bank_transactions CASCADE;

-- Create bank_accounts table if it doesn't exist
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

-- Create bank_transactions table with correct schema
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_business_id ON public.bank_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_business_id ON public.bank_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_id ON public.bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions(date);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view bank_accounts of own businesses" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can create bank_accounts for own businesses" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update bank_accounts of own businesses" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete bank_accounts of own businesses" ON public.bank_accounts;

DROP POLICY IF EXISTS "Users can view bank_transactions of own businesses" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can create bank_transactions for own businesses" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can update bank_transactions of own businesses" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can delete bank_transactions of own businesses" ON public.bank_transactions;

-- Create RLS policies for bank_accounts
CREATE POLICY "Users can view bank_accounts of own businesses" ON public.bank_accounts
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bank_accounts for own businesses" ON public.bank_accounts
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update bank_accounts of own businesses" ON public.bank_accounts
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete bank_accounts of own businesses" ON public.bank_accounts
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for bank_transactions
CREATE POLICY "Users can view bank_transactions of own businesses" ON public.bank_transactions
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bank_transactions for own businesses" ON public.bank_transactions
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update bank_transactions of own businesses" ON public.bank_transactions
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete bank_transactions of own businesses" ON public.bank_transactions
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at 
  BEFORE UPDATE ON public.bank_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bank_transactions_updated_at ON public.bank_transactions;
CREATE TRIGGER update_bank_transactions_updated_at 
  BEFORE UPDATE ON public.bank_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
