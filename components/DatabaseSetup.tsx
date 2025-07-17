"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Copy, Check, ExternalLink, Database, Terminal } from "lucide-react"

const sqlScripts = [
  {
    id: "tables",
    title: "1. Create Database Tables",
    description: "Run this script to create all necessary tables for the application.",
    script: `
-- Create users table
CREATE TABLE public.users (
  id uuid NOT NULL PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create businesses table
CREATE TABLE public.businesses (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  pincode text,
  phone text,
  email text,
  gstin text,
  pan text,
  terms_conditions text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create parties table (customers/suppliers)
CREATE TABLE public.parties (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  party_type text NOT NULL, -- 'customer', 'supplier', 'both'
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  gstin text,
  pan text,
  balance numeric DEFAULT 0 NOT NULL,
  balance_type text, -- 'to_collect', 'to_pay'
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create items table (products/services)
CREATE TABLE public.items (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  hsn_sac text,
  unit text,
  sale_price numeric NOT NULL,
  purchase_price numeric NOT NULL,
  gst_rate numeric,
  stock numeric DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create invoices table (sales/purchases)
CREATE TABLE public.invoices (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  invoice_type text NOT NULL, -- 'sale', 'purchase'
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  total_amount numeric NOT NULL,
  total_gst numeric NOT NULL,
  grand_total numeric NOT NULL,
  status text DEFAULT 'pending' NOT NULL, -- 'pending', 'paid', 'cancelled'
  terms_conditions text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create invoice_items table (line items for invoices)
CREATE TABLE public.invoice_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  unit text,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  gst_rate numeric,
  item_total numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create payments table
CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_date date NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  transaction_id text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  ifsc_code text,
  branch_name text,
  balance numeric DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create bank_transactions table
CREATE TABLE public.bank_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  type text NOT NULL, -- 'deposit', 'withdrawal'
  amount numeric NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
`,
  },
  {
    id: "rls",
    title: "2. Setup Row Level Security (RLS) Policies",
    description: "These policies ensure users can only access their own business data.",
    script: `
-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for public.users
CREATE POLICY "Allow individual read access" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow individual insert access" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow individual update access" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow individual delete access" ON public.users FOR DELETE USING (auth.uid() = id);

-- RLS policies for public.businesses
CREATE POLICY "Allow authenticated users to view their businesses" ON public.businesses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated users to insert their businesses" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow authenticated users to update their businesses" ON public.businesses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated users to delete their businesses" ON public.businesses FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for public.parties
CREATE POLICY "Allow authenticated users to view their parties" ON public.parties FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to insert their parties" ON public.parties FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to update their parties" ON public.parties FOR UPDATE USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to delete their parties" ON public.parties FOR DELETE USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));

-- RLS policies for public.items
CREATE POLICY "Allow authenticated users to view their items" ON public.items FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to insert their items" ON public.items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to update their items" ON public.items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to delete their items" ON public.items FOR DELETE USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));

-- RLS policies for public.invoices
CREATE POLICY "Allow authenticated users to view their invoices" ON public.invoices FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to insert their invoices" ON public.invoices FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to update their invoices" ON public.invoices FOR UPDATE USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to delete their invoices" ON public.invoices FOR DELETE USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));

-- RLS policies for public.invoice_items
CREATE POLICY "Allow authenticated users to view their invoice items" ON public.invoice_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())));
CREATE POLICY "Allow authenticated users to insert their invoice items" ON public.invoice_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())));
CREATE POLICY "Allow authenticated users to update their invoice items" ON public.invoice_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())));
CREATE POLICY "Allow authenticated users to delete their invoice items" ON public.invoice_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())));

-- RLS policies for public.payments
CREATE POLICY "Allow authenticated users to view their payments" ON public.payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to insert their payments" ON public.payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to update their payments" ON public.payments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to delete their payments" ON public.payments FOR DELETE USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));

-- RLS policies for public.bank_accounts
CREATE POLICY "Allow authenticated users to view their bank accounts" ON public.bank_accounts FOR SELECT USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to insert their bank accounts" ON public.bank_accounts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to update their bank accounts" ON public.bank_accounts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));
CREATE POLICY "Allow authenticated users to delete their bank accounts" ON public.bank_accounts FOR DELETE USING (EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid()));

-- RLS policies for public.bank_transactions
CREATE POLICY "Allow authenticated users to view their bank transactions" ON public.bank_transactions FOR SELECT USING (EXISTS (SELECT 1 FROM public.bank_accounts WHERE id = bank_account_id AND EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())));
CREATE POLICY "Allow authenticated users to insert their bank transactions" ON public.bank_transactions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.bank_accounts WHERE id = bank_account_id AND EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())));
CREATE POLICY "Allow authenticated users to update their bank transactions" ON public.bank_transactions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.bank_accounts WHERE id = bank_account_id AND EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())));
CREATE POLICY "Allow authenticated users to delete their bank transactions" ON public.bank_transactions FOR DELETE USING (EXISTS (SELECT 1 FROM public.bank_accounts WHERE id = bank_account_id AND EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND user_id = auth.uid())));
`,
  },
  {
    id: "user-trigger",
    title: "3. Create User Profile Trigger",
    description:
      "This trigger automatically creates a user profile in `public.users` when a new user signs up via Supabase Auth.",
    script: `
-- Function to create a public user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user sign-ups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`,
  },
  {
    id: "admin-user",
    title: "4. Create Admin User & Sample Data",
    description: "This script creates an admin user and populates sample business data for quick testing.",
    script: `
-- Create admin user (if not exists) and set email confirmed
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- A fixed UUID for the admin user
  'admin@poshamherbals.com',
  crypt('admin123456', gen_salt('bf')), -- Hashed password for 'admin123456'
  now(),
  '{"full_name": "System Administrator"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Insert into public.users (if not exists)
INSERT INTO public.users (id, email, full_name)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin@poshamherbals.com',
  'System Administrator'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample business for admin user
INSERT INTO public.businesses (id, user_id, name, address, city, state, pincode, phone, email, gstin, pan, terms_conditions)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- A fixed UUID for the sample business
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Posham Herbals Pvt Ltd',
  '123 Herbal Lane',
  'New Delhi',
  'Delhi',
  '110001',
  '9876543210',
  'info@poshamherbals.com',
  '07ABCDE1234F1Z2',
  'ABCDE1234F',
  'Payment due within 30 days\\nGoods once sold will not be taken back\\nInterest @ 18% p.a. will be charged on overdue amounts\\nSubject to jurisdiction only'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample parties for the business
INSERT INTO public.parties (business_id, name, party_type, phone, email, address, city, state, pincode, balance, balance_type)
VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Green Leaf Distributors', 'customer', '9988776655', 'greenleaf@example.com', '456 Oak Avenue', 'New Delhi', 'Delhi', '110002', 5000.00, 'to_collect'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Herbal Essence Suppliers', 'supplier', '9911223344', 'herbalessence@example.com', '789 Pine Street', 'Mumbai', 'Maharashtra', '400001', 2500.00, 'to_pay')
ON CONFLICT DO NOTHING;

-- Insert sample items for the business
INSERT INTO public.items (business_id, name, hsn_sac, unit, sale_price, purchase_price, gst_rate, stock)
VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Organic Turmeric Powder', '12345678', 'kg', 250.00, 180.00, 5.0, 100),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Neem Oil (Cold Pressed)', '87654321', 'liter', 800.00, 600.00, 18.0, 50)
ON CONFLICT DO NOTHING;
`,
  },
]

