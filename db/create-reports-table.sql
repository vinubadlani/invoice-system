-- Create reports_sent table to track scheduled reports
CREATE TABLE IF NOT EXISTS public.reports_sent (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'business_summary',
  sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  recipient_email text NOT NULL,
  report_data jsonb,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_sent_business_id ON reports_sent(business_id);
CREATE INDEX IF NOT EXISTS idx_reports_sent_sent_at ON reports_sent(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_sent_status ON reports_sent(status);

-- Enable RLS
ALTER TABLE public.reports_sent ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their business reports"
  ON reports_sent FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role can insert reports"
  ON reports_sent FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update reports"
  ON reports_sent FOR UPDATE
  USING (true);
