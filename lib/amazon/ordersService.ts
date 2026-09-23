import { getSupabaseAdminClient } from "@/lib/supabase-admin"
import { getConnectionWithRefreshToken, recordSyncOutcome, AmazonConnectionRow } from "./connectionService"
import { refreshAccessToken } from "./lwaClient"
import { callSpApi } from "./spApiClient"
import { getSpApiBaseUrl } from "./config"
import { mapAmazonStatusToInvoiceStatus } from "./statusMapping"
import { logAmazonEvent } from "./logger"

// Orders API v0 — GET /orders/v0/orders (list) and
// GET /orders/v0/orders/{orderId}/orderItems (line items). This is the only
// version of the Orders API SP-API exposes; a prior "2026-01-01" path here
// was hitting a route that doesn't exist (confirmed via the sandbox's
// InvalidInput/"Could not match input arguments" response) and always
// failed with 400. Responses are wrapped in a top-level "payload" object
// and fields are PascalCase — see the ORDER FIELD MAPPING comments below.
const ORDERS_API_PATH = "/orders/v0/orders"

const MAX_PAGES_PER_SYNC = 5
const MAX_ORDER_DETAIL_CALLS_PER_SYNC = 100
const INITIAL_BACKFILL_DAYS = 30

type SyncSummary = {
  imported: number
  updated: number
  unmapped: number
  errors: number
}

