-- Enhanced sales tables for better tracking and analytics
-- Run this first to set up the schema, then run insert-sample-sales-data.sql

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
  SUM(COALESCE(i.subtotal, 0)) as total_subtotal,
  SUM(COALESCE(i.total_tax, 0)) as total_gst,
  SUM(COALESCE(i.net_total, 0)) as total_amount,
  SUM(COALESCE(i.payment_received, 0)) as total_received,
  SUM(COALESCE(i.balance_due, 0)) as total_pending,
  AVG(COALESCE(i.net_total, 0)) as average_order_value
FROM public.invoices i
WHERE i.type = 'sales'
GROUP BY i.business_id, DATE_TRUNC('day', i.date), DATE_TRUNC('week', i.date), DATE_TRUNC('month', i.date);

-- Create function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default values if null
  IF NEW.payment_received IS NULL THEN
    NEW.payment_received = 0;
  END IF;
  
  IF NEW.net_total IS NULL THEN
    NEW.net_total = 0;
  END IF;
  
  -- Update status based on payment
  IF NEW.payment_received >= NEW.net_total THEN
    NEW.status = 'paid';
    NEW.balance_due = 0;
  ELSIF NEW.payment_received > 0 THEN
    NEW.status = 'partial';
    NEW.balance_due = NEW.net_total - NEW.payment_received;
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.payment_received = 0 THEN
    NEW.status = 'overdue';
    NEW.balance_due = NEW.net_total;
  ELSE
    IF NEW.status IS NULL THEN
      NEW.status = 'pending';
    END IF;
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

CREATE POLICY "Users can delete sales_items of own businesses" ON public.sales_items
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_business_type ON public.invoices(business_id, type);
CREATE INDEX IF NOT EXISTS idx_sales_items_invoice_id ON public.sales_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_business_id ON public.sales_items(business_id);

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
    CASE 
      WHEN COUNT(*) > 0 THEN COALESCE(AVG(i.net_total), 0)
      ELSE 0
    END as average_order_value,
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

-- Update existing invoices to have proper status and balance_due
UPDATE public.invoices 
SET 
  status = CASE 
    WHEN payment_received >= net_total THEN 'paid'
    WHEN payment_received > 0 THEN 'partial'
    WHEN due_date < CURRENT_DATE AND (payment_received = 0 OR payment_received IS NULL) THEN 'overdue'
    ELSE 'pending'
  END,
  balance_due = COALESCE(net_total, 0) - COALESCE(payment_received, 0),
  updated_at = NOW()
WHERE type = 'sales' AND status IS NULL;

-- Ensure all sales invoices have subtotal calculated
UPDATE public.invoices 
SET subtotal = COALESCE(net_total, 0) - COALESCE(total_tax, 0)
WHERE type = 'sales' AND (subtotal IS NULL OR subtotal = 0) AND net_total > 0;

RAISE NOTICE 'Sales tables and functions created successfully!';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Create a business in your application if you haven''t already';
RAISE NOTICE '2. Run insert-sample-sales-data.sql to add sample data';
RAISE NOTICE '3. Access the sales page at /sales in your application';
