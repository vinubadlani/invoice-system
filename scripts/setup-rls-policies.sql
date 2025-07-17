-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

DROP POLICY IF EXISTS "Users can view own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can create own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON public.businesses;

DROP POLICY IF EXISTS "Users can view parties of own businesses" ON public.parties;
DROP POLICY IF EXISTS "Users can create parties for own businesses" ON public.parties;
DROP POLICY IF EXISTS "Users can update parties of own businesses" ON public.parties;

DROP POLICY IF EXISTS "Users can view items of own businesses" ON public.items;
DROP POLICY IF EXISTS "Users can create items for own businesses" ON public.items;
DROP POLICY IF EXISTS "Users can update items of own businesses" ON public.items;

DROP POLICY IF EXISTS "Users can view invoices of own businesses" ON public.invoices;
DROP POLICY IF EXISTS "Users can create invoices for own businesses" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices of own businesses" ON public.invoices;

DROP POLICY IF EXISTS "Users can view payments of own businesses" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments for own businesses" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments of own businesses" ON public.payments;

DROP POLICY IF EXISTS "Users can view bank_transactions of own businesses" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can create bank_transactions for own businesses" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can update bank_transactions of own businesses" ON public.bank_transactions;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for businesses table
CREATE POLICY "Users can view own businesses" ON public.businesses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own businesses" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own businesses" ON public.businesses
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for parties table
CREATE POLICY "Users can view parties of own businesses" ON public.parties
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create parties for own businesses" ON public.parties
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update parties of own businesses" ON public.parties
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for items table
CREATE POLICY "Users can view items of own businesses" ON public.items
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items for own businesses" ON public.items
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items of own businesses" ON public.items
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for invoices table
CREATE POLICY "Users can view invoices of own businesses" ON public.invoices
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoices for own businesses" ON public.invoices
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoices of own businesses" ON public.invoices
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for payments table
CREATE POLICY "Users can view payments of own businesses" ON public.payments
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payments for own businesses" ON public.payments
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments of own businesses" ON public.payments
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for bank_transactions table
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
