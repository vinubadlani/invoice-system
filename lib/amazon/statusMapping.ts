// Isolated Amazon -> HisabKitab status mapping, kept in its own file so it
// can be adjusted without touching sync logic. Deliberately reuses
// HisabKitab's existing invoices.status enum (draft|sent|paid|partial|
// overdue|cancelled) rather than inventing new statuses.
//
// Amazon OrderStatus values per the (real, stable) Orders API v0 model:
// PendingAvailability | Pending | Unshipped | PartiallyShipped | Shipped |
// InvoiceUnconfirmed | Canceled | Unfulfillable. Matched case-insensitively
// since Amazon's docs are inconsistent about casing across API versions.
// Amazon has already captured payment by the time an order leaves Pending,
// so those states map to "paid" rather than a half-way HisabKitab status
// that doesn't really apply to a channel sale.
const STATUS_MAP: Record<string, string> = {
  PENDINGAVAILABILITY: "draft",
  PENDING: "draft",
  UNSHIPPED: "paid",
  PARTIALLYSHIPPED: "paid",
  SHIPPED: "paid",
  INVOICEUNCONFIRMED: "paid",
  CANCELED: "cancelled",
  CANCELLED: "cancelled",
  UNFULFILLABLE: "cancelled",
}

export function mapAmazonStatusToInvoiceStatus(amazonOrderStatus: string | null | undefined): string {
  if (!amazonOrderStatus) return "draft"
  return STATUS_MAP[amazonOrderStatus.toUpperCase()] ?? "draft"
}
