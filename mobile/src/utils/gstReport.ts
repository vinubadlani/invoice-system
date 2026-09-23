import { Invoice } from '../lib/types';
import { extractGstMeta, extractLineItems } from './invoiceItems';

export interface GstReportTotals {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
}

/** Per-invoice CGST/SGST/IGST split derived correctly from each invoice's own
 * gst_type meta (never both SGST and IGST for the same invoice). */
export function computeGstReport(invoices: Invoice[]): GstReportTotals {
  let taxableAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  for (const inv of invoices) {
    const { isGst, gstType } = extractGstMeta(inv.items);
    taxableAmount += inv.subtotal - inv.discount_amount;
    if (!isGst) continue;
    if (gstType === 'cgst_igst') {
      igst += inv.total_tax;
    } else {
      cgst += inv.total_tax / 2;
      sgst += inv.total_tax / 2;
    }
  }

  return { taxableAmount, cgst, sgst, igst, totalGst: cgst + sgst + igst };
}

export interface HsnSummaryRow {
  hsn: string;
  taxableAmount: number;
  gstAmount: number;
  quantity: number;
}

export function computeHsnSummary(invoices: Invoice[]): HsnSummaryRow[] {
  const map = new Map<string, HsnSummaryRow>();
  for (const inv of invoices) {
    for (const li of extractLineItems(inv.items)) {
      const hsn = li.hsn_code?.trim() || 'Unspecified';
      const row = map.get(hsn) ?? { hsn, taxableAmount: 0, gstAmount: 0, quantity: 0 };
      row.taxableAmount += li.rate * li.quantity;
      row.gstAmount += li.gst_amount;
      row.quantity += li.quantity;
      map.set(hsn, row);
    }
  }
  return [...map.values()].sort((a, b) => b.taxableAmount - a.taxableAmount);
}
