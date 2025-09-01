-- Add invoice_template column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'classic';

-- Update any existing businesses to have the default template
UPDATE public.businesses 
SET invoice_template = 'classic' 
WHERE invoice_template IS NULL;
