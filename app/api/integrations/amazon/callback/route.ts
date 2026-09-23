import { NextResponse } from "next/server"
import { consumeOAuthState } from "@/lib/amazon/state"
import { exchangeAuthorizationCode } from "@/lib/amazon/lwaClient"
import { upsertConnection } from "@/lib/amazon/connectionService"
import { AMAZON_MARKETPLACES, DEFAULT_MARKETPLACE_ID, getAmazonEnvironment } from "@/lib/amazon/config"
import { logAmazonEvent } from "@/lib/amazon/logger"

// Amazon redirects the seller's browser here with no session of ours
// attached — that's fine, because we never trust anything about *who* is
// connecting from this request's own parameters. The `state` value is
// looked up in amazon_oauth_states, and business_id/user_id are recovered
// from THAT row (created by our own /connect route, tenant-bound at
// creation time). This is what makes it impossible for the callback to
// attach an Amazon account to the wrong Hisab Kitab business.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const settingsUrl = new URL("/settings", url.origin)
  settingsUrl.searchParams.set("tab", "integrations")

  const authorizationCode = url.searchParams.get("spapi_oauth_code")
  const state = url.searchParams.get("state")
  const sellingPartnerId = url.searchParams.get("selling_partner_id")

  if (!authorizationCode || !state || !sellingPartnerId) {
    settingsUrl.searchParams.set("amazon", "error")
    return NextResponse.redirect(settingsUrl)
  }

  const consumed = await consumeOAuthState(state)
  if (!consumed) {
    logAmazonEvent("oauth_failed", { reason: "invalid_or_expired_state" })
    settingsUrl.searchParams.set("amazon", "error")
    return NextResponse.redirect(settingsUrl)
  }

  try {
    const tokenResponse = await exchangeAuthorizationCode(authorizationCode)
    if (!tokenResponse.refresh_token) {
      throw new Error("LWA token exchange did not return a refresh_token")
    }

    const marketplace = AMAZON_MARKETPLACES[DEFAULT_MARKETPLACE_ID]

    await upsertConnection({
      businessId: consumed.businessId,
      createdBy: consumed.userId,
      sellerId: sellingPartnerId,
      marketplaceId: DEFAULT_MARKETPLACE_ID,
      region: marketplace.region,
      environment: getAmazonEnvironment(),
      refreshToken: tokenResponse.refresh_token,
    })

    logAmazonEvent("connection_created", { businessId: consumed.businessId })
    logAmazonEvent("oauth_completed", { businessId: consumed.businessId })

    settingsUrl.searchParams.set("amazon", "connected")
    return NextResponse.redirect(settingsUrl)
  } catch (error: any) {
    logAmazonEvent("oauth_failed", { businessId: consumed.businessId, reason: error?.message })
    settingsUrl.searchParams.set("amazon", "error")
    return NextResponse.redirect(settingsUrl)
  }
}
