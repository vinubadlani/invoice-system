-- Per-business default Terms & Conditions and Footer for new invoices.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.business_invoice_defaults (
    business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
    invoice_terms TEXT NOT NULL DEFAULT '',
    invoice_footer TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.business_invoice_defaults ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION rpc_get_invoice_defaults(p_business_id UUID)
RETURNS TABLE (invoice_terms TEXT, invoice_footer TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    RETURN QUERY
    SELECT d.invoice_terms, d.invoice_footer
    FROM public.business_invoice_defaults d
    WHERE d.business_id = p_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_save_invoice_defaults(
    p_business_id UUID,
    p_invoice_terms TEXT,
    p_invoice_footer TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    INSERT INTO public.business_invoice_defaults (business_id, invoice_terms, invoice_footer, updated_at)
    VALUES (p_business_id, COALESCE(p_invoice_terms, ''), COALESCE(p_invoice_footer, ''), NOW())
    ON CONFLICT (business_id) DO UPDATE
    SET invoice_terms = EXCLUDED.invoice_terms,
        invoice_footer = EXCLUDED.invoice_footer,
        updated_at = NOW();
    RETURN TRUE;
END;
$$;
