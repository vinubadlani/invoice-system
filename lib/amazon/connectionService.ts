import { getSupabaseAdminClient } from "@/lib/supabase-admin"
import { encryptRefreshToken, decryptRefreshToken } from "./crypto"
import { AmazonEnvironment, AmazonRegion } from "./config"

// All reads/writes here use the service-role client and bypass RLS by
// design — this is the one place in the codebase allowed to touch the
// encrypted_refresh_token column. Only ever import this from server code
// (app/api/integrations/amazon/** route handlers), never from a client
// component.

export type AmazonConnectionRow = {
  id: string
  business_id: string
  seller_id: string
  marketplace_id: string
  region: AmazonRegion
  environment: AmazonEnvironment
  status: string
  encrypted_refresh_token: string | null
  token_iv: string | null
  token_auth_tag: string | null
}

export async function upsertConnection(params: {
  businessId: string
  createdBy: string
  sellerId: string
  marketplaceId: string
  region: AmazonRegion
  environment: AmazonEnvironment
  refreshToken: string
}) {
  const admin = getSupabaseAdminClient()
  const encrypted = encryptRefreshToken(params.refreshToken)

  const { data, error } = await admin
    .from("amazon_connections")
    .upsert(
      {
        business_id: params.businessId,
        created_by: params.createdBy,
        seller_id: params.sellerId,
        marketplace_id: params.marketplaceId,
        region: params.region,
        environment: params.environment,
        status: "connected",
        encrypted_refresh_token: encrypted.ciphertext,
        token_iv: encrypted.iv,
        token_auth_tag: encrypted.authTag,
        last_error: null,
        disconnected_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id,seller_id,marketplace_id" }
    )
    .select("id")
    .single()

  if (error) {
    throw new Error(`Failed to store Amazon connection: ${error.message}`)
  }

  return data.id as string
}

// Fetches a connection scoped to a business (defense in depth — callers
// should already know the caller owns businessId, this re-checks it) and
// decrypts the refresh token for immediate use. The decrypted token is
// returned to the caller's stack frame only — never persisted, logged, or
// sent to the client.
export async function getConnectionWithRefreshToken(connectionId: string, businessId: string) {
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from("amazon_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("business_id", businessId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const row = data as AmazonConnectionRow
  if (!row.encrypted_refresh_token || !row.token_iv || !row.token_auth_tag) {
    return { row, refreshToken: null as string | null }
  }

  const refreshToken = decryptRefreshToken({
    ciphertext: row.encrypted_refresh_token,
    iv: row.token_iv,
    authTag: row.token_auth_tag,
  })

  return { row, refreshToken }
}

export async function recordSyncOutcome(
  connectionId: string,
  outcome: { success: boolean; error?: string }
) {
  const admin = getSupabaseAdminClient()
  const now = new Date().toISOString()

  await admin
    .from("amazon_connections")
    .update({
      last_sync_at: now,
      last_successful_sync_at: outcome.success ? now : undefined,
      last_error: outcome.success ? null : outcome.error ?? "Unknown sync error",
      status: outcome.success ? "connected" : "error",
      updated_at: now,
    })
    .eq("id", connectionId)
}
