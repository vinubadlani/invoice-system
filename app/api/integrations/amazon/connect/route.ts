import { NextResponse } from "next/server"
import { getAuthenticatedUserFromRequest, verifyBusinessOwnership } from "@/lib/amazon/authenticatedUser"
import { createOAuthState } from "@/lib/amazon/state"
import { buildAuthorizeUrl, isDraftApp, DEFAULT_MARKETPLACE_ID } from "@/lib/amazon/config"
import { logAmazonEvent } from "@/lib/amazon/logger"

// POST (not GET) because this has a side effect — it creates a state row —
// and because full-page navigations (window.location.href) can't carry an
// Authorization header. The frontend calls this with fetch() + Bearer token,
// then does window.location.href = authorizeUrl with the returned URL, which
// itself needs no auth header since it's just Amazon's own page.
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const businessId = body?.businessId
    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    }

    const owns = await verifyBusinessOwnership(businessId, user.id)
    if (!owns) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const state = await createOAuthState(businessId, user.id)
    const authorizeUrl = buildAuthorizeUrl({
      marketplaceId: DEFAULT_MARKETPLACE_ID,
      state,
      draft: isDraftApp(),
    })

    logAmazonEvent("oauth_started", { businessId })

    return NextResponse.json({ authorizeUrl })
  } catch (error: any) {
    logAmazonEvent("oauth_failed", { reason: error?.message })
    return NextResponse.json({ error: "Failed to start Amazon authorization" }, { status: 500 })
  }
}
