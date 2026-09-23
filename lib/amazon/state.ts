import { randomBytes } from "crypto"
import { getSupabaseAdminClient } from "@/lib/supabase-admin"
import { getAmazonEnvironment } from "./config"

const STATE_TTL_MINUTES = 10

// Generates a random, single-use, tenant-bound OAuth state and stores it in
// amazon_oauth_states (service-role only table, no RLS access from the
// browser). The callback route looks the state up and recovers business_id
// from THIS row — it never trusts a business/user id sent by the browser on
// the callback, which is what prevents "connect Amazon account A to Hisab
// Kitab user B".
export async function createOAuthState(businessId: string, userId: string): Promise<string> {
  const state = randomBytes(32).toString("base64url")
  const admin = getSupabaseAdminClient()

  const { error } = await admin.from("amazon_oauth_states").insert({
    state,
    business_id: businessId,
    user_id: userId,
    environment: getAmazonEnvironment(),
    expires_at: new Date(Date.now() + STATE_TTL_MINUTES * 60 * 1000).toISOString(),
  })

  if (error) {
    throw new Error(`Failed to create Amazon OAuth state: ${error.message}`)
  }

  return state
}

export type ConsumedState = {
  businessId: string
  userId: string
  environment: string
}

// Validates and marks a state as used in one atomic step (an update guarded
// by used_at IS NULL and expires_at > now()), so a replayed callback with the
// same state — or two concurrent callbacks — can only succeed once.
export async function consumeOAuthState(state: string): Promise<ConsumedState | null> {
  const admin = getSupabaseAdminClient()

  const { data, error } = await admin
    .from("amazon_oauth_states")
    .update({ used_at: new Date().toISOString() })
    .eq("state", state)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("business_id, user_id, environment")
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return { businessId: data.business_id, userId: data.user_id, environment: data.environment }
}
