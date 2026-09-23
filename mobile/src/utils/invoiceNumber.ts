/**
 * Invoice numbering — ported from the web app's scheme (app/sales-entry,
 * app/purchase-entry). There is no DB sequence or unique constraint on
 * invoice_no; numbers are client-generated and only checked for duplicates
 * against invoices already loaded for the business. Keeping the same scheme
 * here (rather than inventing a server-side sequence) keeps numbering
 * consistent between web and mobile without a schema change.
 */
import { Invoice, InvoiceType } from '../lib/types';

export function generateInvoiceNumber(type: InvoiceType): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = String(Date.now()).slice(-6);

  return type === 'sales' ? `INV-${year}${month}${day}-${timestamp}` : `PUR-${timestamp}`;
}

/** Client-side dedupe against already-loaded invoices for this business — same
 * limitation as web (not atomic/server-verified), so a collision is still
 * possible across concurrent devices. Surface the error and let the user edit
 * the number rather than silently overwriting an existing invoice. */
export function findDuplicateInvoiceNumber<T extends Pick<Invoice, 'id' | 'invoice_no'>>(
  invoiceNo: string,
  existing: T[],
  excludeId?: string,
): T | undefined {
  const target = invoiceNo.trim().toLowerCase();
  return existing.find((inv) => inv.invoice_no.trim().toLowerCase() === target && inv.id !== excludeId);
}