export default function DatabaseSetup() {
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  const handleCopy = async (script: string, id: string) => {
    try {
      await navigator.clipboard.writeText(script)
      setCopiedScriptId(id)
      setTimeout(() => setCopiedScriptId(null), 2000)
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  const handleMarkComplete = (id: string) => {
    setCompletedSteps((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const allStepsCompleted = completedSteps.length === sqlScripts.length

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <Database className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <CardTitle className="text-3xl font-bold text-gray-900">Database Setup Required</CardTitle>
          <CardDescription className="text-gray-600">
            It looks like your Supabase database is not yet set up for this application. Please follow these steps to
            initialize your database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <ExternalLink className="h-4 w-4" />
            <AlertDescription>
              Open your Supabase project's SQL Editor:{" "}
              <a
                href="https://supabase.com/dashboard/projects/_/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Go to Supabase SQL Editor
              </a>
              . Run each script in the order provided.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            {sqlScripts.map((script, index) => (
              <Card key={script.id} className="border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        completedSteps.includes(script.id) ? "bg-green-500" : "bg-blue-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{script.title}</CardTitle>
                      <CardDescription>{script.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(script.script, script.id)}
                    className="flex items-center space-x-2"
                  >
                    {copiedScriptId === script.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span>{copiedScriptId === script.id ? "Copied!" : "Copy Script"}</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-gray-800 text-white p-4 rounded-md text-sm overflow-x-auto">
                      <code>{script.script}</code>
                    </pre>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2 flex items-center space-x-1"
                      onClick={() => handleMarkComplete(script.id)}
                    >
                      {completedSteps.includes(script.id) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Terminal className="h-4 w-4" />
                      )}
                      <span>{completedSteps.includes(script.id) ? "Completed" : "Mark as Run"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button onClick={() => window.location.reload()} disabled={!allStepsCompleted} className="w-full max-w-xs">
              {allStepsCompleted ? "Database Ready! Reload Application" : "Complete All Steps Above"}
            </Button>
            {!allStepsCompleted && (
              <p className="text-sm text-gray-500 mt-2">
                Please run all {sqlScripts.length} scripts and mark them as complete to proceed.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
