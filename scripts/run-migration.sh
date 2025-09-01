#!/bin/bash

# Database Migration Script
# This script adds the invoice_template column to the businesses table

echo "🔧 Running database migration to add invoice_template column..."

# You can run this SQL directly in your Supabase SQL Editor
# OR use the Supabase CLI if you have it configured

cat << 'EOF'

To apply this migration, you have two options:

1. Using Supabase Dashboard:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the following SQL:

   ALTER TABLE public.businesses 
   ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'classic';
   
   UPDATE public.businesses 
   SET invoice_template = 'classic' 
   WHERE invoice_template IS NULL;

2. Using Supabase CLI (if configured):
   - Run: supabase db reset
   - Or manually execute the migration

EOF

echo "✅ Migration script ready. Please apply the SQL above to your Supabase database."
