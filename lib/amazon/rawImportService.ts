import { getSupabaseAdminClient } from "@/lib/supabase-admin"
import { getConnectionWithRefreshToken } from "./connectionService"
import { refreshAccessToken } from "./lwaClient"
import { callSpApi } from "./spApiClient"
import { getSpApiBaseUrl } from "./config"
import { logAmazonEvent } from "./logger"

// Read-only import: pulls orders, order line items (SKUs), and FBA
// inventory straight from Amazon and stores them as-is in the
// amazon_raw_* tables. Deliberately never touches invoices, items, or
// amazon_product_mappings — this is for "what does Amazon actually have"
// visibility before anything is matched to the item catalog.

const ORDERS_API_PATH = "/orders/v0/orders"
const FBA_INVENTORY_PATH = "/fba/inventory/v1/summaries"

// See ordersService.ts for why these sandbox trigger values exist — the
// Orders API static sandbox only ever responds to these exact strings.
const SANDBOX_ORDERS_CREATED_AFTER_TRIGGER = "TEST_CASE_200"
const SANDBOX_MARKETPLACE_ID = "ATVPDKIKX0DER"
const SANDBOX_ORDER_ITEMS_TRIGGER_ID = "TEST_CASE_200"

// A single serverless invocation can only do so much work before hitting
// its execution timeout — each order costs a full extra, sequential
// /orderItems call (up to MAX_RESULTS_PER_PAGE of them per page, back to
// back), which is slow enough that even one 50-order page can time out.
// "Fetch all orders" is achieved by the caller looping on `nextToken`
// (see the raw-import API route and the E-commerce page) across many
// small, fast rounds — not by raising these and hoping one round finishes.
const MAX_PAGES_PER_CALL = 1
const MAX_RESULTS_PER_PAGE = "15"
// How far back the FIRST fetch (no resumeToken yet) looks. Long enough to
// cover "all orders" for a normal seller without hitting Amazon's per-call
// timeout; safe to extend further since NextToken-based paging doesn't
// depend on this once the first page is fetched.
const INITIAL_BACKFILL_DAYS = 1095 // ~3 years

export type RawImportSummary = {
  ordersFetched: number
  orderItemsFetched: number
  inventoryFetched: number
  inventoryError: string | null
  nextToken?: string
}

