import React from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Business {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin?: string;
  pan?: string;
  category?: string;
  bank_name?: string;
  account_no?: string;
  ifsc_code?: string;
  branch?: string;
  terms_conditions?: string;
}

interface Party {
  name: string;
  address: string;
  mobile?: string;
  state?: string;
  gstin?: string;
  place_of_supply?: string;
}

interface InvoiceItem {
  id: string;
  item_name: string;
  hsn_code?: string;
  quantity: number;
  unit?: string;
  rate: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
}

interface Invoice {
  invoice_number: string;
  invoice_date: string;
  business: Business;
  party: Party;
  items: InvoiceItem[];
  subtotal: number;
  round_off?: number;
  discount?: number;
  other_charges?: number;
  other_charges_label?: string;
  is_gst?: boolean;
  total_tax: number;
  net_total: number;
  payment_received: number;
  balance_due: number;
  notes?: string;
}

interface A4SinglePageInvoiceProps {
  invoice: Invoice;
  onBack?: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const toHundreds = (n: number): string => {
    let s = "";
    if (n >= 100) { s += ones[Math.floor(n / 100)] + " Hundred "; n %= 100; }
    if (n >= 20) { s += tens[Math.floor(n / 10)] + " "; n %= 10; }
    else if (n >= 10) { return s + ones[n] + " "; }
    if (n > 0) s += ones[n] + " ";
    return s;
  };

  if (num === 0) return "Zero Rupees Only";
  let r = Math.floor(num), s = "";
  if (r >= 10000000) { s += toHundreds(Math.floor(r / 10000000)) + "Crore "; r %= 10000000; }
  if (r >= 100000)   { s += toHundreds(Math.floor(r / 100000))   + "Lakh ";  r %= 100000; }
  if (r >= 1000)     { s += toHundreds(Math.floor(r / 1000))     + "Thousand "; r %= 1000; }
  if (r > 0)         { s += toHundreds(r); }
  return s.trim() + " Rupees Only";
}

