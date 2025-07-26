-- Create admin user in Supabase Auth
-- This should be run in the Supabase SQL Editor

-- First, insert the admin user into auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Fixed UUID for admin
  'authenticated',
  'authenticated',
  'admin@poshamherbals.com',
  crypt('admin123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "System Administrator"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Create corresponding user profile
INSERT INTO public.users (
  id,
  email,
  full_name,
  created_at
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin@poshamherbals.com',
  'System Administrator',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create a sample business for the admin user
INSERT INTO public.businesses (
  id,
  user_id,
  name,
  address,
  city,
  state,
  pincode,
  phone,
  email,
  gstin,
  pan,
  terms_conditions,
  created_at
) VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'POSHAM HERBALS',
  '123 Herbal Street, Business District',
  'Mumbai',
  'Maharashtra',
  '400001',
  '+91 98765 43210',
  'info@poshamherbals.com',
  '27ABCDE1234F1Z5',
  'ABCDE1234F',
  'Payment due within 30 days
Goods once sold will not be taken back
Interest @ 18% p.a. will be charged on overdue amounts
Subject to Mumbai jurisdiction only',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add sample parties for the admin business
INSERT INTO public.parties (
  id,
  business_id,
  name,
  mobile,
  email,
  gstin,
  pan,
  type,
  opening_balance,
  balance_type,
  address,
  city,
  state,
  pincode
) VALUES 
(
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Shree Enterprises',
  '9876543210',
  'shree@example.com',
  '27ABCDE1234F1Z5',
  'ABCDE1234F',
  'Debtor',
  15000.00,
  'To Collect',
  '123 Business Street',
  'Mumbai',
  'Maharashtra',
  '400001'
),
(
  'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Global Suppliers Ltd',
  '9876543211',
  'global@example.com',
  '27FGHIJ5678K2L6',
  'FGHIJ5678K',
  'Creditor',
  8500.00,
  'To Pay',
  '456 Supply Chain Road',
  'Ahmedabad',
  'Gujarat',
  '380001'
) ON CONFLICT (id) DO NOTHING;

-- Add sample items for the admin business
INSERT INTO public.items (
  id,
  business_id,
  name,
  code,
  hsn_code,
  gst_percent,
  unit,
  sales_price,
  purchase_price,
  opening_stock,
  description
) VALUES 
(
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Herbal Tea Blend',
  'HTB001',
  '0902',
  5.00,
  'Kg',
  450.00,
  300.00,
  100,
  'Premium herbal tea blend with natural ingredients'
),
(
  'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Ayurvedic Capsules',
  'AYC002',
  '3004',
  12.00,
  'Bottle',
  280.00,
  180.00,
  50,
  'Natural ayurvedic health capsules'
) ON CONFLICT (business_id, code) DO NOTHING;

-- Add sample invoice for the admin business
INSERT INTO public.invoices (
  id,
  business_id,
  invoice_no,
  date,
  party_name,
  gstin,
  state,
  address,
  items,
  total_tax,
  round_off,
  net_total,
  payment_received,
  balance_due,
  type
) VALUES (
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'INV-001',
  '2025-01-15',
  'Shree Enterprises',
  '27ABCDE1234F1Z5',
  'Maharashtra',
  '123 Business Street, Mumbai, Maharashtra - 400001',
  '[{"id": "1", "itemName": "Herbal Tea Blend", "hsn": "0902", "qty": 10, "rate": 450, "gstPercent": 5, "taxAmount": 225, "total": 4725}]',
  225.00,
  0.00,
  4725.00,
  2000.00,
  2725.00,
  'sales'
) ON CONFLICT (business_id, invoice_no) DO NOTHING;
