/**
 * GST calculation — implemented correctly per the product spec (CGST+SGST for
 * intra-state, IGST for inter-state, never both; GST can be switched off
 * entirely). The web app currently only has a MANUAL 3-way toggle with no
 * automatic state comparison, and its two invoice renderers are inconsistent
 * with each other on how they split/label CGST vs IGST (one mislabels a true
 * inter-state invoice as half-CGST/half-IGST). This module is the single
 * correct implementation for the mobile app — do not port either web
 * renderer's split logic.
 */
import { InvoiceLineItem } from '../lib/types';

export type TaxMode = 'intra' | 'inter';

/** Business state vs party state decides CGST+SGST vs IGST. Comparison is
 * case-insensitive and trims whitespace since free-text state fields vary. */
export function suggestTaxMode(businessState: string, partyState: string): TaxMode {
  const normalize = (s: string) => s.trim().toLowerCase();
  return normalize(businessState) === normalize(partyState) ? 'intra' : 'inter';
}

export interface LineItemInput {
  rate: number;
  quantity: number;
  gstPercent: number;
}

export interface LineItemTax {
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
}

/** Per-line tax amount is the same total regardless of intra/inter — only the
 * CGST/SGST vs IGST split at invoice level differs (computed in computeInvoiceTotals). */
export function computeLineItemTax(input: LineItemInput, gstEnabled: boolean): LineItemTax {
  const taxableAmount = input.rate * input.quantity;
  const gstAmount = gstEnabled ? (taxableAmount * input.gstPercent) / 100 : 0;
  return {
    taxableAmount,
    gstAmount,
    totalAmount: taxableAmount + gstAmount,
  };
}

export interface InvoiceTotalsInput {
  lineItems: InvoiceLineItem[];
  gstEnabled: boolean;
  taxMode: TaxMode;
  discountAmount?: number;
  discountPercent?: number;
  otherCharges?: number;
  roundOff?: number;
  paymentReceived?: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  totalTax: number;
  cgst: number;
  sgst: number;
  igst: number;
  otherCharges: number;
  roundOff: number;
  netTotal: number;
  paymentReceived: number;
  balanceDue: number;
}

/** Aggregates line items into invoice-level totals with a correct CGST/SGST/IGST
 * split. SGST and IGST are never both non-zero — this is enforced by construction. */
export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const subtotal = input.lineItems.reduce((sum, li) => sum + li.rate * li.quantity, 0);

  const percentDiscount = input.discountPercent ? (subtotal * input.discountPercent) / 100 : 0;
  const discountAmount = input.discountAmount ?? percentDiscount;

  const taxableAmount = Math.max(subtotal - discountAmount, 0);

  // Re-derive tax proportionally against the discounted taxable base per line,
  // since discount is applied at invoice level but GST rates are per-line.
  const discountRatio = subtotal > 0 ? taxableAmount / subtotal : 0;
  const totalTax = input.gstEnabled
    ? input.lineItems.reduce((sum, li) => sum + ((li.rate * li.quantity * discountRatio) * li.gst_percent) / 100, 0)
    : 0;

  const cgst = input.gstEnabled && input.taxMode === 'intra' ? totalTax / 2 : 0;
  const sgst = input.gstEnabled && input.taxMode === 'intra' ? totalTax / 2 : 0;
  const igst = input.gstEnabled && input.taxMode === 'inter' ? totalTax : 0;

  const otherCharges = input.otherCharges ?? 0;
  const roundOff = input.roundOff ?? 0;
  const netTotal = taxableAmount + totalTax + otherCharges + roundOff;
  const paymentReceived = input.paymentReceived ?? 0;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    totalTax,
    cgst,
    sgst,
    igst,
    otherCharges,
    roundOff,
    netTotal,
    paymentReceived,
    balanceDue: netTotal - paymentReceived,
  };
}

/** Rounds to the nearest rupee and returns the round-off adjustment (can be negative). */
export function computeRoundOff(amount: number): number {
  return Math.round(amount) - amount;
}
