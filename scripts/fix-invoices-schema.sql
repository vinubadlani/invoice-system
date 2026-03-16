-- Update invoices table to add missing party_id column
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES public.parties(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_party_id ON public.invoices(party_id);

-- Update existing records to set party_id based on party_name (if needed)
-- This is a one-time migration script
DO $$
DECLARE
    invoice_record RECORD;
    party_record RECORD;
BEGIN
    FOR invoice_record IN SELECT id, party_name, business_id FROM public.invoices WHERE party_id IS NULL LOOP
        SELECT id INTO party_record FROM public.parties 
        WHERE name = invoice_record.party_name AND business_id = invoice_record.business_id 
        LIMIT 1;
        
        IF party_record.id IS NOT NULL THEN
            UPDATE public.invoices 
            SET party_id = party_record.id 
            WHERE id = invoice_record.id;
        END IF;
    END LOOP;
END $$;