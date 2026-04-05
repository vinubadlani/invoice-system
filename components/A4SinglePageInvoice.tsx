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
        <div className="invoice-page bg-white border border-gray-300 print:border-0 text-[11px] leading-tight font-sans">

          {/* ── HEADER ── */}
          <div className="flex border-b border-gray-400">
            {/* Left: company */}
            <div className="flex-1 p-4 border-r border-gray-400">
              {/* Logo placeholder circle */}
              <div className="flex items-start gap-3 mb-2">
                <div className="w-14 h-14 rounded-full border-2 border-gray-400 flex items-center justify-center shrink-0 overflow-hidden bg-gray-50">
                  <span className="text-[8px] text-center leading-tight text-gray-500 font-bold px-1">{b.name.slice(0, 6).toUpperCase()}</span>
                </div>
                <div>
                  <div className="text-[15px] font-bold text-gray-900 leading-tight">{b.name}</div>
                  <div className="text-gray-600 mt-0.5">{b.address}</div>
                  {(b.city || b.state) && (
                    <div className="text-gray-600">{[b.city, b.state, b.pincode].filter(Boolean).join(", ")}</div>
                  )}
                </div>
              </div>
              {b.phone && <div className="text-gray-700"><span className="font-semibold">Mobile :</span> {b.phone}</div>}
              {b.email && <div className="text-gray-700"><span className="font-semibold">Email :</span> {b.email}</div>}
              {b.gstin && <div className="text-gray-700"><span className="font-semibold">GSTIN :</span> {b.gstin}</div>}
              {b.pan   && <div className="text-gray-700"><span className="font-semibold">PAN Number :</span> {b.pan}</div>}
              {b.category && <div className="text-gray-700 mt-0.5">{b.category}</div>}
            </div>

            {/* Right: invoice meta */}
            <div className="w-56 p-4 flex flex-col justify-between">
              <div>
                <div className="text-[16px] font-bold text-gray-900 text-center mb-0.5">TAX INVOICE</div>
                <div className="text-center text-gray-500 text-[9px] tracking-wide mb-3">ORIGINAL FOR RECIPIENT</div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Invoice No.</span>
                  <span className="font-semibold">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Date</span>
                  <span className="font-semibold">
                    {new Date(invoice.invoice_date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "/")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── BILL TO / SHIP TO ── */}
          <div className="flex border-b border-gray-400">
            <div className="flex-1 p-3 border-r border-gray-400">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">BILL TO</div>
              <div className="font-bold text-gray-900 text-[12px]">{p.name}</div>
              <div className="text-gray-700">{p.address}</div>
              {p.mobile  && <div className="text-gray-700">Mobile : {p.mobile}</div>}
              {p.gstin   && <div className="text-gray-700">GSTIN : {p.gstin}</div>}
              {p.state   && <div className="text-gray-700">Place of Supply : {p.state}</div>}
            </div>
            <div className="flex-1 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">SHIP TO</div>
              <div className="font-bold text-gray-900 text-[12px]">{p.name}</div>
              <div className="text-gray-700">{p.address}</div>
              {p.mobile  && <div className="text-gray-700">Mobile : {p.mobile}</div>}
              {p.gstin   && <div className="text-gray-700">GSTIN : {p.gstin}</div>}
              {p.state   && <div className="text-gray-700">Place of Supply : {p.state}</div>}
            </div>
          </div>

          {/* ── ITEMS TABLE ── */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-400 bg-gray-50">
                <th className="border-r border-gray-300 px-2 py-1.5 text-left w-8">S.NO.</th>
                <th className="border-r border-gray-300 px-2 py-1.5 text-left">ITEMS</th>
                <th className="border-r border-gray-300 px-2 py-1.5 text-center w-16">HSN</th>
                <th className="border-r border-gray-300 px-2 py-1.5 text-center w-16">QTY.</th>
                <th className="border-r border-gray-300 px-2 py-1.5 text-right w-20">RATE</th>
                <th className="border-r border-gray-300 px-2 py-1.5 text-center w-20">TAX</th>
                <th className="px-2 py-1.5 text-right w-24">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const base = item.quantity * item.rate;
                const tax  = item.gst_amount || (base * item.gst_percent) / 100;
                const total = item.total_amount || base + tax;
                return (
                  <tr key={item.id || i} className="border-b border-gray-200">
                    <td className="border-r border-gray-200 px-2 py-1.5 text-center">{i + 1}</td>
                    <td className="border-r border-gray-200 px-2 py-1.5">{item.item_name}</td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-center">{item.hsn_code || "-"}</td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-center">{item.quantity} {item.unit || "PCS"}</td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-right">{fmt(item.rate)}</td>
                    <td className="border-r border-gray-200 px-2 py-1.5 text-center">{item.gst_percent}%<br/><span className="text-gray-500">(₹{fmt(tax)})</span></td>
                    <td className="px-2 py-1.5 text-right font-medium">{fmt(total)}</td>
                  </tr>
                );
              })}
              {/* empty filler rows */}
              {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
                <tr key={`e${i}`} className="border-b border-gray-100">
                  <td className="border-r border-gray-100 px-2 py-2">&nbsp;</td>
                  <td className="border-r border-gray-100 px-2 py-2">&nbsp;</td>
                  <td className="border-r border-gray-100 px-2 py-2">&nbsp;</td>
                  <td className="border-r border-gray-100 px-2 py-2">&nbsp;</td>
                  <td className="border-r border-gray-100 px-2 py-2">&nbsp;</td>
                  <td className="border-r border-gray-100 px-2 py-2">&nbsp;</td>
                  <td className="px-2 py-2">&nbsp;</td>
                </tr>
              ))}
              {/* subtotal row */}
              <tr className="border-t border-gray-400 bg-gray-50 font-semibold">
                <td colSpan={5} className="border-r border-gray-300 px-2 py-1.5 text-center tracking-wide">SUBTOTAL</td>
                <td className="border-r border-gray-300 px-2 py-1.5 text-center">{items.length}</td>
                <td className="px-2 py-1.5 text-right">₹ {fmt(subtotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── BOTTOM SECTION ── */}
          <div className="flex border-t border-gray-400">

            {/* Left col: bank + terms */}
            <div className="flex-1 border-r border-gray-400 flex flex-col">
              {(b.bank_name || b.account_no || b.ifsc_code) && (
                <div className="p-3 border-b border-gray-300">
                  <div className="font-bold text-gray-900 mb-1 uppercase text-[9px] tracking-wider">BANK DETAILS</div>
                  {b.bank_name   && <div><span className="font-semibold">Name :</span> {b.bank_name}</div>}
                  {b.ifsc_code   && <div><span className="font-semibold">IFSC Code :</span> {b.ifsc_code}</div>}
                  {b.account_no  && <div><span className="font-semibold">Account No :</span> {b.account_no}</div>}
                  {b.branch      && <div><span className="font-semibold">Bank :</span> {b.branch}</div>}
                </div>
              )}
              <div className="p-3 flex-1">
                <div className="font-bold text-gray-900 mb-1 uppercase text-[9px] tracking-wider">TERMS AND CONDITIONS</div>
                {termsLines.map((line, i) => (
                  <div key={i} className="text-gray-700">{i + 1}. {line}</div>
                ))}
              </div>
            </div>

            {/* Right col: tax summary + signature */}
            <div className="w-64 flex flex-col">
              <div className="p-3 border-b border-gray-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxable Amount</span>
                  <span className="font-semibold">₹ {fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST @{gstRate / 2}%</span>
                  <span className="font-semibold">₹ {fmt(halfTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST @{gstRate / 2}%</span>
                  <span className="font-semibold">₹ {fmt(halfTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Round Off</span>
                  <span className="font-semibold">₹ {fmt(roundOff)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-1 font-bold text-[12px]">
                  <span>Total Amount</span>
                  <span>₹ {fmt(netTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Received Amount</span>
                  <span className="font-semibold">₹ {fmt(invoice.payment_received || 0)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Balance</span>
                  <span>₹ {fmt(invoice.balance_due || 0)}</span>
                </div>
              </div>

              <div className="p-3 border-b border-gray-300">
                <div className="text-gray-500 text-[9px] mb-0.5">Total Amount (in words)</div>
                <div className="font-semibold text-gray-800">{numberToWords(Math.round(netTotal))}</div>
              </div>

              {/* Signature */}
              <div className="p-3 flex flex-col items-end justify-end flex-1 min-h-[70px]">
                <div className="text-right">
                  <div className="h-8 mb-1">{/* signature space */}</div>
                  <div className="border-t border-gray-500 pt-1 text-[10px] text-gray-600">
                    Authorised Signature for {b.name}
                  </div>
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
          .invoice-wrap { margin: 0 !important; padding: 0 !important; }
          .invoice-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto !important;
            border: none !important;
            font-size: 11px !important;
          }
          @page { size: A4; margin: 8mm; }
        }
        .invoice-wrap { max-width: 210mm; }
        .invoice-page { min-height: 297mm; }
      `}</style>
    </div>
  );
}


