import { NextResponse } from "next/server"
import { getAuthenticatedUserFromRequest, verifyBusinessOwnership } from "@/lib/amazon/authenticatedUser"
import { getSupabaseAdminClient } from "@/lib/supabase-admin"
import { importRawAmazonData } from "@/lib/amazon/rawImportService"

// Give this route as much runtime as the plan allows — a fetch call does
// a full extra Amazon round trip per order (list page + /orderItems each)
// and still might not finish one page cap within the platform default.
export const maxDuration = 60

// "Fetch from Amazon" button on the E-commerce page. Unlike
// /api/integrations/amazon/sync, this never creates invoices or SKU
// mappings — it only pulls orders/items/inventory into the amazon_raw_*
// staging tables for read-only display. Pass `resumeToken` (the previous
// response's `nextToken`) to continue where the last call's page cap
// stopped, rather than restarting the backfill window from scratch.
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { businessId, connectionId, resumeToken } = body ?? {}
    if (!businessId || !connectionId) {
      return NextResponse.json({ error: "businessId and connectionId are required" }, { status: 400 })
    }

    const owns = await verifyBusinessOwnership(businessId, user.id)
    if (!owns) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

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

    const summary = await importRawAmazonData(connectionId, businessId, resumeToken || undefined)
    return NextResponse.json({ success: true, ...summary })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Amazon import failed" }, { status: 500 })
  }
}
