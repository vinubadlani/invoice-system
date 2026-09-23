import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Server-only Supabase client authenticated with the service-role key.
// Bypasses RLS entirely, so this file must never be imported from a
// client component — only from app/api/** route handlers and lib/amazon/**
// services. Mirrors the service-role usage in
// supabase/functions/send-scheduled-reports/index.ts, the one existing
// precedent for privileged server-side Supabase access in this project.
let adminClient: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set to use the Supabase admin client"
    )
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return adminClient
}
