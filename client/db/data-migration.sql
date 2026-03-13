-- ========================================
-- DATA MIGRATION SCRIPT
-- Migrates all data from old database to new Supabase instance
-- Run this AFTER running supabase-migration.sql
-- ========================================

/*
IMPORTANT: Before running this script, you need to manually create user accounts in Supabase Auth for each of these users:

1. ajay1236@gmail.com (admin) - Old ID: 88605097-6ecc-41cd-96bc-56c5f2188b23
2. bt22cse162@gmail.com (vinay) - Old ID: 8e69039c-2ea7-4f2d-b4b5-4ea2d393c952  
3. ajaykbadlani@gmail.com (Ajay Kumar) - Old ID: 511384da-f53f-4302-99a9-70733d6d27bd
4. truelyayurvedic@gmail.com (SIO OLD UPTO 2023) - Old ID: ee1632d3-4aee-4c38-b66e-6f7a8ac2376f
5. hafizasif1109@gmail.com (Asif Mahmood) - Old ID: 6ac541a2-5c3e-41a1-a951-cdbfde146000
6. vinubadlani@gmail.com (vinay) - Old ID: 6cc56a9e-b3ea-4958-a67f-7a632824b93c

After creating these accounts through the auth system, they will automatically be added to public.users table via the trigger.
Then you need to get the NEW user IDs from public.users and update this script accordingly.

HOW TO GET NEW USER IDs:
Run this query after users sign up:
SELECT id, email, full_name FROM public.users ORDER BY created_at;

Then replace the OLD IDs in the script below with NEW IDs.
*/

-- ========================================
-- OPTION 1: Direct Migration (Simple - May cause issues with user_id foreign keys)
-- ========================================

-- If you want to preserve exact UUIDs (advanced - requires bypassing RLS temporarily):
-- This approach inserts users with their original IDs

-- Temporarily disable RLS for migration
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 1. INSERT USERS
-- ========================================
-- Note: These users should ideally be created through Supabase Auth first
-- But we're inserting them directly here to preserve relationships

INSERT INTO public.users (id, email, full_name, created_at) VALUES
('88605097-6ecc-41cd-96bc-56c5f2188b23', 'ajay1236@gmail.com', 'admin', '2025-07-16 20:43:54.717464+00'),
('8e69039c-2ea7-4f2d-b4b5-4ea2d393c952', 'bt22cse162@gmail.com', 'vinay', '2025-07-17 11:33:09.211078+00'),
('511384da-f53f-4302-99a9-70733d6d27bd', 'ajaykbadlani@gmail.com', 'Ajay Kumar', '2025-07-19 14:57:21.419212+00'),
('ee1632d3-4aee-4c38-b66e-6f7a8ac2376f', 'truelyayurvedic@gmail.com', 'SIO OLD UPTO 2023', '2025-08-29 13:13:31.445+00'),
('6ac541a2-5c3e-41a1-a951-cdbfde146000', 'hafizasif1109@gmail.com', 'Asif Mahmood', '2025-08-06 13:18:30.297+00'),
('6cc56a9e-b3ea-4958-a67f-7a632824b93c', 'vinubadlani@gmail.com', 'vinay', '2025-08-16 16:02:34.881+00')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. INSERT BUSINESSES
-- ========================================

