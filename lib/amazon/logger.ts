// Structured logging for the Amazon integration. Every call site here is
// deliberately limited to IDs and short reasons — never pass a raw Amazon
// API response, refresh token, access token, or LWA client secret into
// `details`.

type AmazonLogEvent =
  | "oauth_started"
  | "oauth_completed"
  | "oauth_failed"
  | "connection_created"
  | "connection_disconnected"
  | "token_refresh_failed"
  | "order_sync_started"
  | "order_sync_completed"
  | "order_sync_failed"
  | "product_sync_failed"
  | "raw_import_started"
  | "raw_import_completed"
  | "raw_import_order_failed"
  | "raw_import_items_failed"
  | "raw_import_inventory_failed"

export function logAmazonEvent(
  event: AmazonLogEvent,
  context: {
    businessId?: string
    connectionId?: string
    amazonOrderId?: string
    reason?: string
  } = {}
) {
  console.log(
    JSON.stringify({
      scope: "amazon_integration",
      event,
      businessId: context.businessId,
      connectionId: context.connectionId,
      amazonOrderId: context.amazonOrderId,
      reason: context.reason,
      at: new Date().toISOString(),
    })
  )
}
