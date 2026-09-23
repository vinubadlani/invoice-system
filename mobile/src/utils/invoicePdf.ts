import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Business, Invoice, Party } from '../lib/types';
import { formatCurrency, formatDate } from './format';
import { extractGstMeta, extractLineItems, extractOtherCharges, extractTerms } from './invoiceItems';
import { numberToWords } from './numberToWords';

/**
 * Minimal, correct invoice HTML for expo-print — field set matches what
 * A4SinglePageInvoice.tsx needs on the web (see mobile port reference), but
 * with the CGST/SGST/IGST split done correctly by src/utils/gst.ts rather
 * than the web renderer's inconsistent 50/50 split logic.
 */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Postgres `numeric` columns come back from Supabase as strings (to avoid
 * precision loss in JSON), not JS numbers — coerce explicitly rather than
 * relying on implicit coercion, since a string like "0.00" is truthy and
 * breaks any `value ? ... : ''` guard. */
function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

export function buildInvoiceHtml(invoice: Invoice, business: Business, party?: Party): string {
  const lineItems = extractLineItems(invoice.items).map((li) => ({
    ...li,
    quantity: num(li.quantity),
    rate: num(li.rate),
    gst_percent: num(li.gst_percent),
    gst_amount: num(li.gst_amount),
    total_amount: num(li.total_amount),
  }));
  const { isGst, gstType } = extractGstMeta(invoice.items);
  const { amount: otherChargesRaw, label: otherChargesLabel } = extractOtherCharges(invoice.items);
  const { terms, footer } = extractTerms(invoice.items);
  const isInterState = gstType === 'cgst_igst';

  const subtotal = num(invoice.subtotal);
  const discountAmount = num(invoice.discount_amount);
  const totalTax = num(invoice.total_tax);
  const splitTax = totalTax / 2;
  const otherCharges = num(otherChargesRaw);
  const roundOff = num(invoice.round_off);
  const netTotal = num(invoice.net_total);
  const paymentReceived = num(invoice.payment_received);
  const balanceDue = num(invoice.balance_due);
  const docTitle = invoice.type === 'sales' ? 'TAX INVOICE' : 'PURCHASE BILL';

  const rows = lineItems
    .map(
      (li, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(li.item_name)}</td>
        <td>${escapeHtml(li.hsn_code ?? '')}</td>
        <td class="num">${li.quantity} ${escapeHtml(li.unit ?? '')}</td>
        <td class="num">${formatCurrency(li.rate)}</td>
        <td class="num">${li.gst_percent}%</td>
        <td class="num">${formatCurrency(li.gst_amount)}</td>
        <td class="num">${formatCurrency(li.total_amount)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
  <html><head><meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .muted { color: #666; }
    .row { display: flex; justify-content: space-between; margin-bottom: 16px; }
    .box { border: 1px solid #ddd; border-radius: 6px; padding: 10px; width: 48%; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
    th { background: #f5f5f5; }
    .num { text-align: right; }
    .totals { width: 260px; margin-left: auto; margin-top: 12px; }
    .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand { font-weight: bold; border-top: 1px solid #333; margin-top: 4px; padding-top: 6px; }
    .footer { margin-top: 24px; font-size: 11px; color: #555; }
  </style></head>
  <body>
    <div class="row">
      <div>
        <h1>${escapeHtml(business.name)}</h1>
        <div class="muted">${escapeHtml(business.address)}, ${escapeHtml(business.city)}, ${escapeHtml(business.state)} - ${escapeHtml(business.pincode)}</div>
        <div class="muted">${escapeHtml(business.phone)} · ${escapeHtml(business.email)}</div>
        ${business.gstin ? `<div class="muted">GSTIN: ${escapeHtml(business.gstin)}</div>` : ''}
      </div>
      <div style="text-align:right">
        <h1>${docTitle}</h1>
        <div class="muted">Invoice No: ${escapeHtml(invoice.invoice_no)}</div>
        <div class="muted">Date: ${formatDate(invoice.date)}</div>
        ${invoice.due_date ? `<div class="muted">Due: ${formatDate(invoice.due_date)}</div>` : ''}
      </div>
    </div>

    <div class="row">
      <div class="box">
        <strong>Bill To</strong><br/>
        ${escapeHtml(invoice.party_name)}<br/>
        <span class="muted">${escapeHtml(invoice.address)}</span><br/>
        <span class="muted">${escapeHtml(invoice.state)}</span>
        ${invoice.gstin ? `<br/><span class="muted">GSTIN: ${escapeHtml(invoice.gstin)}</span>` : ''}
        ${party?.mobile ? `<br/><span class="muted">Mobile: ${escapeHtml(party.mobile)}</span>` : ''}
      </div>
    </div>

    <table>
      <thead><tr>
        <th>#</th><th>Item</th><th>HSN</th><th class="num">Qty</th><th class="num">Rate</th>
        <th class="num">GST%</th><th class="num">GST Amt</th><th class="num">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
      ${discountAmount > 0 ? `<div><span>Discount</span><span>- ${formatCurrency(discountAmount)}</span></div>` : ''}
      ${isGst
        ? isInterState
          ? `<div><span>IGST</span><span>${formatCurrency(totalTax)}</span></div>`
          : `<div><span>CGST</span><span>${formatCurrency(splitTax)}</span></div><div><span>SGST</span><span>${formatCurrency(splitTax)}</span></div>`
        : `<div><span>GST</span><span>Not applicable</span></div>`
      }
      ${otherCharges > 0 ? `<div><span>${escapeHtml(otherChargesLabel ?? 'Other Charges')}</span><span>${formatCurrency(otherCharges)}</span></div>` : ''}
      ${roundOff !== 0 ? `<div><span>Round Off</span><span>${formatCurrency(roundOff)}</span></div>` : ''}
      <div class="grand"><span>Grand Total</span><span>${formatCurrency(netTotal)}</span></div>
      <div><span>Payment Received</span><span>${formatCurrency(paymentReceived)}</span></div>
      <div><span>Balance Due</span><span>${formatCurrency(balanceDue)}</span></div>
    </div>

    <div class="footer">
      <div><strong>Amount in words:</strong> ${numberToWords(netTotal)}</div>
      ${terms ? `<div style="margin-top:8px"><strong>Terms:</strong> ${escapeHtml(terms)}</div>` : business.terms_conditions ? `<div style="margin-top:8px"><strong>Terms:</strong> ${escapeHtml(business.terms_conditions)}</div>` : ''}
      ${footer ? `<div style="margin-top:8px">${escapeHtml(footer)}</div>` : ''}
    </div>
  </body></html>`;
}

export async function shareInvoicePdf(invoice: Invoice, business: Business, party?: Party): Promise<void> {
  const html = buildInvoiceHtml(invoice, business, party);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // expo-print writes into a temp directory that expo-sharing's Android
  // FileProvider config doesn't cover (especially inside Expo Go), which
  // fails with "Not allowed to read file under given URL". Copying into
  // FileSystem.cacheDirectory — which IS an allowed root — fixes it.
  const shareableUri = `${FileSystem.cacheDirectory}Invoice-${invoice.invoice_no.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  await FileSystem.copyAsync({ from: uri, to: shareableUri });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(shareableUri, { mimeType: 'application/pdf', dialogTitle: `Invoice ${invoice.invoice_no}` });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