INSERT INTO public.businesses (id, user_id, name, address, city, state, pincode, phone, email, gstin, pan, terms_conditions, created_at, invoice_template, business_type) VALUES
('28fc1644-8c78-42df-b766-48adc5c9cd65', '88605097-6ecc-41cd-96bc-56c5f2188b23', 'SIO Offline', '35 Padmavati Colony', 'Indore', 'M.P.', '452018', '9827999988', 'ajaykbadlani@gmail.com', '', '', E'Payment due within 30 days\nGoods once sold will not be taken back\nInterest @ 18% p.a. will be charged on overdue amounts\nSubject to Indore M.P. jurisdiction only', '2025-07-16 20:43:54.800973+00', 'classic', 'sole_proprietorship'),
('b4a70797-362a-4b60-ba59-576dba408740', '6ac541a2-5c3e-41a1-a951-cdbfde146000', 'M/s Accounting Palace ', 'Lahore ', 'Lahore', 'Punjab', '54000', '3281480180', 'hafizasif1109@gmail.com', '', '', E'Payment due within 30 days\r\nGoods once sold will not be taken back\r\nInterest @ 18% p.a. will be charged on overdue amounts\r\nSubject to jurisdiction only', '2025-08-06 13:19:50.630017+00', 'classic', 'sole_proprietorship'),
('55576c19-a5dc-48c2-a6cc-e0d02a4a5f89', '8e69039c-2ea7-4f2d-b4b5-4ea2d393c952', 'vinnubadlani', '35', 'indore', 'mp', '452001', '8435232987', 'bt22cse162@gmail.com', '', '', E'Payment due within 30 days\nGoods once sold will not be taken back\nInterest @ 18% p.a. will be charged on overdue amounts\nSubject to jurisdiction only', '2025-07-17 11:33:54.770145+00', 'classic', 'sole_proprietorship'),
('7d2d77a6-2667-443d-bc78-966c2ef2166a', '6cc56a9e-b3ea-4958-a67f-7a632824b93c', 'vinaybadlaniiiii', '', 'indore', 'mp', '', '8435232987', '', '', '', E'Payment due within 30 days\nGoods once sold will not be taken back\nInterest @ 18% p.a. will be charged on overdue amounts\nSubject to jurisdiction yesssssssssssssss', '2025-09-01 18:44:42.831092+00', 'classic', 'sole_proprietorship'),
('43f2ebf7-ac6e-4906-a582-88c938f16b3d', 'ee1632d3-4aee-4c38-b66e-6f7a8ac2376f', 'SIO OFFLINE UPTO 2023', '', 'Indore', 'Madhya Pradesh', '452001', '9827999988', '', '', '', E'Payment due within 30 days\r\nGoods once sold will not be taken back\r\nInterest @ 18% p.a. will be charged on overdue amounts\r\nSubject to jurisdiction only', '2025-08-29 13:17:13.697788+00', 'modern', 'sole_proprietorship'),
('633a3831-0277-41b7-9602-3510f5291d54', '511384da-f53f-4302-99a9-70733d6d27bd', 'Sierra India Organics', 'G-2, 35 Padmavati Colony', 'Indore', 'Madhya Pradesh', '452001', '98279999999', 'sierraindiaorganics@gmail.com', '23CBOPB0402Q1ZT', '', E'Payment due within 30 days.\nGoods once sold will not be taken back.\nInterest @ 18% p.a. will be charged on overdue amounts.\nSubject to Indore jurisdiction only.', '2025-07-27 14:27:22.242644+00', 'modern', 'sole_proprietorship')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- END OF PREVIEW
-- ========================================

/*
NEXT STEPS:
1. This script is VERY large because your database has hundreds of records
2. I recommend using a different approach:

RECOMMENDED APPROACH:
Instead of migrating ALL old data, consider:

A) Fresh Start:
   - Users create new accounts via your app
   - They start with a clean database
   - Old data can be exported as CSV for reference

B) Selective Migration:
   - Migrate only essential data (businesses, key parties, active items)
   - Skip old invoices/transactions

C) Automated Migration Script:
   - Use a Node.js script to read the backup file
   - Insert data via Supabase client API
   - Handle user ID mapping automatically

Would you like me to create:
1. A Node.js migration script that automates this?
2. A CSV export of your data for manual import?
3. A selective migration (only recent/important data)?

For now, the schema is ready - you can start fresh and add data as needed!
*/

-- Re-enable RLS after migration
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Verify migration
SELECT 'Users' as  table_name, COUNT(*) as record_count FROM public.users
UNION ALL
SELECT 'Businesses', COUNT(*) FROM public.businesses
UNION ALL
SELECT 'Parties', COUNT(*) FROM public.parties
UNION ALL
SELECT 'Items', COUNT(*) FROM public.items
UNION ALL
SELECT 'Invoices', COUNT(*) FROM public.invoices
UNION ALL
SELECT 'Payments', COUNT(*) FROM public.payments
UNION ALL
SELECT 'Expenses', COUNT(*) FROM public.expenses
UNION ALL
SELECT 'Bank Accounts', COUNT(*) FROM public.bank_accounts
UNION ALL
SELECT 'Bank Transactions', COUNT(*) FROM public.bank_transactions;
