-- Create custom_templates table for storing user-customized invoice templates

CREATE TABLE IF NOT EXISTS public.custom_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    template_json JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT custom_templates_unique_name UNIQUE(business_id, name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_templates_business_id ON public.custom_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_custom_templates_user_id ON public.custom_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_templates_active ON public.custom_templates(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their business templates
CREATE POLICY "Users can view their business templates"
    ON public.custom_templates FOR SELECT
    USING (
        user_id = auth.uid() OR
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert templates for their business
CREATE POLICY "Users can create templates for their business"
    ON public.custom_templates FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can update their business templates
CREATE POLICY "Users can update their business templates"
    ON public.custom_templates FOR UPDATE
    USING (
        user_id = auth.uid() OR
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid() AND
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can delete their business templates
CREATE POLICY "Users can delete their business templates"
    ON public.custom_templates FOR DELETE
    USING (
        user_id = auth.uid() AND
        business_id IN (
            SELECT id FROM public.businesses 
            WHERE user_id = auth.uid()
        )
    );

-- Create RPC function to create custom template
CREATE OR REPLACE FUNCTION rpc_create_custom_template(
    p_business_id UUID,
    p_user_id UUID,
    p_name TEXT,
    p_description TEXT,
    p_template_json JSONB
) RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    template_json JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO public.custom_templates (business_id, user_id, name, description, template_json)
    VALUES (p_business_id, p_user_id, p_name, p_description, p_template_json)
    ON CONFLICT (business_id, name) DO UPDATE
    SET 
        description = p_description,
        template_json = p_template_json,
        updated_at = NOW()
    RETURNING
        custom_templates.id,
        custom_templates.name,
        custom_templates.description,
        custom_templates.template_json,
        custom_templates.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to get custom templates
CREATE OR REPLACE FUNCTION rpc_get_custom_templates(p_business_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    template_json JSONB,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.name,
        ct.description,
        ct.template_json,
        ct.is_active,
        ct.created_at,
        ct.updated_at
    FROM public.custom_templates ct
    WHERE ct.business_id = p_business_id
    ORDER BY ct.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to delete custom template
CREATE OR REPLACE FUNCTION rpc_delete_custom_template(p_template_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.custom_templates
    WHERE id = p_template_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add reference to custom_templates in businesses table (optional: for easier queries)
-- ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS custom_invoice_template_id UUID REFERENCES public.custom_templates(id) ON DELETE SET NULL;