export async function importRawAmazonData(
  connectionId: string,
  businessId: string,
  resumeToken?: string
): Promise<RawImportSummary> {
  const admin = getSupabaseAdminClient()
  const summary: RawImportSummary = { ordersFetched: 0, orderItemsFetched: 0, inventoryFetched: 0, inventoryError: null }

  logAmazonEvent("raw_import_started", { businessId, connectionId })

  const connection = await getConnectionWithRefreshToken(connectionId, businessId)
  if (!connection || !connection.refreshToken) {
    throw new Error("Amazon connection needs to be reconnected")
  }
  const row = connection.row

  const accessToken = await refreshAccessToken(connection.refreshToken)
  const baseUrl = getSpApiBaseUrl(row.region, row.environment)
  const isSandbox = row.environment === "sandbox"
  const marketplaceId = isSandbox ? SANDBOX_MARKETPLACE_ID : row.marketplace_id

  // --- Orders + line items -------------------------------------------------
  let paginationToken: string | undefined = resumeToken
  let page = 0
  const createdAfter = new Date(Date.now() - INITIAL_BACKFILL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  do {
    const searchResult = await callSpApi<any>({
      baseUrl,
      path: ORDERS_API_PATH,
      accessToken,
      query: {
        MarketplaceIds: marketplaceId,
        // CreatedAfter and NextToken are mutually exclusive on this
        // endpoint — only send CreatedAfter on the very first page ever
        // (no token yet, whether this is the first call or a resume).
        CreatedAfter: paginationToken ? undefined : isSandbox ? SANDBOX_ORDERS_CREATED_AFTER_TRIGGER : createdAfter,
        NextToken: paginationToken,
        MaxResultsPerPage: MAX_RESULTS_PER_PAGE,
      },
    })

    const orders: any[] = searchResult?.payload?.Orders ?? []
    paginationToken = searchResult?.payload?.NextToken ?? undefined

    for (const order of orders) {
      const orderId: string | undefined = order?.AmazonOrderId
      if (!orderId) continue

      const nowIso = new Date().toISOString()
      const { error: orderError } = await admin.from("amazon_raw_orders").upsert(
        {
          business_id: businessId,
          amazon_connection_id: connectionId,
          amazon_order_id: orderId,
          marketplace_id: order.MarketplaceId ?? marketplaceId,
          order_status: order.OrderStatus ?? null,
          fulfillment_channel: order.FulfillmentChannel ?? null,
          purchase_date: order.PurchaseDate ?? null,
          order_total_amount: order.OrderTotal?.Amount !== undefined ? Number(order.OrderTotal.Amount) : null,
          order_total_currency: order.OrderTotal?.CurrencyCode ?? null,
          raw_payload: order,
          fetched_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "business_id,amazon_order_id" }
      )

      if (orderError) {
        logAmazonEvent("raw_import_order_failed", { businessId, connectionId, amazonOrderId: orderId, reason: orderError.message })
        continue
      }
      summary.ordersFetched += 1

      try {
        // In sandbox, the /orderItems trigger is independent of the (fake)
        // order id the search call returned — see ordersService.ts.
        const itemsResult = await callSpApi<any>({
          baseUrl,
          path: `${ORDERS_API_PATH}/${encodeURIComponent(isSandbox ? SANDBOX_ORDER_ITEMS_TRIGGER_ID : orderId)}/orderItems`,
          accessToken,
        })
        const items: any[] = itemsResult?.payload?.OrderItems ?? []

        for (const item of items) {
          const orderItemId: string = item.OrderItemId ?? `${orderId}-${item.SellerSKU ?? "unknown"}`
          const { error: itemError } = await admin.from("amazon_raw_order_items").upsert(
            {
              business_id: businessId,
              amazon_connection_id: connectionId,
              amazon_order_id: orderId,
              order_item_id: orderItemId,
              seller_sku: item.SellerSKU ?? null,
              asin: item.ASIN ?? null,
              title: item.Title ?? null,
              quantity_ordered: item.QuantityOrdered ?? null,
              item_price_amount: item.ItemPrice?.Amount !== undefined ? Number(item.ItemPrice.Amount) : null,
              item_price_currency: item.ItemPrice?.CurrencyCode ?? null,
              raw_payload: item,
              fetched_at: nowIso,
            },
            { onConflict: "business_id,amazon_order_id,order_item_id" }
          )
          if (!itemError) summary.orderItemsFetched += 1
        }
      } catch (err: any) {
        logAmazonEvent("raw_import_items_failed", { businessId, connectionId, amazonOrderId: orderId, reason: err?.message })
      }
    }

    page += 1
  } while (paginationToken && page < MAX_PAGES_PER_CALL)

  // Amazon had more pages than this single invocation could fetch — hand
  // the token back so the caller can immediately continue from here
  // instead of restarting from CreatedAfter (which would just re-fetch
  // the same first pages forever).
  if (paginationToken) {
    summary.nextToken = paginationToken
  }

  // --- FBA inventory (best-effort — a failure here must not lose the
  // orders/items already imported above). Only on the first call of a
  // fetch run — no point re-fetching the whole inventory snapshot on every
  // pagination continuation. -------------------------------------------
  if (!resumeToken) {
    try {
      const inventoryResult = await callSpApi<any>({
        baseUrl,
        path: FBA_INVENTORY_PATH,
        accessToken,
        query: {
          granularityType: "Marketplace",
          granularityId: marketplaceId,
          marketplaceIds: marketplaceId,
          details: "true",
        },
      })

      const summaries: any[] = inventoryResult?.payload?.inventorySummaries ?? []
      const nowIso = new Date().toISOString()

      for (const item of summaries) {
        const sku: string | undefined = item?.sellerSku
        if (!sku) continue

        const { error } = await admin.from("amazon_raw_inventory").upsert(
          {
            business_id: businessId,
            amazon_connection_id: connectionId,
            seller_sku: sku,
            asin: item.asin ?? null,
            condition: item.condition ?? null,
            marketplace_id: marketplaceId,
            total_quantity: item.totalQuantity ?? null,
            fulfillable_quantity: item.inventoryDetails?.fulfillableQuantity ?? null,
            raw_payload: item,
            fetched_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: "business_id,amazon_connection_id,seller_sku" }
        )
        if (!error) summary.inventoryFetched += 1
      }
    } catch (err: any) {
      // FBA Inventory needs the separate "Amazon Fulfillment" SP-API role and
      // only ever covers Fulfilled-by-Amazon stock, never self/merchant-
      // fulfilled listings — an empty or failed result here is expected for
      // an MFN-only seller or an app without that role, not a bug.
      summary.inventoryError = err?.message ?? "Inventory fetch failed"
      logAmazonEvent("raw_import_inventory_failed", { businessId, connectionId, reason: summary.inventoryError ?? undefined })
    }
  }

  logAmazonEvent("raw_import_completed", { businessId, connectionId, reason: JSON.stringify(summary) })
  return summary
}
