-- Fix for bank_accounts table creation with proper error handling
-- Run this in Supabase SQL Editor

-- First, check if the table exists and drop it if needed (for clean setup)
DROP TABLE IF EXISTS bank_accounts CASCADE;

-- Create bank_accounts table
CREATE TABLE bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('Savings', 'Current', 'CC', 'OD')),
    branch_name VARCHAR(255) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_bank_accounts_business_id ON bank_accounts(business_id);
CREATE INDEX idx_bank_accounts_is_active ON bank_accounts(is_active);

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view bank_accounts for their businesses" ON bank_accounts
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert bank_accounts for their businesses" ON bank_accounts
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update bank_accounts for their businesses" ON bank_accounts
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete bank_accounts for their businesses" ON bank_accounts
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses WHERE user_id = auth.uid()
        )
    );

-- Add some test data (optional)
-- INSERT INTO bank_accounts (business_id, bank_name, account_number, ifsc_code, account_type, branch_name, account_holder_name, opening_balance, current_balance)
-- VALUES ('55576c19-a5dc-48c2-a6cc-e0d02a4a5f89', 'State Bank of India', '1234567890', 'SBIN0001234', 'Savings', 'Main Branch', 'Business Owner', 10000.00, 10000.00);