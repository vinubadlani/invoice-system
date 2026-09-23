/**
 * Helpers for invoices.items (jsonb) — the web app stores real line items and
 * non-column metadata (GST type, payment details, terms/footer) mixed into
 * the same array, tagged with `__meta__: true`. Ported as-is since changing
 * the storage shape would be a DB-affecting decision (see project rule:
 * mobile must not change existing web-app data shapes casually).
 */
import { InvoiceItemsEntry, InvoiceItemsMeta, InvoiceLineItem } from '../lib/types';

function isMeta(entry: InvoiceItemsEntry): entry is InvoiceItemsMeta {
  return (entry as InvoiceItemsMeta).__meta__ === true;
}

export function extractLineItems(items: InvoiceItemsEntry[]): InvoiceLineItem[] {
  return items.filter((e): e is InvoiceLineItem => !isMeta(e));
}

export function extractGstMeta(items: InvoiceItemsEntry[]): { isGst: boolean; gstType: 'cgst_sgst' | 'cgst_igst' } {
  const meta = items.find((e): e is InvoiceItemsMeta => isMeta(e) && ('is_gst' in e || 'gst_type' in e));
  return {
    isGst: meta?.is_gst !== false,
    gstType: meta?.gst_type === 'cgst_igst' ? 'cgst_igst' : 'cgst_sgst',
  };
}

export function extractOtherCharges(items: InvoiceItemsEntry[]): { amount: number; label?: string } {
  const meta = items.find((e): e is InvoiceItemsMeta => isMeta(e) && 'other_charges' in e);
  return { amount: meta?.other_charges ?? 0, label: meta?.other_charges_label };
}

export function extractTerms(items: InvoiceItemsEntry[]): { terms?: string; footer?: string } {
  const termsMeta = items.find((e): e is InvoiceItemsMeta => isMeta(e) && 'invoice_terms' in e);
  const footerMeta = items.find((e): e is InvoiceItemsMeta => isMeta(e) && 'invoice_footer' in e);
  return { terms: termsMeta?.invoice_terms, footer: footerMeta?.invoice_footer };
}

export interface BuildItemsInput {
  lineItems: InvoiceLineItem[];
  isGst: boolean;
  gstType: 'cgst_sgst' | 'cgst_igst';
  otherCharges?: number;
  otherChargesLabel?: string;
  invoiceTerms?: string;
  invoiceFooter?: string;
}

export function buildInvoiceItems(input: BuildItemsInput): InvoiceItemsEntry[] {
  const entries: InvoiceItemsEntry[] = [...input.lineItems];

  if (input.otherCharges && input.otherCharges > 0) {
    entries.push({
      __meta__: true,
      other_charges: input.otherCharges,
      other_charges_label: input.otherChargesLabel,
    });
  }

  entries.push({ __meta__: true, is_gst: input.isGst, gst_type: input.isGst ? input.gstType : 'cgst_sgst' });

  if (input.invoiceTerms) entries.push({ __meta__: true, invoice_terms: input.invoiceTerms });
  if (input.invoiceFooter) entries.push({ __meta__: true, invoice_footer: input.invoiceFooter });

  return entries;
}