export default function A4SinglePageInvoice({ invoice, onBack }: A4SinglePageInvoiceProps) {
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const subtotal = invoice.subtotal || items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const totalTax = invoice.total_tax || items.reduce((s, i) => s + i.gst_amount, 0);
  const netTotal = invoice.net_total || subtotal + totalTax;
  const halfTax = totalTax / 2;
  const gstRate = items[0]?.gst_percent ?? 0;
  const roundOff = invoice.round_off ?? 0;
  const discount = invoice.discount ?? 0;
  const otherCharges = invoice.other_charges ?? 0;
  const otherChargesLabel = invoice.other_charges_label || "Other Charges";
  const isGst = invoice.is_gst !== false;
  const b = invoice.business;
  const p = invoice.party;

  const defaultTerms = [
    "Goods once sold will not be taken back or exchanged",
    `All disputes are subject to ${b.city || b.state} jurisdiction only`,
  ];
  const termsLines = invoice.notes
    ? invoice.notes.split("\n").filter(Boolean)
    : defaultTerms;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Toolbar — hidden in print */}
      <div className="no-print bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <span className="text-base font-semibold text-gray-800">Invoice Preview</span>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
        </Button>
      </div>

      {/* A4 Page */}
      <div className="invoice-wrap mx-auto my-6 print:my-0">
        <div className="invoice-page bg-white border border-gray-400 print:border-gray-400 text-[11px] leading-tight font-sans">

          {/* ── HEADER ── */}
          <div className="flex border-b border-gray-400">
            {/* Left: logo + company info */}
            <div className="flex-1 p-4 border-r border-gray-400">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full border-2 border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
                  <span className="text-[8px] text-center leading-tight text-gray-600 font-bold px-1 uppercase">{b.name.slice(0, 6)}</span>
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-gray-900 leading-tight">{b.name}</div>
                  {b.address && <div className="text-gray-600 mt-0.5">{b.address}</div>}
                  {(b.city || b.state) && (
                    <div className="text-gray-600">{[b.city, b.state, b.pincode].filter(Boolean).join(", ")}</div>
                  )}
                  {b.phone    && <div className="text-gray-700 mt-0.5"><span className="font-semibold">Mobile :</span> {b.phone}</div>}
                  {b.email    && <div className="text-gray-700"><span className="font-semibold">Email</span> <span className="text-blue-600">{b.email}</span></div>}
                  {b.gstin    && <div className="text-gray-700"><span className="font-semibold">GSTIN :</span> {b.gstin}</div>}
                  {b.pan      && <div className="text-gray-700"><span className="font-semibold">PAN Number :</span> {b.pan}</div>}
                  {b.category && <div className="text-gray-700 mt-0.5">{b.category}</div>}
                </div>
              </div>
            </div>

            {/* Right: invoice type + meta */}
            <div className="w-56 p-4 flex flex-col">
              <div className="text-[17px] font-bold text-gray-900 mb-1">TAX INVOICE</div>
              <div className="border border-gray-400 text-center text-[9px] font-semibold text-gray-600 tracking-wider px-2 py-0.5 mb-4 self-start">
                ORIGINAL FOR RECIPIENT
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="text-blue-600 font-medium whitespace-nowrap">Invoice No.</span>
                  <span className="font-bold text-gray-900 text-right">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-blue-600 font-medium whitespace-nowrap">Invoice Date</span>
                  <span className="font-bold text-gray-900 text-right">
                    {new Date(invoice.invoice_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── BILL TO / SHIP TO ── */}
          <div className="flex border-b border-gray-400">
            <div className="flex-1 border-r border-gray-400">
              <div className="bg-gray-100 border-b border-gray-300 px-3 py-1 text-[10px] font-bold text-gray-700 uppercase tracking-wider">BILL TO</div>
              <div className="p-3">
                <div className="font-bold text-gray-900 text-[12px]">{p.name}</div>
                {p.address && <div className="text-gray-600 mt-0.5">{p.address}</div>}
                {p.mobile  && <div className="text-gray-700">Mobile : {p.mobile}</div>}
                {p.gstin   && <div className="text-gray-700">GSTIN  : {p.gstin}</div>}
                {p.state   && <div className="text-gray-700">Place of Supply : {p.state}</div>}
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-gray-100 border-b border-gray-300 px-3 py-1 text-[10px] font-bold text-gray-700 uppercase tracking-wider">SHIP TO</div>
              <div className="p-3">
                <div className="font-bold text-gray-900 text-[12px]">{p.name}</div>
                {p.address && <div className="text-gray-600 mt-0.5">{p.address}</div>}
                {p.mobile  && <div className="text-gray-700">Mobile : {p.mobile}</div>}
                {p.gstin   && <div className="text-gray-700">GSTIN  : {p.gstin}</div>}
                {p.state   && <div className="text-gray-700">Place of Supply : {p.state}</div>}
              </div>
            </div>
          </div>

          {/* ── ITEMS TABLE ── */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-400 bg-gray-100">
                <th className="border-r border-gray-300 px-2 py-1.5 text-center w-9 text-[10px] font-bold">S.NO.</th>
                <th className="border-r border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold">ITEMS</th>
                <th className="border-r border-gray-300 px-2 py-1.5 text-center w-16 text-[10px] font-bold">HSN</th>
                <th className="border-r border-gray-300 px-2 py-1.5 text-center w-16 text-[10px] font-bold">QTY.</th>
                <th className={`border-r border-gray-300 px-2 py-1.5 text-right text-[10px] font-bold ${isGst ? "w-20" : "w-28"}`}>RATE</th>
                {isGst && <th className="border-r border-gray-300 px-2 py-1.5 text-center w-20 text-[10px] font-bold">TAX</th>}
                <th className="px-2 py-1.5 text-right w-24 text-[10px] font-bold">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const base  = item.quantity * item.rate;
                const tax   = item.gst_amount || (base * item.gst_percent) / 100;
                const total = item.total_amount || base + tax;
                return (
                  <tr key={item.id || i} className="border-b border-gray-200">
                    <td className="border-r border-gray-200 px-2 py-1.5 text-center text-gray-500">{i + 1}</td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-gray-900">{item.item_name}</td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-center text-gray-600">{item.hsn_code || "-"}</td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-center text-gray-700">{item.quantity} {item.unit || "PCS"}</td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-right tabular-nums">{fmt(item.rate)}</td>
                    {isGst && (
                      <td className="border-r border-gray-200 px-2 py-1.5 text-center text-gray-600">
                        {item.gst_percent}%<br/>
                        <span className="text-gray-400 text-[9px]">({fmt(tax)})</span>
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-right font-medium tabular-nums">{fmt(isGst ? total : base)}</td>
                  </tr>
                );
              })}
              {/* filler rows */}
              {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
                <tr key={`e${i}`} className="border-b border-gray-100">
                  <td className="border-r border-gray-100 px-2 py-3" />
                  <td className="border-r border-gray-100 px-2 py-3" />
                  <td className="border-r border-gray-100 px-2 py-3" />
                  <td className="border-r border-gray-100 px-2 py-3" />
                  <td className="border-r border-gray-100 px-2 py-3" />
                  {isGst && <td className="border-r border-gray-100 px-2 py-3" />}
                  <td className="px-2 py-3" />
                </tr>
              ))}
              {/* subtotal row */}
              <tr className="border-t border-gray-400 bg-gray-50 font-semibold">
                <td colSpan={isGst ? 4 : 3} className="border-r border-gray-300 px-2 py-1.5 text-center tracking-wide text-[10px] uppercase">SUBTOTAL</td>
                <td className="border-r border-gray-300 px-2 py-1.5 text-center tabular-nums">{items.length}</td>
                {isGst && <td className="border-r border-gray-300 px-2 py-1.5 text-right tabular-nums">₹ {fmt(totalTax)}</td>}
                <td className="px-2 py-1.5 text-right tabular-nums">₹ {fmt(subtotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── BOTTOM SECTION ── */}
          <div className="flex border-t border-gray-400">

            {/* Left: bank details + terms */}
            <div className="flex-1 border-r border-gray-400 flex flex-col">
              {(b.bank_name || b.account_no || b.ifsc_code) && (
                <div className="p-3 border-b border-gray-300">
                  <div className="font-bold text-gray-900 mb-1.5 uppercase text-[10px] tracking-wider">BANK DETAILS</div>
                  <div className="space-y-0.5 text-[10px]">
                    {b.bank_name  && <div><span className="font-semibold">Name :</span> {b.bank_name}</div>}
                    {b.ifsc_code  && <div><span className="font-semibold">IFSC Code :</span> {b.ifsc_code}</div>}
                    {b.account_no && <div><span className="font-semibold">Account No :</span> {b.account_no}</div>}
                    {b.branch     && <div><span className="font-semibold">Bank :</span> {b.branch}</div>}
                  </div>
                </div>
              )}
              <div className="p-3 flex-1">
                <div className="font-bold text-gray-900 mb-1.5 uppercase text-[10px] tracking-wider">TERMS AND CONDITIONS</div>
                <div className="space-y-0.5 text-[10px] text-gray-700">
                  {termsLines.map((line, i) => (
                    <div key={i}>{i + 1}. {line}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: summary panel */}
            <div className="w-60 flex flex-col text-[10px]">
              <div className="p-3 border-b border-gray-300 space-y-1.5 flex-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxable Amount</span>
                  <span className="font-semibold tabular-nums">₹ {fmt(subtotal)}</span>
                </div>
                {isGst && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST @{gstRate / 2}%</span>
                      <span className="font-semibold tabular-nums">₹ {fmt(halfTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST @{gstRate / 2}%</span>
                      <span className="font-semibold tabular-nums">₹ {fmt(halfTax)}</span>
                    </div>
                  </>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount (-)</span>
                    <span className="font-semibold tabular-nums">-₹ {fmt(discount)}</span>
                  </div>
                )}
                {otherCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{otherChargesLabel} (+)</span>
                    <span className="font-semibold tabular-nums">₹ {fmt(otherCharges)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Round Off</span>
                  <span className="font-semibold tabular-nums">₹ {fmt(roundOff)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-1.5 font-bold text-[12px]">
                  <span>Total Amount</span>
                  <span className="tabular-nums">₹ {fmt(netTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Received Amount</span>
                  <span className="font-semibold tabular-nums">₹ {fmt(invoice.payment_received || 0)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Balance</span>
                  <span className="tabular-nums">₹ {fmt(invoice.balance_due || 0)}</span>
                </div>
              </div>

              <div className="p-3 border-b border-gray-300 bg-gray-50">
                <div className="text-gray-500 text-[9px] mb-0.5 uppercase tracking-wide">Total Amount (In words)</div>
                <div className="font-semibold text-gray-800 text-[10px] leading-snug">{numberToWords(Math.round(netTotal))}</div>
              </div>

              {/* Signature */}
              <div className="p-3 flex flex-col items-end justify-end min-h-[72px]">
                <div className="h-9 mb-1" />
                <div className="border-t border-gray-500 pt-1 text-[10px] text-gray-600 text-center w-full">
                  Authorised Signature for {b.name}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0 !important; padding: 0 !important; background: white !important; }
          html { background: white !important; }
          .invoice-wrap { margin: 0 !important; padding: 0 !important; }
          .invoice-page {
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            font-size: 11px !important;
            page-break-inside: avoid;
          }
          @page { size: A4 portrait; margin: 8mm; }
        }
        .invoice-wrap { max-width: 210mm; }
        .invoice-page {
          min-height: 297mm;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
        }
      `}</style>
    </div>
  );
}


