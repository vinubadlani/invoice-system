-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('Savings', 'Current', 'Fixed Deposit', 'Credit Card')),
  ifsc_code VARCHAR(20) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create bank_transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('Credit', 'Debit')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  reference_number VARCHAR(50),
  balance_after DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_business_id ON bank_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_business_id ON bank_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_id ON bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);

-- Add RLS policies
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Bank accounts policies
CREATE POLICY "Users can view bank accounts from their businesses" ON bank_accounts
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert bank accounts to their businesses" ON bank_accounts
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update bank accounts from their businesses" ON bank_accounts
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete bank accounts from their businesses" ON bank_accounts
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  );

-- Bank transactions policies
CREATE POLICY "Users can view bank transactions from their businesses" ON bank_transactions
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert bank transactions to their businesses" ON bank_transactions
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update bank transactions from their businesses" ON bank_transactions
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete bank transactions from their businesses" ON bank_transactions
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = auth.uid()
    )
  );

-- Add triggers to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bank_accounts_updated_at 
  BEFORE UPDATE ON bank_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_transactions_updated_at 
  BEFORE UPDATE ON bank_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
