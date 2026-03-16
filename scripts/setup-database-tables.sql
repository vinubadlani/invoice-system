-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for businesses table
CREATE POLICY "Users can view own businesses" ON businesses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own businesses" ON businesses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own businesses" ON businesses
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for parties table
CREATE POLICY "Users can view parties of own businesses" ON parties
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create parties for own businesses" ON parties
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update parties of own businesses" ON parties
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for items table
CREATE POLICY "Users can view items of own businesses" ON items
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items for own businesses" ON items
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items of own businesses" ON items
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for invoices table
CREATE POLICY "Users can view invoices of own businesses" ON invoices
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoices for own businesses" ON invoices
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoices of own businesses" ON invoices
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
