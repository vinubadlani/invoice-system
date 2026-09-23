import { NextResponse } from "next/server"
import { getAuthenticatedUserFromRequest, verifyBusinessOwnership } from "@/lib/amazon/authenticatedUser"
import { getSupabaseAdminClient } from "@/lib/supabase-admin"
import { syncOrdersForConnection } from "@/lib/amazon/ordersService"

// "Sync Now" button. Bounded (see MAX_PAGES_PER_SYNC / MAX_ORDER_DETAIL_CALLS_PER_SYNC
// in ordersService.ts) to stay inside a serverless function's timeout —
// large imports are expected to need a scheduled background job later
// (e.g. Vercel Cron calling this same syncOrdersForConnection), which this
// route is already structured to support without changing the sync logic.
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { businessId, connectionId } = body ?? {}
    if (!businessId || !connectionId) {
      return NextResponse.json({ error: "businessId and connectionId are required" }, { status: 400 })
    }

    const owns = await verifyBusinessOwnership(businessId, user.id)
    if (!owns) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Defense in depth: confirm this connection actually belongs to the
    // caller's business before syncing — a user must never be able to
    // trigger sync for another business's connection by passing its id.
    const admin = getSupabaseAdminClient()
    const { data: connection } = await admin
      .from("amazon_connections")
      .select("id")
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .maybeSingle()

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    const summary = await syncOrdersForConnection(connectionId, businessId)
    return NextResponse.json({ success: true, ...summary })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Amazon sync failed" }, { status: 500 })
  }
}
