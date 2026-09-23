// Isolated Amazon -> HisabKitab status mapping, kept in its own file so it
// can be adjusted without touching sync logic. Deliberately reuses
// HisabKitab's existing invoices.status enum (draft|sent|paid|partial|
// overdue|cancelled) rather than inventing new statuses.
//
// Amazon fulfillment status values per the Orders API v2026-01-01 model
// (PENDING_AVAILABILITY | PENDING | UNSHIPPED | PARTIALLY_SHIPPED | SHIPPED |
// CANCELLED | UNFULFILLABLE). Amazon has already captured payment by the
// time an order leaves PENDING, so those states map to "paid" rather than a
// half-way HisabKitab status that doesn't really apply to a channel sale.
const STATUS_MAP: Record<string, string> = {
  PENDING_AVAILABILITY: "draft",
  PENDING: "draft",
  UNSHIPPED: "paid",
  PARTIALLY_SHIPPED: "paid",
  SHIPPED: "paid",
  CANCELLED: "cancelled",
  UNFULFILLABLE: "cancelled",
}

export function mapAmazonStatusToInvoiceStatus(amazonFulfillmentStatus: string | null | undefined): string {
  if (!amazonFulfillmentStatus) return "draft"
  return STATUS_MAP[amazonFulfillmentStatus] ?? "draft"
}