export async function syncOrdersForConnection(connectionId: string, businessId: string): Promise<SyncSummary> {
  const admin = getSupabaseAdminClient()
  const summary: SyncSummary = { imported: 0, updated: 0, unmapped: 0, errors: 0 }

  logAmazonEvent("order_sync_started", { businessId, connectionId })

  const connection = await getConnectionWithRefreshToken(connectionId, businessId)
  if (!connection || !connection.refreshToken) {
    logAmazonEvent("order_sync_failed", { businessId, connectionId, reason: "no_refresh_token" })
    await recordSyncOutcome(connectionId, { success: false, error: "Connection has no valid refresh token — reconnect required" })
    throw new Error("Amazon connection needs to be reconnected")
  }

  const row = connection.row as AmazonConnectionRow & { last_successful_sync_at?: string | null }

  let accessToken: string
  try {
    accessToken = await refreshAccessToken(connection.refreshToken)
  } catch (err: any) {
    logAmazonEvent("token_refresh_failed", { businessId, connectionId, reason: err?.message })
    await recordSyncOutcome(connectionId, { success: false, error: "Failed to refresh Amazon access token — reconnect may be required" })
    throw new Error("Failed to refresh Amazon access token")
  }

  const baseUrl = getSpApiBaseUrl(row.region, row.environment)
  const createdAfter =
    row.last_successful_sync_at ?? new Date(Date.now() - INITIAL_BACKFILL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  try {
    let paginationToken: string | undefined
    let page = 0
    let orderDetailCalls = 0

    do {
      const searchResult = await callSpApi<any>({
        baseUrl,
        path: ORDERS_API_PATH,
        accessToken,
        query: {
          MarketplaceIds: row.marketplace_id,
          CreatedAfter: paginationToken ? undefined : createdAfter,
          NextToken: paginationToken,
          MaxResultsPerPage: "50",
        },
      })

      // ORDER FIELD MAPPING (list orders): payload.Orders is the list of
      // order summaries, payload.NextToken the next-page cursor.
      const orderSummaries: any[] = searchResult?.payload?.Orders ?? []
      paginationToken = searchResult?.payload?.NextToken ?? undefined

      for (const summary_ of orderSummaries) {
        if (orderDetailCalls >= MAX_ORDER_DETAIL_CALLS_PER_SYNC) break
        const orderId: string | undefined = summary_?.AmazonOrderId
        if (!orderId) continue

        orderDetailCalls += 1
        try {
          // The list summary already has status/total/dates; only the line
          // items need a separate call (v0 has no "get full order" endpoint
          // that includes items — only /orderItems).
          const itemsResult = await callSpApi<any>({
            baseUrl,
            path: `${ORDERS_API_PATH}/${encodeURIComponent(orderId)}/orderItems`,
            accessToken,
          })
          const orderItems = itemsResult?.payload?.OrderItems ?? []

          const result = await syncOneOrder(admin, businessId, connectionId, row.marketplace_id, {
            ...summary_,
            OrderItems: orderItems,
          })
          if (result === "created") summary.imported += 1
          else if (result === "updated") summary.updated += 1
          if (result === "needs_mapping") summary.unmapped += 1
        } catch (err: any) {
          summary.errors += 1
          logAmazonEvent("order_sync_failed", { businessId, connectionId, amazonOrderId: orderId, reason: err?.message })
        }
      }

      page += 1
    } while (paginationToken && page < MAX_PAGES_PER_SYNC)

    await recordSyncOutcome(connectionId, { success: true })
    logAmazonEvent("order_sync_completed", { businessId, connectionId, reason: JSON.stringify(summary) })
    return summary
  } catch (err: any) {
    await recordSyncOutcome(connectionId, { success: false, error: err?.message ?? "Unknown order sync error" })
    logAmazonEvent("order_sync_failed", { businessId, connectionId, reason: err?.message })
    throw err
  }
}

// Idempotent single-order sync: upsert bookkeeping row first (unique on
// business_id+amazon_order_id is what prevents duplicate invoices across
// repeated sync runs), only create the invoice if this order hasn't been
// linked to one yet.
async function syncOneOrder(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  businessId: string,
  connectionId: string,
  marketplaceId: string,
  order: any
): Promise<"created" | "updated" | "needs_mapping"> {
  // ORDER FIELD MAPPING (Orders API v0 — order summary + /orderItems).
  const orderId: string = order.AmazonOrderId
  const fulfillmentStatus: string | undefined = order.OrderStatus
  const purchaseDate: string | undefined = order.PurchaseDate
  const totalAmount: number | undefined = order.OrderTotal?.Amount !== undefined ? Number(order.OrderTotal.Amount) : undefined
  const totalCurrency: string | undefined = order.OrderTotal?.CurrencyCode
  const orderItems: any[] = order.OrderItems ?? []

  const nowIso = new Date().toISOString()

  const { data: upserted, error: upsertError } = await admin
    .from("amazon_orders")
    .upsert(
      {
        business_id: businessId,
        amazon_connection_id: connectionId,
        amazon_order_id: orderId,
        marketplace_id: marketplaceId,
        order_status: fulfillmentStatus ?? "UNKNOWN",
        purchase_date: purchaseDate ?? null,
        order_total_amount: totalAmount ?? null,
        order_total_currency: totalCurrency ?? null,
        raw_payload: order,
        last_synced_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "business_id,amazon_order_id" }
    )
    .select("id, invoice_id")
    .single()

  if (upsertError) {
    throw new Error(`Failed to upsert amazon_orders row: ${upsertError.message}`)
  }

  if (upserted.invoice_id) {
    // Already imported in a previous sync run — refresh status only, never
    // create a second invoice for the same Amazon order.
    await admin.from("amazon_orders").update({ sync_status: "synced" }).eq("id", upserted.id)
    return "updated"
  }

  const invoiceStatus = mapAmazonStatusToInvoiceStatus(fulfillmentStatus)
  let anyUnmapped = false
  const invoiceItems: any[] = []

  for (const orderItem of orderItems) {
    // ORDER FIELD MAPPING (order item, from /orderItems): ItemPrice is the
    // line total for the quantity, not a per-unit price, so divide it out.
    const sku: string = orderItem.SellerSKU ?? `UNKNOWN-${orderItem.OrderItemId ?? ""}`
    const asin: string | null = orderItem.ASIN ?? null
    const title: string = orderItem.Title ?? sku
    const quantity: number = orderItem.QuantityOrdered ?? 1
    const lineTotal: number = orderItem.ItemPrice?.Amount !== undefined ? Number(orderItem.ItemPrice.Amount) : 0
    const unitPrice: number = quantity > 0 ? lineTotal / quantity : lineTotal

    const mapping = await findOrCreateMapping(admin, businessId, connectionId, marketplaceId, sku, asin, title)
    if (mapping.mapping_status !== "mapped") anyUnmapped = true

    invoiceItems.push({
      name: title,
      code: sku,
      item_id: mapping.item_id ?? undefined,
      quantity,
      price: unitPrice,
      amount: quantity * unitPrice,
    })
  }

  const netTotal = totalAmount ?? invoiceItems.reduce((sum, item) => sum + item.amount, 0)

  // Buyer name/shipping address require a Restricted Data Token, which
  // needs additional Amazon role approval (see plan) — until that's in
  // place we record the sale without buyer PII rather than blocking import.
  const { data: invoiceRow, error: invoiceError } = await admin
    .from("invoices")
    .insert({
      business_id: businessId,
      invoice_no: `AMZ-${orderId}`,
      date: (purchaseDate ?? nowIso).slice(0, 10),
      party_name: "Amazon Customer",
      state: "N/A (Amazon order)",
      address: "N/A (Amazon order)",
      items: invoiceItems,
      subtotal: netTotal,
      net_total: netTotal,
      type: "sales",
      status: invoiceStatus,
      payment_method: "Amazon",
      source: "amazon",
    })
    .select("id")
    .single()

  if (invoiceError) {
    throw new Error(`Failed to create invoice for Amazon order ${orderId}: ${invoiceError.message}`)
  }

  await admin
    .from("amazon_orders")
    .update({
      invoice_id: invoiceRow.id,
      sync_status: anyUnmapped ? "needs_mapping" : "synced",
      last_error: null,
    })
    .eq("id", upserted.id)

  return anyUnmapped ? "needs_mapping" : "created"
}

async function findOrCreateMapping(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  businessId: string,
  connectionId: string,
  marketplaceId: string,
  sku: string,
  asin: string | null,
  title: string
) {
  const { data: existing } = await admin
    .from("amazon_product_mappings")
    .select("*")
    .eq("business_id", businessId)
    .eq("amazon_connection_id", connectionId)
    .eq("amazon_sku", sku)
    .maybeSingle()

  if (existing) {
    if (title && title !== existing.last_seen_product_title) {
      await admin
        .from("amazon_product_mappings")
        .update({ last_seen_product_title: title, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    }
    return existing
  }

  // Best-effort exact (case-insensitive) match against items.code — mirrors
  // the existing case-insensitive matching precedent in app/upload/page.tsx.
  // Never a fuzzy match, so this can't silently attach the wrong product.
  const { data: itemMatch } = await admin
    .from("items")
    .select("id")
    .eq("business_id", businessId)
    .ilike("code", sku)
    .maybeSingle()

  const { data: created, error } = await admin
    .from("amazon_product_mappings")
    .insert({
      business_id: businessId,
      amazon_connection_id: connectionId,
      amazon_sku: sku,
      amazon_asin: asin,
      marketplace_id: marketplaceId,
      item_id: itemMatch?.id ?? null,
      mapping_status: itemMatch ? "mapped" : "unmapped",
      last_seen_product_title: title,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(`Failed to create Amazon product mapping for SKU ${sku}: ${error.message}`)
  }

  return created
}
