-- Enhanced sales tables for better tracking and analytics

-- Add columns to existing invoices table for better sales tracking
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash',
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create sales_items table for detailed item tracking
CREATE TABLE IF NOT EXISTS public.sales_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  item_code TEXT,
  hsn_code TEXT,
  quantity DECIMAL(15,3) NOT NULL,
  unit TEXT NOT NULL,
  rate DECIMAL(15,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  gst_percent DECIMAL(5,2) DEFAULT 0,
  gst_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales_analytics view for dashboard data
CREATE OR REPLACE VIEW public.sales_analytics AS
SELECT 
  i.business_id,
  DATE_TRUNC('day', i.date) as sale_date,
  DATE_TRUNC('week', i.date) as sale_week,
  DATE_TRUNC('month', i.date) as sale_month,
  COUNT(*) as invoice_count,
  SUM(i.subtotal) as total_subtotal,
  SUM(i.total_tax) as total_gst,
  SUM(i.net_total) as total_amount,
  SUM(i.payment_received) as total_received,
  SUM(i.balance_due) as total_pending,
  AVG(i.net_total) as average_order_value
FROM public.invoices i
WHERE i.type = 'sales'
GROUP BY i.business_id, DATE_TRUNC('day', i.date), DATE_TRUNC('week', i.date), DATE_TRUNC('month', i.date);

-- Create function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_received >= NEW.net_total THEN
    NEW.status = 'paid';
    NEW.balance_due = 0;
  ELSIF NEW.payment_received > 0 THEN
    NEW.status = 'partial';
    NEW.balance_due = NEW.net_total - NEW.payment_received;
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.payment_received = 0 THEN
    NEW.status = 'overdue';
    NEW.balance_due = NEW.net_total;
  ELSE
    NEW.balance_due = NEW.net_total - NEW.payment_received;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update invoice status
DROP TRIGGER IF EXISTS trigger_update_invoice_status ON public.invoices;
CREATE TRIGGER trigger_update_invoice_status
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- Add RLS policies for new tables
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales_items of own businesses" ON public.sales_items
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sales_items for own businesses" ON public.sales_items
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sales_items of own businesses" ON public.sales_items
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_sales_items_invoice_id ON public.sales_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_business_id ON public.sales_items(business_id);

-- Insert sample sales data (only if businesses exist)
-- This will insert sample data for the first business found for each user
DO $$
DECLARE
    sample_business_id UUID;
BEGIN
    -- Get the first business ID from the businesses table
    SELECT id INTO sample_business_id 
    FROM public.businesses 
    LIMIT 1;
    
    -- Only insert if we have a business
    IF sample_business_id IS NOT NULL THEN
        INSERT INTO public.invoices (
          business_id, invoice_no, date, party_name, gstin, state, address, 
          items, subtotal, total_tax, round_off, net_total, payment_received, 
          balance_due, type, status, due_date, payment_method
        ) VALUES 
        (
          sample_business_id,
          'INV-2025-001',
          '2025-01-20',
          'ABC Corporation',
          '29ABCDE1234F1Z5',
          'Karnataka',
          '123 Business Park, Bangalore, Karnataka 560001',
          '[{"item": "Product A", "qty": 5, "rate": 2000, "amount": 10000}]',
          10000.00,
          1800.00,
          0.00,
          11800.00,
          11800.00,
          0.00,
          'sales',
          'paid',
          '2025-02-19',
          'UPI'
        ),
        (
          sample_business_id,
          'INV-2025-002',
          '2025-01-18',
          'XYZ Limited',
          '27XYZAB5678C2D9',
          'Maharashtra',
          '456 Trade Center, Mumbai, Maharashtra 400001',
          '[{"item": "Product B", "qty": 10, "rate": 2500, "amount": 25000}]',
          25000.00,
          4500.00,
          0.00,
          29500.00,
          0.00,
          29500.00,
          'sales',
          'pending',
          '2025-02-17',
          'Bank Transfer'
        ),
        (
          sample_business_id,
          'INV-2025-003',
          '2025-01-15',
          'PQR Industries',
          '33PQRST9012E3F4',
          'Tamil Nadu',
          '789 Industrial Area, Chennai, Tamil Nadu 600001',
          '[{"item": "Product C", "qty": 3, "rate": 5000, "amount": 15000}]',
          15000.00,
          2700.00,
          0.00,
          17700.00,
          17700.00,
          0.00,
          'sales',
          'paid',
          '2025-02-14',
          'Cash'
        ),
        (
          sample_business_id,
          'INV-2025-004',
          '2025-01-22',
          'TechSoft Solutions',
          '07TECHQ9876R1Z8',
          'Delhi',
          '45 Tech Hub, New Delhi, Delhi 110001',
          '[{"item": "Software License", "qty": 1, "rate": 50000, "amount": 50000}]',
          50000.00,
          9000.00,
          0.00,
          59000.00,
          30000.00,
          29000.00,
          'sales',
          'partial',
          '2025-02-21',
          'Bank Transfer'
        ),
        (
          sample_business_id,
          'INV-2025-005',
          '2025-01-25',
          'Global Enterprises',
          '19GLOBAL123A1Z9',
          'Gujarat',
          '88 Business District, Ahmedabad, Gujarat 380001',
          '[{"item": "Consulting Services", "qty": 20, "rate": 1500, "amount": 30000}]',
          30000.00,
          5400.00,
          0.00,
          35400.00,
          35400.00,
          0.00,
          'sales',
          'paid',
          '2025-02-24',
          'UPI'
        ),
        (
          sample_business_id,
          'INV-2025-006',
          CURRENT_DATE - INTERVAL '2 days',
          'Modern Industries',
          '22MODERN567B2C1',
          'Karnataka',
          '12 Industrial Zone, Bangalore, Karnataka 560078',
          '[{"item": "Equipment", "qty": 2, "rate": 12000, "amount": 24000}]',
          24000.00,
          4320.00,
          0.00,
          28320.00,
          0.00,
          28320.00,
          'sales',
          'overdue',
          CURRENT_DATE - INTERVAL '1 day',
          'Cash'
        );
        
        RAISE NOTICE 'Sample sales data inserted successfully for business ID: %', sample_business_id;
    ELSE
        RAISE NOTICE 'No businesses found. Please create a business first before inserting sample sales data.';
    END IF;
END $$;

-- Function to get sales statistics for a business
CREATE OR REPLACE FUNCTION get_sales_stats(business_uuid UUID)
RETURNS TABLE(
  total_sales DECIMAL,
  total_invoices BIGINT,
  average_order_value DECIMAL,
  pending_amount DECIMAL,
  paid_amount DECIMAL,
  this_month_sales DECIMAL,
  last_month_sales DECIMAL,
  growth_percentage DECIMAL
) AS $$
DECLARE
  current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
  last_month_start DATE := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
  last_month_end DATE := current_month_start - INTERVAL '1 day';
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(i.net_total), 0) as total_sales,
    COUNT(*) as total_invoices,
    COALESCE(AVG(i.net_total), 0) as average_order_value,
    COALESCE(SUM(i.balance_due), 0) as pending_amount,
    COALESCE(SUM(i.payment_received), 0) as paid_amount,
    COALESCE(SUM(CASE WHEN i.date >= current_month_start THEN i.net_total ELSE 0 END), 0) as this_month_sales,
    COALESCE(SUM(CASE WHEN i.date >= last_month_start AND i.date <= last_month_end THEN i.net_total ELSE 0 END), 0) as last_month_sales,
    CASE 
      WHEN SUM(CASE WHEN i.date >= last_month_start AND i.date <= last_month_end THEN i.net_total ELSE 0 END) > 0 
      THEN ((SUM(CASE WHEN i.date >= current_month_start THEN i.net_total ELSE 0 END) - 
             SUM(CASE WHEN i.date >= last_month_start AND i.date <= last_month_end THEN i.net_total ELSE 0 END)) * 100.0 / 
             SUM(CASE WHEN i.date >= last_month_start AND i.date <= last_month_end THEN i.net_total ELSE 0 END))
      ELSE 0 
    END as growth_percentage
  FROM public.invoices i
  WHERE i.business_id = business_uuid 
    AND i.type = 'sales'
    AND i.date >= CURRENT_DATE - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;
