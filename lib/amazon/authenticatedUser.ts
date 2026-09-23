import { getSupabaseAdminClient } from "@/lib/supabase-admin"

// This app persists the Supabase session in localStorage (see lib/supabase.ts's
// getSupabaseClient), not cookies, and the existing app/api/templates/route.ts
// getCurrentUser()-based check never actually receives a session server-side
// because the frontend fetch() calls it with no Authorization header. That's
// not something to fix here, but it's also not a pattern to copy for
// something as security-sensitive as Amazon OAuth: every Amazon route in
// this integration requires the caller to explicitly pass the user's
// Supabase access token as `Authorization: Bearer <access_token>`, which the
// frontend must read from `supabase.auth.getSession()` client-side.
export async function getAuthenticatedUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return null

  const admin = getSupabaseAdminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export async function verifyBusinessOwnership(businessId: string, userId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient()
  const { data } = await admin.from("businesses").select("id").eq("id", businessId).eq("user_id", userId).maybeSingle()
  return !!data
}
