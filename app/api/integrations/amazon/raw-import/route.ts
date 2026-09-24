import { NextResponse } from "next/server"
import { getAuthenticatedUserFromRequest, verifyBusinessOwnership } from "@/lib/amazon/authenticatedUser"
import { getSupabaseAdminClient } from "@/lib/supabase-admin"
import { importRawAmazonData } from "@/lib/amazon/rawImportService"

// "Fetch from Amazon" button on the E-commerce page. Unlike
// /api/integrations/amazon/sync, this never creates invoices or SKU
// mappings — it only pulls orders/items/inventory into the amazon_raw_*
// staging tables for read-only display.
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

    const summary = await importRawAmazonData(connectionId, businessId)
    return NextResponse.json({ success: true, ...summary })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Amazon import failed" }, { status: 500 })
  }
}
