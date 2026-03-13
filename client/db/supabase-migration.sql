-- HisabKitab Database Migration for Supabase
-- Complete RPC-based architecture
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Users table (links to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    gstin TEXT,
    pan TEXT,
    terms_conditions TEXT DEFAULT 'Payment due within 30 days
Goods once sold will not be taken back
Interest @ 18% p.a. will be charged on overdue amounts
Subject to jurisdiction only',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    invoice_template TEXT DEFAULT 'classic'
);

-- Bank accounts table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('Savings', 'Current', 'CC', 'OD')),
    branch_name VARCHAR(255) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    opening_balance NUMERIC(15,2) DEFAULT 0,
    current_balance NUMERIC(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank transactions table
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    bank_name TEXT NOT NULL,
    account_no TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Deposit', 'Withdrawal', 'Expense')),
    amount NUMERIC(15,2) NOT NULL,
    purpose TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parties table
CREATE TABLE IF NOT EXISTS public.parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    gstin TEXT,
    pan TEXT,
    type TEXT NOT NULL DEFAULT 'Debtor' CHECK (type IN ('Debtor', 'Creditor', 'Expense')),
    opening_balance NUMERIC(15,2) DEFAULT 0,
    balance_type TEXT NOT NULL DEFAULT 'To Collect' CHECK (balance_type IN ('To Collect', 'To Pay')),
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items table
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    hsn_code TEXT,
    gst_percent NUMERIC(5,2) DEFAULT 0,
    unit TEXT NOT NULL,
    sales_price NUMERIC(15,2) DEFAULT 0,
    purchase_price NUMERIC(15,2) DEFAULT 0,
    opening_stock INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    invoice_no TEXT NOT NULL,
    date DATE NOT NULL,
    party_name TEXT NOT NULL,
    party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
    gstin TEXT,
    state TEXT NOT NULL,
    address TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    subtotal NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    total_tax NUMERIC(15,2) DEFAULT 0,
    round_off NUMERIC(15,2) DEFAULT 0,
    net_total NUMERIC(15,2) NOT NULL,
    payment_received NUMERIC(15,2) DEFAULT 0,
    balance_due NUMERIC(15,2) DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('sales', 'purchase')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    due_date DATE,
    payment_method TEXT DEFAULT 'Cash',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales items table
CREATE TABLE IF NOT EXISTS public.sales_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_code TEXT,
    hsn_code TEXT,
    quantity NUMERIC(15,3) NOT NULL,
    unit TEXT NOT NULL,
    rate NUMERIC(15,2) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    gst_percent NUMERIC(5,2) DEFAULT 0,
    gst_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    party_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Received', 'Paid')),
    invoice_no TEXT,
    amount NUMERIC(15,2) NOT NULL,
    mode TEXT DEFAULT 'Cash' NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_business_id ON public.bank_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_business_id ON public.bank_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_parties_business_id ON public.parties(business_id);
CREATE INDEX IF NOT EXISTS idx_items_business_id ON public.items(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_invoice_id ON public.sales_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_business_id ON public.sales_items(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON public.expenses(business_id);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Businesses policies
CREATE POLICY "Users can view own businesses" ON public.businesses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own businesses" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own businesses" ON public.businesses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own businesses" ON public.businesses FOR DELETE USING (auth.uid() = user_id);

-- Bank accounts policies (through business ownership)
CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts FOR SELECT 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own bank accounts" ON public.bank_accounts FOR INSERT 
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own bank accounts" ON public.bank_accounts FOR UPDATE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own bank accounts" ON public.bank_accounts FOR DELETE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Bank transactions policies
CREATE POLICY "Users can view own transactions" ON public.bank_transactions FOR SELECT 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own transactions" ON public.bank_transactions FOR INSERT 
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own transactions" ON public.bank_transactions FOR UPDATE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own transactions" ON public.bank_transactions FOR DELETE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Parties policies
CREATE POLICY "Users can view own parties" ON public.parties FOR SELECT 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own parties" ON public.parties FOR INSERT 
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own parties" ON public.parties FOR UPDATE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own parties" ON public.parties FOR DELETE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Items policies
CREATE POLICY "Users can view own items" ON public.items FOR SELECT 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own items" ON public.items FOR INSERT 
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own items" ON public.items FOR UPDATE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own items" ON public.items FOR DELETE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Invoices policies
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own invoices" ON public.invoices FOR INSERT 
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own invoices" ON public.invoices FOR UPDATE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Sales items policies
CREATE POLICY "Users can view own sales items" ON public.sales_items FOR SELECT 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own sales items" ON public.sales_items FOR INSERT 
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own sales items" ON public.sales_items FOR UPDATE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own sales items" ON public.sales_items FOR DELETE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Payments policies
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT 
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Expenses policies
CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own expenses" ON public.expenses FOR INSERT 
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own expenses" ON public.expenses FOR DELETE 
  USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- =====================================================
-- 4.5. TRIGGER TO AUTO-CREATE USER IN PUBLIC.USERS
-- =====================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Trigger to automatically create user in public.users when auth.users is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 5. RPC FUNCTIONS - BUSINESSES
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_get_businesses(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    pan TEXT,
    terms_conditions TEXT,
    created_at TIMESTAMPTZ,
    invoice_template TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.user_id, b.name, b.address, b.city, b.state, b.pincode, 
           b.phone, b.email, b.gstin, b.pan, b.terms_conditions, 
           b.created_at, b.invoice_template
    FROM public.businesses b
    WHERE b.user_id = COALESCE(p_user_id, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION rpc_get_business_by_id(p_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    pan TEXT,
    terms_conditions TEXT,
    created_at TIMESTAMPTZ,
    invoice_template TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.user_id, b.name, b.address, b.city, b.state, b.pincode, 
           b.phone, b.email, b.gstin, b.pan, b.terms_conditions, 
           b.created_at, b.invoice_template
    FROM public.businesses b
    WHERE b.id = p_id AND b.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION rpc_create_business(
    p_name TEXT,
    p_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_pincode TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_gstin TEXT DEFAULT NULL,
    p_pan TEXT DEFAULT NULL,
    p_terms_conditions TEXT DEFAULT NULL,
    p_invoice_template TEXT DEFAULT 'classic'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id UUID;
BEGIN
    INSERT INTO public.businesses (
        user_id, name, address, city, state, pincode, phone, email, 
        gstin, pan, terms_conditions, invoice_template
    ) VALUES (
        auth.uid(), p_name, p_address, p_city, p_state, p_pincode, p_phone, p_email,
        p_gstin, p_pan, p_terms_conditions, p_invoice_template
    )
    RETURNING id INTO v_business_id;
    
    RETURN v_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_business(
    p_id UUID,
    p_name TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_pincode TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_gstin TEXT DEFAULT NULL,
    p_pan TEXT DEFAULT NULL,
    p_terms_conditions TEXT DEFAULT NULL,
    p_invoice_template TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.businesses
    SET 
        name = COALESCE(p_name, name),
        address = COALESCE(p_address, address),
        city = COALESCE(p_city, city),
        state = COALESCE(p_state, state),
        pincode = COALESCE(p_pincode, pincode),
        phone = COALESCE(p_phone, phone),
        email = COALESCE(p_email, email),
        gstin = COALESCE(p_gstin, gstin),
        pan = COALESCE(p_pan, pan),
        terms_conditions = COALESCE(p_terms_conditions, terms_conditions),
        invoice_template = COALESCE(p_invoice_template, invoice_template)
    WHERE id = p_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_delete_business(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.businesses 
    WHERE id = p_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- 6. RPC FUNCTIONS - BANK ACCOUNTS
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_get_bank_accounts(p_business_id UUID)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    bank_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    account_type TEXT,
    branch_name TEXT,
    account_holder_name TEXT,
    opening_balance NUMERIC,
    current_balance NUMERIC,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT ba.id, ba.business_id, ba.bank_name, ba.account_number, ba.ifsc_code,
           ba.account_type, ba.branch_name, ba.account_holder_name, 
           ba.opening_balance, ba.current_balance, ba.is_active, 
           ba.created_at, ba.updated_at
    FROM public.bank_accounts ba
    INNER JOIN public.businesses b ON ba.business_id = b.id
    WHERE ba.business_id = p_business_id AND b.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION rpc_create_bank_account(
    p_business_id UUID,
    p_bank_name TEXT,
    p_account_number TEXT,
    p_ifsc_code TEXT,
    p_account_type TEXT,
    p_branch_name TEXT,
    p_account_holder_name TEXT,
    p_opening_balance NUMERIC DEFAULT 0,
    p_current_balance NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account_id UUID;
BEGIN
    -- Verify business ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    INSERT INTO public.bank_accounts (
        business_id, bank_name, account_number, ifsc_code, account_type,
        branch_name, account_holder_name, opening_balance, current_balance
    ) VALUES (
        p_business_id, p_bank_name, p_account_number, p_ifsc_code, p_account_type,
        p_branch_name, p_account_holder_name, p_opening_balance, p_current_balance
    )
    RETURNING id INTO v_account_id;
    
    RETURN v_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_bank_account(
    p_id UUID,
    p_bank_name TEXT DEFAULT NULL,
    p_account_number TEXT DEFAULT NULL,
    p_ifsc_code TEXT DEFAULT NULL,
    p_account_type TEXT DEFAULT NULL,
    p_branch_name TEXT DEFAULT NULL,
    p_account_holder_name TEXT DEFAULT NULL,
    p_current_balance NUMERIC DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.bank_accounts ba
    SET 
        bank_name = COALESCE(p_bank_name, ba.bank_name),
        account_number = COALESCE(p_account_number, ba.account_number),
        ifsc_code = COALESCE(p_ifsc_code, ba.ifsc_code),
        account_type = COALESCE(p_account_type, ba.account_type),
        branch_name = COALESCE(p_branch_name, ba.branch_name),
        account_holder_name = COALESCE(p_account_holder_name, ba.account_holder_name),
        current_balance = COALESCE(p_current_balance, ba.current_balance),
        is_active = COALESCE(p_is_active, ba.is_active),
        updated_at = NOW()
    FROM public.businesses b
    WHERE ba.id = p_id 
      AND ba.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_delete_bank_account(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.bank_accounts ba
    USING public.businesses b
    WHERE ba.id = p_id 
      AND ba.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- 7. RPC FUNCTIONS - PARTIES
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_get_parties(p_business_id UUID)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    name TEXT,
    mobile TEXT,
    email TEXT,
    gstin TEXT,
    pan TEXT,
    type TEXT,
    opening_balance NUMERIC,
    balance_type TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.business_id, p.name, p.mobile, p.email, p.gstin, p.pan,
           p.type, p.opening_balance, p.balance_type, p.address, p.city, 
           p.state, p.pincode, p.created_at
    FROM public.parties p
    INNER JOIN public.businesses b ON p.business_id = b.id
    WHERE p.business_id = p_business_id AND b.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION rpc_create_party(
    p_business_id UUID,
    p_name TEXT,
    p_mobile TEXT,
    p_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_pincode TEXT,
    p_email TEXT DEFAULT NULL,
    p_gstin TEXT DEFAULT NULL,
    p_pan TEXT DEFAULT NULL,
    p_type TEXT DEFAULT 'Debtor',
    p_opening_balance NUMERIC DEFAULT 0,
    p_balance_type TEXT DEFAULT 'To Collect'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_party_id UUID;
BEGIN
    -- Verify business ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    INSERT INTO public.parties (
        business_id, name, mobile, email, gstin, pan, type, 
        opening_balance, balance_type, address, city, state, pincode
    ) VALUES (
        p_business_id, p_name, p_mobile, p_email, p_gstin, p_pan, p_type,
        p_opening_balance, p_balance_type, p_address, p_city, p_state, p_pincode
    )
    RETURNING id INTO v_party_id;
    
    RETURN v_party_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_party(
    p_id UUID,
    p_name TEXT DEFAULT NULL,
    p_mobile TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_gstin TEXT DEFAULT NULL,
    p_pan TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_opening_balance NUMERIC DEFAULT NULL,
    p_balance_type TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_pincode TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.parties pa
    SET 
        name = COALESCE(p_name, pa.name),
        mobile = COALESCE(p_mobile, pa.mobile),
        email = COALESCE(p_email, pa.email),
        gstin = COALESCE(p_gstin, pa.gstin),
        pan = COALESCE(p_pan, pa.pan),
        type = COALESCE(p_type, pa.type),
        opening_balance = COALESCE(p_opening_balance, pa.opening_balance),
        balance_type = COALESCE(p_balance_type, pa.balance_type),
        address = COALESCE(p_address, pa.address),
        city = COALESCE(p_city, pa.city),
        state = COALESCE(p_state, pa.state),
        pincode = COALESCE(p_pincode, pa.pincode)
    FROM public.businesses b
    WHERE pa.id = p_id 
      AND pa.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_delete_party(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.parties pa
    USING public.businesses b
    WHERE pa.id = p_id 
      AND pa.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- 8. RPC FUNCTIONS - ITEMS
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_get_items(p_business_id UUID)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    name TEXT,
    code TEXT,
    hsn_code TEXT,
    gst_percent NUMERIC,
    unit TEXT,
    sales_price NUMERIC,
    purchase_price NUMERIC,
    opening_stock INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT i.id, i.business_id, i.name, i.code, i.hsn_code, i.gst_percent,
           i.unit, i.sales_price, i.purchase_price, i.opening_stock, 
           i.description, i.created_at
    FROM public.items i
    INNER JOIN public.businesses b ON i.business_id = b.id
    WHERE i.business_id = p_business_id AND b.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION rpc_create_item(
    p_business_id UUID,
    p_name TEXT,
    p_code TEXT,
    p_unit TEXT,
    p_hsn_code TEXT DEFAULT NULL,
    p_gst_percent NUMERIC DEFAULT 0,
    p_sales_price NUMERIC DEFAULT 0,
    p_purchase_price NUMERIC DEFAULT 0,
    p_opening_stock INTEGER DEFAULT 0,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item_id UUID;
BEGIN
    -- Verify business ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    INSERT INTO public.items (
        business_id, name, code, hsn_code, gst_percent, unit,
        sales_price, purchase_price, opening_stock, description
    ) VALUES (
        p_business_id, p_name, p_code, p_hsn_code, p_gst_percent, p_unit,
        p_sales_price, p_purchase_price, p_opening_stock, p_description
    )
    RETURNING id INTO v_item_id;
    
    RETURN v_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_item(
    p_id UUID,
    p_name TEXT DEFAULT NULL,
    p_code TEXT DEFAULT NULL,
    p_hsn_code TEXT DEFAULT NULL,
    p_gst_percent NUMERIC DEFAULT NULL,
    p_unit TEXT DEFAULT NULL,
    p_sales_price NUMERIC DEFAULT NULL,
    p_purchase_price NUMERIC DEFAULT NULL,
    p_opening_stock INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.items i
    SET 
        name = COALESCE(p_name, i.name),
        code = COALESCE(p_code, i.code),
        hsn_code = COALESCE(p_hsn_code, i.hsn_code),
        gst_percent = COALESCE(p_gst_percent, i.gst_percent),
        unit = COALESCE(p_unit, i.unit),
        sales_price = COALESCE(p_sales_price, i.sales_price),
        purchase_price = COALESCE(p_purchase_price, i.purchase_price),
        opening_stock = COALESCE(p_opening_stock, i.opening_stock),
        description = COALESCE(p_description, i.description)
    FROM public.businesses b
    WHERE i.id = p_id 
      AND i.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_delete_item(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.items i
    USING public.businesses b
    WHERE i.id = p_id 
      AND i.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- 9. RPC FUNCTIONS - INVOICES
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_get_invoices(p_business_id UUID, p_type TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    invoice_no TEXT,
    date DATE,
    party_name TEXT,
    party_id UUID,
    gstin TEXT,
    state TEXT,
    address TEXT,
    items JSONB,
    subtotal NUMERIC,
    discount_amount NUMERIC,
    discount_percent NUMERIC,
    total_tax NUMERIC,
    round_off NUMERIC,
    net_total NUMERIC,
    payment_received NUMERIC,
    balance_due NUMERIC,
    type TEXT,
    status TEXT,
    due_date DATE,
    payment_method TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT inv.id, inv.business_id, inv.invoice_no, inv.date, inv.party_name,
           inv.party_id, inv.gstin, inv.state, inv.address, inv.items,
           inv.subtotal, inv.discount_amount, inv.discount_percent, inv.total_tax,
           inv.round_off, inv.net_total, inv.payment_received, inv.balance_due,
           inv.type, inv.status, inv.due_date, inv.payment_method,
           inv.created_at, inv.updated_at
    FROM public.invoices inv
    INNER JOIN public.businesses b ON inv.business_id = b.id
    WHERE inv.business_id = p_business_id 
      AND b.user_id = auth.uid()
      AND (p_type IS NULL OR inv.type = p_type)
    ORDER BY inv.date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_get_invoice_by_id(p_id UUID)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    invoice_no TEXT,
    date DATE,
    party_name TEXT,
    party_id UUID,
    gstin TEXT,
    state TEXT,
    address TEXT,
    items JSONB,
    subtotal NUMERIC,
    discount_amount NUMERIC,
    discount_percent NUMERIC,
    total_tax NUMERIC,
    round_off NUMERIC,
    net_total NUMERIC,
    payment_received NUMERIC,
    balance_due NUMERIC,
    type TEXT,
    status TEXT,
    due_date DATE,
    payment_method TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT inv.id, inv.business_id, inv.invoice_no, inv.date, inv.party_name,
           inv.party_id, inv.gstin, inv.state, inv.address, inv.items,
           inv.subtotal, inv.discount_amount, inv.discount_percent, inv.total_tax,
           inv.round_off, inv.net_total, inv.payment_received, inv.balance_due,
           inv.type, inv.status, inv.due_date, inv.payment_method,
           inv.created_at, inv.updated_at
    FROM public.invoices inv
    INNER JOIN public.businesses b ON inv.business_id = b.id
    WHERE inv.id = p_id AND b.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION rpc_create_invoice(
    p_business_id UUID,
    p_invoice_no TEXT,
    p_date DATE,
    p_party_name TEXT,
    p_state TEXT,
    p_address TEXT,
    p_net_total NUMERIC,
    p_type TEXT,
    p_party_id UUID DEFAULT NULL,
    p_gstin TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_subtotal NUMERIC DEFAULT 0,
    p_discount_amount NUMERIC DEFAULT 0,
    p_discount_percent NUMERIC DEFAULT 0,
    p_total_tax NUMERIC DEFAULT 0,
    p_round_off NUMERIC DEFAULT 0,
    p_payment_received NUMERIC DEFAULT 0,
    p_balance_due NUMERIC DEFAULT 0,
    p_status TEXT DEFAULT 'draft',
    p_due_date DATE DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'Cash'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice_id UUID;
BEGIN
    -- Verify business ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    INSERT INTO public.invoices (
        business_id, invoice_no, date, party_name, party_id, gstin, state, address,
        items, subtotal, discount_amount, discount_percent, total_tax, round_off,
        net_total, payment_received, balance_due, type, status, due_date, payment_method
    ) VALUES (
        p_business_id, p_invoice_no, p_date, p_party_name, p_party_id, p_gstin, p_state, p_address,
        p_items, p_subtotal, p_discount_amount, p_discount_percent, p_total_tax, p_round_off,
        p_net_total, p_payment_received, p_balance_due, p_type, p_status, p_due_date, p_payment_method
    )
    RETURNING id INTO v_invoice_id;
    
    RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_invoice(
    p_id UUID,
    p_invoice_no TEXT DEFAULT NULL,
    p_date DATE DEFAULT NULL,
    p_party_name TEXT DEFAULT NULL,
    p_party_id UUID DEFAULT NULL,
    p_gstin TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_items JSONB DEFAULT NULL,
    p_subtotal NUMERIC DEFAULT NULL,
    p_discount_amount NUMERIC DEFAULT NULL,
    p_discount_percent NUMERIC DEFAULT NULL,
    p_total_tax NUMERIC DEFAULT NULL,
    p_round_off NUMERIC DEFAULT NULL,
    p_net_total NUMERIC DEFAULT NULL,
    p_payment_received NUMERIC DEFAULT NULL,
    p_balance_due NUMERIC DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.invoices inv
    SET 
        invoice_no = COALESCE(p_invoice_no, inv.invoice_no),
        date = COALESCE(p_date, inv.date),
        party_name = COALESCE(p_party_name, inv.party_name),
        party_id = COALESCE(p_party_id, inv.party_id),
        gstin = COALESCE(p_gstin, inv.gstin),
        state = COALESCE(p_state, inv.state),
        address = COALESCE(p_address, inv.address),
        items = COALESCE(p_items, inv.items),
        subtotal = COALESCE(p_subtotal, inv.subtotal),
        discount_amount = COALESCE(p_discount_amount, inv.discount_amount),
        discount_percent = COALESCE(p_discount_percent, inv.discount_percent),
        total_tax = COALESCE(p_total_tax, inv.total_tax),
        round_off = COALESCE(p_round_off, inv.round_off),
        net_total = COALESCE(p_net_total, inv.net_total),
        payment_received = COALESCE(p_payment_received, inv.payment_received),
        balance_due = COALESCE(p_balance_due, inv.balance_due),
        status = COALESCE(p_status, inv.status),
        due_date = COALESCE(p_due_date, inv.due_date),
        payment_method = COALESCE(p_payment_method, inv.payment_method),
        updated_at = NOW()
    FROM public.businesses b
    WHERE inv.id = p_id 
      AND inv.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_delete_invoice(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.invoices inv
    USING public.businesses b
    WHERE inv.id = p_id 
      AND inv.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- 10. RPC FUNCTIONS - PAYMENTS
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_get_payments(p_business_id UUID)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    date DATE,
    party_name TEXT,
    type TEXT,
    invoice_no TEXT,
    amount NUMERIC,
    mode TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT pay.id, pay.business_id, pay.date, pay.party_name, pay.type,
           pay.invoice_no, pay.amount, pay.mode, pay.remarks, pay.created_at
    FROM public.payments pay
    INNER JOIN public.businesses b ON pay.business_id = b.id
    WHERE pay.business_id = p_business_id AND b.user_id = auth.uid()
    ORDER BY pay.date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_create_payment(
    p_business_id UUID,
    p_date DATE,
    p_party_name TEXT,
    p_type TEXT,
    p_amount NUMERIC,
    p_invoice_no TEXT DEFAULT NULL,
    p_mode TEXT DEFAULT 'Cash',
    p_remarks TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_id UUID;
BEGIN
    -- Verify business ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    INSERT INTO public.payments (
        business_id, date, party_name, type, invoice_no, amount, mode, remarks
    ) VALUES (
        p_business_id, p_date, p_party_name, p_type, p_invoice_no, p_amount, p_mode, p_remarks
    )
    RETURNING id INTO v_payment_id;
    
    RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_payment(
    p_id UUID,
    p_date DATE DEFAULT NULL,
    p_party_name TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_invoice_no TEXT DEFAULT NULL,
    p_amount NUMERIC DEFAULT NULL,
    p_mode TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.payments pay
    SET 
        date = COALESCE(p_date, pay.date),
        party_name = COALESCE(p_party_name, pay.party_name),
        type = COALESCE(p_type, pay.type),
        invoice_no = COALESCE(p_invoice_no, pay.invoice_no),
        amount = COALESCE(p_amount, pay.amount),
        mode = COALESCE(p_mode, pay.mode),
        remarks = COALESCE(p_remarks, pay.remarks)
    FROM public.businesses b
    WHERE pay.id = p_id 
      AND pay.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_delete_payment(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.payments pay
    USING public.businesses b
    WHERE pay.id = p_id 
      AND pay.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- 11. RPC FUNCTIONS - EXPENSES
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_get_expenses(p_business_id UUID)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    category TEXT,
    description TEXT,
    amount NUMERIC,
    date DATE,
    receipt_url TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.business_id, e.category, e.description, e.amount,
           e.date, e.receipt_url, e.created_at, e.updated_at
    FROM public.expenses e
    INNER JOIN public.businesses b ON e.business_id = b.id
    WHERE e.business_id = p_business_id AND b.user_id = auth.uid()
    ORDER BY e.date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_create_expense(
    p_business_id UUID,
    p_category TEXT,
    p_description TEXT,
    p_amount NUMERIC,
    p_date DATE,
    p_receipt_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expense_id UUID;
BEGIN
    -- Verify business ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    INSERT INTO public.expenses (
        business_id, category, description, amount, date, receipt_url
    ) VALUES (
        p_business_id, p_category, p_description, p_amount, p_date, p_receipt_url
    )
    RETURNING id INTO v_expense_id;
    
    RETURN v_expense_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_expense(
    p_id UUID,
    p_category TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_amount NUMERIC DEFAULT NULL,
    p_date DATE DEFAULT NULL,
    p_receipt_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.expenses e
    SET 
        category = COALESCE(p_category, e.category),
        description = COALESCE(p_description, e.description),
        amount = COALESCE(p_amount, e.amount),
        date = COALESCE(p_date, e.date),
        receipt_url = COALESCE(p_receipt_url, e.receipt_url),
        updated_at = NOW()
    FROM public.businesses b
    WHERE e.id = p_id 
      AND e.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_delete_expense(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.expenses e
    USING public.businesses b
    WHERE e.id = p_id 
      AND e.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- 12. RPC FUNCTIONS - BANK TRANSACTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_get_bank_transactions(p_business_id UUID)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    date DATE,
    bank_name TEXT,
    account_no TEXT,
    type TEXT,
    amount NUMERIC,
    purpose TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT bt.id, bt.business_id, bt.date, bt.bank_name, bt.account_no,
           bt.type, bt.amount, bt.purpose, bt.created_at
    FROM public.bank_transactions bt
    INNER JOIN public.businesses b ON bt.business_id = b.id
    WHERE bt.business_id = p_business_id AND b.user_id = auth.uid()
    ORDER BY bt.date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_create_bank_transaction(
    p_business_id UUID,
    p_date DATE,
    p_bank_name TEXT,
    p_account_no TEXT,
    p_type TEXT,
    p_amount NUMERIC,
    p_purpose TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    -- Verify business ownership
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    INSERT INTO public.bank_transactions (
        business_id, date, bank_name, account_no, type, amount, purpose
    ) VALUES (
        p_business_id, p_date, p_bank_name, p_account_no, p_type, p_amount, p_purpose
    )
    RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_delete_bank_transaction(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.bank_transactions bt
    USING public.businesses b
    WHERE bt.id = p_id 
      AND bt.business_id = b.id 
      AND b.user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- =====================================================
-- 13. GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
