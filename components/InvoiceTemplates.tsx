"use client"

import React from 'react'

interface Business {
  id?: string | number
  name: string
  address: string
  city?: string
  state?: string
  pincode?: string
  phone: string
  email: string
  gstin?: string
  pan?: string
  terms_conditions?: string
  bank_name?: string
  account_no?: string
  ifsc_code?: string
  branch_name?: string
  upi_id?: string
}

interface InvoiceData {
  id: string
  invoice_no: string
  party_name: string
  total_tax: number
  net_total: number
  payment_received: number
  balance_due: number
  date: string
  status?: string
  items: any[]
  gstin?: string
  state: string
  address: string
  round_off?: number
  [key: string]: any
}

interface TemplateProps {
  invoice: InvoiceData
  business: Business
}

// Helper function to convert number to words
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertHundreds(n: number): string {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result;
  }

  if (num === 0) return 'Zero';
  
  let remainingAmount = Math.floor(num);
  let result = '';
  
  if (remainingAmount >= 10000000) {
    result += convertHundreds(Math.floor(remainingAmount / 10000000)) + 'Crore ';
    remainingAmount %= 10000000;
  }
  
  if (remainingAmount >= 100000) {
    result += convertHundreds(Math.floor(remainingAmount / 100000)) + 'Lakh ';
    remainingAmount %= 100000;
  }
  
  if (remainingAmount >= 1000) {
    result += convertHundreds(Math.floor(remainingAmount / 1000)) + 'Thousand ';
    remainingAmount %= 1000;
  }
  
  if (remainingAmount > 0) {
    result += convertHundreds(remainingAmount);
  }
  
  return result.trim();
}

export const ClassicTemplate: React.FC<TemplateProps> = ({ invoice, business }) => (
  <div className="bg-white p-8 print:p-6 max-w-4xl mx-auto">
    {/* Header */}
    <div className="border-b-2 border-gray-900 pb-6 mb-6">
      <div className="flex justify-between items-start">
        <div className="w-1/2">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{business.name}</h1>
          <div className="text-sm text-gray-600 space-y-1">
            <p>{business.address}</p>
            <p>{business.city}, {business.state} - {business.pincode}</p>
            <p>Phone: {business.phone} | Email: {business.email}</p>
            <p><strong>GSTIN:</strong> {business.gstin} {business.pan && <span>| <strong>PAN:</strong> {business.pan}</span>}</p>
          </div>
        </div>
        <div className="w-1/2 text-right">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">INVOICE</h2>
          <div className="text-sm space-y-1">
            <p><strong>Invoice No:</strong> {invoice.invoice_no}</p>
            <p><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString('en-IN')}</p>
            <p><strong>Due Date:</strong> {new Date(new Date(invoice.date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>

    {/* Billing Details */}
    <div className="grid grid-cols-2 gap-8 mb-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
        <div className="bg-gray-50 p-4 rounded">
          <p className="font-semibold text-lg">{invoice.party_name}</p>
          <p className="text-gray-700 mt-1">{invoice.address}</p>
          <p className="text-gray-700"><strong>GSTIN:</strong> {invoice.gstin || "N/A"}</p>
          <p className="text-gray-700"><strong>State:</strong> {invoice.state}</p>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Status:</h3>
        <div className="bg-gray-50 p-4 rounded">
          <div className="flex justify-between mb-2">
            <span>Status:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
              invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
              invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {invoice.status?.toUpperCase() || 'PENDING'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Balance Due:</span>
            <span className="font-semibold">₹{Number(invoice.balance_due || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    {/* Items Table */}
    <div className="mb-8">
      <table className="w-full border-collapse border border-gray-400">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-4 py-3 text-left">S.No</th>
            <th className="border border-gray-400 px-4 py-3 text-left">Description</th>
            <th className="border border-gray-400 px-4 py-3 text-center">HSN</th>
            <th className="border border-gray-400 px-4 py-3 text-center">Qty</th>
            <th className="border border-gray-400 px-4 py-3 text-right">Rate</th>
            <th className="border border-gray-400 px-4 py-3 text-right">Amount</th>
            <th className="border border-gray-400 px-4 py-3 text-center">GST%</th>
            <th className="border border-gray-400 px-4 py-3 text-right">Tax</th>
            <th className="border border-gray-400 px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item, index) => (
            <tr key={item.id || index}>
              <td className="border border-gray-400 px-4 py-3">{index + 1}</td>
              <td className="border border-gray-400 px-4 py-3">{item.item_name || item.itemName || item.name || 'Item'}</td>
              <td className="border border-gray-400 px-4 py-3 text-center">{item.hsn_code || item.hsn || 'N/A'}</td>
              <td className="border border-gray-400 px-4 py-3 text-center">{item.quantity || item.qty || 1}</td>
              <td className="border border-gray-400 px-4 py-3 text-right">₹{Number(item.rate || 0).toFixed(2)}</td>
              <td className="border border-gray-400 px-4 py-3 text-right">₹{(Number(item.quantity || item.qty || 0) * Number(item.rate || 0)).toFixed(2)}</td>
              <td className="border border-gray-400 px-4 py-3 text-center">{item.gst_percent || item.gstPercent || 0}%</td>
              <td className="border border-gray-400 px-4 py-3 text-right">₹{Number(item.tax_amount || item.taxAmount || 0).toFixed(2)}</td>
              <td className="border border-gray-400 px-4 py-3 text-right font-semibold">₹{Number(item.total || (Number(item.quantity || item.qty || 0) * Number(item.rate || 0)) + Number(item.tax_amount || item.taxAmount || 0)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Summary */}
    <div className="grid grid-cols-2 gap-8 mb-8">
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Payment Terms:</h3>
        <p className="text-sm text-gray-600 mb-4">Payment due within 30 days from invoice date</p>
        
        <h3 className="font-semibold text-gray-900 mb-3">Bank Details:</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Bank:</strong> {business.bank_name || "State Bank of India"}</p>
          <p><strong>Account No:</strong> {business.account_no || "1234567890"}</p>
          <p><strong>IFSC Code:</strong> {business.ifsc_code || "SBIN0001234"}</p>
          <p><strong>Branch:</strong> {business.branch_name || "Main Branch"}</p>
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{Number((invoice.net_total || 0) - (invoice.total_tax || 0)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax Total:</span>
            <span>₹{Number(invoice.total_tax || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Round Off:</span>
            <span>₹{Number(invoice.round_off || 0).toFixed(2)}</span>
          </div>
          <hr className="border-gray-300" />
          <div className="flex justify-between text-xl font-bold">
            <span>Net Total:</span>
            <span>₹{Number(invoice.net_total || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Paid:</span>
            <span>₹{Number(invoice.payment_received || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-red-600 font-semibold">
            <span>Balance Due:</span>
            <span>₹{Number(invoice.balance_due || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    {/* Amount in Words */}
    <div className="mb-6">
      <p className="text-sm"><strong>Amount in Words:</strong> {numberToWords(invoice.net_total)} Rupees Only</p>
    </div>

    {/* Footer */}
    <div className="border-t border-gray-300 pt-6">
      <div className="flex justify-between">
        <div className="w-1/2">
          <h4 className="font-semibold text-gray-900 mb-2">Terms & Conditions:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            {business.terms_conditions ? (
              <p>{business.terms_conditions}</p>
            ) : (
              <>
                <p>1. Goods once sold will not be taken back or exchanged</p>
                <p>2. Interest @ 18% per annum will be charged on overdue amounts</p>
                <p>3. All disputes are subject to local jurisdiction only</p>
                <p>4. Payment to be made by cheque/DD in favour of {business.name}</p>
              </>
            )}
          </div>
        </div>
        <div className="w-1/2 text-right">
          <div className="mt-8">
            <p className="text-sm font-medium mb-1">For {business.name}</p>
            <div className="h-16 w-40 border-b border-gray-400 mb-2 ml-auto"></div>
            <p className="text-xs text-gray-600">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>

    {/* Footer Note */}
    <div className="mt-6 pt-4 border-t border-gray-200 text-center">
      <p className="text-xs text-gray-500">
        This is a computer generated invoice and does not require physical signature.
      </p>
    </div>
  </div>
)

export const ModernTemplate: React.FC<TemplateProps> = ({ invoice, business }) => (
  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 print:p-6 max-w-4xl mx-auto">
    {/* Modern Header with Gradient */}
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{business.name}</h1>
          <div className="text-blue-100 text-sm space-y-1">
            <p>{business.address}</p>
            <p>{business.city}, {business.state} - {business.pincode}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-light tracking-wide">INVOICE</h2>
          <p className="text-blue-100 text-lg font-semibold">{invoice.invoice_no}</p>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-b-lg shadow-lg p-6">
      {/* Contact & Invoice Info */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Contact</h3>
          <div className="text-sm space-y-1">
            <p>{business.phone}</p>
            <p>{business.email}</p>
            <p>GSTIN: {business.gstin}</p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Bill To</h3>
          <div className="text-sm">
            <p className="font-semibold text-gray-900">{invoice.party_name}</p>
            <p className="text-gray-600">{invoice.address}</p>
            <p className="text-gray-600">{invoice.state}</p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Invoice Details</h3>
          <div className="text-sm space-y-1">
            <p>Date: {new Date(invoice.date).toLocaleDateString('en-IN')}</p>
            <p>Due: {new Date(new Date(invoice.date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</p>
            <p className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
              invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {invoice.status?.toUpperCase() || 'PENDING'}
            </p>
          </div>
        </div>
      </div>

      {/* Modern Items Table */}
      <div className="mb-8">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.item_name || item.itemName || item.name || 'Item'}</p>
                      <p className="text-xs text-gray-500">HSN: {item.hsn_code || item.hsn || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-900">{item.quantity || item.qty || 1}</td>
                  <td className="px-4 py-4 text-right text-sm text-gray-900">₹{Number(item.rate || 0).toFixed(2)}</td>
                  <td className="px-4 py-4 text-right text-sm text-gray-900">₹{Number(item.tax_amount || item.taxAmount || 0).toFixed(2)}</td>
                  <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">₹{Number(item.total || (Number(item.quantity || item.qty || 0) * Number(item.rate || 0)) + Number(item.tax_amount || item.taxAmount || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Summary */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₹{Number((invoice.net_total || 0) - (invoice.total_tax || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>₹{Number(invoice.total_tax || 0).toFixed(2)}</span>
              </div>
              <hr className="border-gray-300" />
              <div className="flex justify-between text-lg font-bold text-blue-600">
                <span>Total:</span>
                <span>₹{Number(invoice.net_total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Paid:</span>
                <span>₹{Number(invoice.payment_received || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-red-600">
                <span>Balance Due:</span>
                <span>₹{Number(invoice.balance_due || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6 text-center">
        <p className="text-sm text-gray-600 mb-2">
          <strong>Amount in Words:</strong> {numberToWords(invoice.net_total)} Rupees Only
        </p>
        <p className="text-xs text-gray-500">
          Thank you for your business! This invoice was generated automatically.
        </p>
      </div>
    </div>
  </div>
)

export const ReceiptTemplate: React.FC<TemplateProps> = ({ invoice, business }) => (
  <div className="bg-white max-w-md mx-auto p-4 font-mono text-sm print:max-w-none print:w-80mm">
    {/* Receipt Header */}
    <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
      <h1 className="text-lg font-bold">{business.name}</h1>
      <p className="text-xs">{business.address}</p>
      <p className="text-xs">{business.city}, {business.state}</p>
      <p className="text-xs">Ph: {business.phone}</p>
      <p className="text-xs">GSTIN: {business.gstin}</p>
    </div>

    {/* Receipt Info */}
    <div className="space-y-1 mb-3 text-xs">
      <div className="flex justify-between">
        <span>Receipt No:</span>
        <span>{invoice.invoice_no}</span>
      </div>
      <div className="flex justify-between">
        <span>Date:</span>
        <span>{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
      </div>
      <div className="flex justify-between">
        <span>Customer:</span>
        <span>{invoice.party_name}</span>
      </div>
    </div>

    <div className="border-b border-dashed border-gray-400 mb-3"></div>

    {/* Items */}
    <div className="space-y-1 mb-3">
      {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item, index) => (
        <div key={item.id || index} className="text-xs">
          <div className="flex justify-between">
            <span className="truncate pr-2">{item.item_name || item.itemName || item.name || 'Item'}</span>
            <span>₹{Number(item.total || (Number(item.quantity || item.qty || 0) * Number(item.rate || 0)) + Number(item.tax_amount || item.taxAmount || 0)).toFixed(2)}</span>
          </div>
          <div className="text-gray-600 ml-2">
            {item.quantity || item.qty || 1} x ₹{Number(item.rate || 0).toFixed(2)}
          </div>
        </div>
      ))}
    </div>

    <div className="border-b border-dashed border-gray-400 mb-3"></div>

    {/* Totals */}
    <div className="space-y-1 text-xs">
      <div className="flex justify-between">
        <span>Subtotal:</span>
        <span>₹{Number((invoice.net_total || 0) - (invoice.total_tax || 0)).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Tax:</span>
        <span>₹{Number(invoice.total_tax || 0).toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>TOTAL:</span>
        <span>₹{Number(invoice.net_total || 0).toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-green-600">
        <span>Paid:</span>
        <span>₹{Number(invoice.payment_received || 0).toFixed(2)}</span>
      </div>
      {Number(invoice.balance_due || 0) > 0 && (
        <div className="flex justify-between text-red-600 font-bold">
          <span>Balance:</span>
          <span>₹{Number(invoice.balance_due || 0).toFixed(2)}</span>
        </div>
      )}
    </div>

    <div className="border-b border-dashed border-gray-400 my-3"></div>

    {/* Footer */}
    <div className="text-center text-xs space-y-1">
      <p>Thank you for your business!</p>
      <p>Visit again</p>
      {business.terms_conditions && (
        <p className="text-gray-600">{business.terms_conditions}</p>
      )}
    </div>
  </div>
)

export const ThermalReceiptTemplate: React.FC<TemplateProps> = ({ invoice, business }) => (
  <div className="bg-white max-w-xs mx-auto p-2 font-mono text-xs print:max-w-none print:w-80mm">
    {/* Thermal Receipt Header */}
    <div className="text-center mb-2">
      <h1 className="text-sm font-bold uppercase">{business.name}</h1>
      <div className="text-xs leading-tight">
        <p>{business.address}</p>
        <p>{business.city}, {business.state}</p>
        <p>Ph: {business.phone}</p>
        <p>GSTIN: {business.gstin}</p>
      </div>
    </div>

    <div className="text-center mb-2">{'='.repeat(32)}</div>

    {/* Receipt Details */}
    <div className="mb-2">
      <p>Receipt: {invoice.invoice_no}</p>
      <p>Date: {new Date(invoice.date).toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', {hour12: false})}</p>
      <p>Customer: {invoice.party_name.substring(0, 20)}</p>
    </div>

    <div className="text-center mb-2">{'-'.repeat(32)}</div>

    {/* Items */}
    <div className="mb-2">
      {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item, index) => (
        <div key={item.id || index} className="mb-1">
          <div className="flex justify-between">
            <span className="truncate pr-1">{(item.item_name || item.itemName || item.name || 'Item').substring(0, 18)}</span>
            <span>{Number(item.total || (Number(item.quantity || item.qty || 0) * Number(item.rate || 0)) + Number(item.tax_amount || item.taxAmount || 0)).toFixed(2)}</span>
          </div>
          <div className="text-gray-600">
            {item.quantity || item.qty || 1} x {Number(item.rate || 0).toFixed(2)}
          </div>
        </div>
      ))}
    </div>

    <div className="text-center mb-2">{'-'.repeat(32)}</div>

    {/* Totals */}
    <div className="mb-2">
      <div className="flex justify-between">
        <span>Subtotal:</span>
        <span>{Number((invoice.net_total || 0) - (invoice.total_tax || 0)).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Tax:</span>
        <span>{Number(invoice.total_tax || 0).toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-bold text-lg">
        <span>TOTAL:</span>
        <span>{Number(invoice.net_total || 0).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Paid:</span>
        <span>{Number(invoice.payment_received || 0).toFixed(2)}</span>
      </div>
      {Number(invoice.balance_due || 0) > 0 && (
        <div className="flex justify-between font-bold">
          <span>Balance:</span>
          <span>{Number(invoice.balance_due || 0).toFixed(2)}</span>
        </div>
      )}
    </div>

    <div className="text-center mb-2">{'='.repeat(32)}</div>

    {/* Footer */}
    <div className="text-center">
      <p className="font-bold">THANK YOU!</p>
      <p>Visit Again</p>
    </div>
  </div>
)

export const CorporateTemplate: React.FC<TemplateProps> = ({ invoice, business }) => (
  <div className="bg-white p-8 print:p-6 max-w-4xl mx-auto">
    {/* Corporate Header */}
    <div className="border-l-8 border-indigo-600 pl-6 mb-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-light text-gray-800 mb-2">{business.name}</h1>
          <div className="text-gray-600 space-y-1">
            <p>{business.address}</p>
            <p>{business.city}, {business.state} - {business.pincode}</p>
            <p>Phone: {business.phone} | Email: {business.email}</p>
            <p>GSTIN: {business.gstin}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-indigo-600 text-white px-6 py-3 rounded">
            <h2 className="text-xl font-semibold">INVOICE</h2>
          </div>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{invoice.invoice_no}</p>
        </div>
      </div>
    </div>

    {/* Corporate Info Grid */}
    <div className="grid grid-cols-2 gap-8 mb-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-1">Bill To</h3>
        <div className="space-y-2">
          <p className="text-xl font-semibold text-gray-900">{invoice.party_name}</p>
          <p className="text-gray-600">{invoice.address}</p>
          <p className="text-gray-600">{invoice.state}</p>
          {invoice.gstin && <p className="text-gray-600">GSTIN: {invoice.gstin}</p>}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-1">Invoice Details</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Invoice Date:</span>
            <span className="font-semibold">{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Due Date:</span>
            <span className="font-semibold">{new Date(new Date(invoice.date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Terms:</span>
            <span className="font-semibold">Net 30</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={`font-semibold ${
              invoice.status === 'paid' ? 'text-green-600' :
              invoice.status === 'partial' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {invoice.status?.toUpperCase() || 'PENDING'}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Corporate Items Table */}
    <div className="mb-8">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-700 px-4 py-3 text-left">Description</th>
            <th className="border border-gray-700 px-4 py-3 text-center">Qty</th>
            <th className="border border-gray-700 px-4 py-3 text-right">Rate</th>
            <th className="border border-gray-700 px-4 py-3 text-right">Tax</th>
            <th className="border border-gray-700 px-4 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item, index) => (
            <tr key={item.id || index} className="even:bg-gray-50">
              <td className="border border-gray-300 px-4 py-3">
                <div>
                  <p className="font-semibold">{item.item_name || item.itemName || item.name || 'Item'}</p>
                  <p className="text-sm text-gray-600">HSN: {item.hsn_code || item.hsn || 'N/A'}</p>
                </div>
              </td>
              <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity || item.qty || 1}</td>
              <td className="border border-gray-300 px-4 py-3 text-right">₹{Number(item.rate || 0).toFixed(2)}</td>
              <td className="border border-gray-300 px-4 py-3 text-right">₹{Number(item.tax_amount || item.taxAmount || 0).toFixed(2)}</td>
              <td className="border border-gray-300 px-4 py-3 text-right font-semibold">₹{Number(item.total || (Number(item.quantity || item.qty || 0) * Number(item.rate || 0)) + Number(item.tax_amount || item.taxAmount || 0)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Corporate Summary */}
    <div className="flex justify-end mb-8">
      <div className="w-96">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="text-right py-2 pr-4 text-gray-600">Subtotal:</td>
              <td className="text-right py-2 font-semibold">₹{Number((invoice.net_total || 0) - (invoice.total_tax || 0)).toFixed(2)}</td>
            </tr>
            <tr>
              <td className="text-right py-2 pr-4 text-gray-600">Tax:</td>
              <td className="text-right py-2 font-semibold">₹{Number(invoice.total_tax || 0).toFixed(2)}</td>
            </tr>
            <tr className="border-t-2 border-gray-800">
              <td className="text-right py-3 pr-4 text-lg font-bold">Total:</td>
              <td className="text-right py-3 text-xl font-bold text-indigo-600">₹{Number(invoice.net_total || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td className="text-right py-2 pr-4 text-green-600">Amount Paid:</td>
              <td className="text-right py-2 font-semibold text-green-600">₹{Number(invoice.payment_received || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td className="text-right py-2 pr-4 text-red-600 font-bold">Balance Due:</td>
              <td className="text-right py-2 font-bold text-red-600">₹{Number(invoice.balance_due || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Corporate Footer */}
    <div className="border-t-2 border-gray-300 pt-6">
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">Payment Information</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Bank:</strong> {business.bank_name || 'Bank Name'}</p>
            <p><strong>Account:</strong> {business.account_no || 'Account Number'}</p>
            <p><strong>IFSC:</strong> {business.ifsc_code || 'IFSC Code'}</p>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">Terms & Conditions</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Payment is due within 30 days</p>
            <p>• Late payments may incur charges</p>
            <p>• Goods once sold cannot be returned</p>
          </div>
        </div>
      </div>
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          <strong>Amount in Words:</strong> {numberToWords(invoice.net_total)} Rupees Only
        </p>
        <div className="mt-4 text-right">
          <p className="text-sm text-gray-600">Authorized Signatory</p>
          <div className="border-b border-gray-400 w-48 mt-8 ml-auto"></div>
          <p className="text-sm text-gray-600 mt-2">{business.name}</p>
        </div>
      </div>
    </div>
  </div>
)

export const ShippingLabelTemplate: React.FC<TemplateProps> = ({ invoice, business }) => (
  <div className="bg-white p-6 print:p-4 max-w-4xl mx-auto border-2 border-black">
    {/* Shipping Label Header */}
    <div className="text-center border-b-2 border-black pb-4 mb-6">
      <h1 className="text-3xl font-bold">SHIPPING LABEL</h1>
      <p className="text-lg font-semibold">Order #{invoice.invoice_no}</p>
    </div>

    <div className="grid grid-cols-2 gap-8 mb-8">
      {/* From Section */}
      <div className="border-2 border-gray-800 p-4">
        <h2 className="text-xl font-bold bg-gray-800 text-white p-2 -m-4 mb-4">FROM</h2>
        <div className="space-y-2">
          <p className="text-lg font-bold">{business.name}</p>
          <p>{business.address}</p>
          <p>{business.city}, {business.state} - {business.pincode}</p>
          <p>Phone: {business.phone}</p>
          <p>Email: {business.email}</p>
        </div>
      </div>

      {/* To Section */}
      <div className="border-2 border-gray-800 p-4">
        <h2 className="text-xl font-bold bg-gray-800 text-white p-2 -m-4 mb-4">TO</h2>
        <div className="space-y-2">
          <p className="text-lg font-bold">{invoice.party_name}</p>
          <p>{invoice.address}</p>
          <p>{invoice.state}</p>
          {invoice.phone && <p>Phone: {invoice.phone}</p>}
        </div>
      </div>
    </div>

    {/* Shipping Details */}
    <div className="grid grid-cols-3 gap-6 mb-8">
      <div className="border border-gray-400 p-3">
        <h3 className="font-bold text-sm mb-2">SHIP DATE</h3>
        <p className="text-lg font-semibold">{new Date(invoice.date).toLocaleDateString('en-IN')}</p>
      </div>
      <div className="border border-gray-400 p-3">
        <h3 className="font-bold text-sm mb-2">SERVICE TYPE</h3>
        <p className="text-lg font-semibold">Standard Delivery</p>
      </div>
      <div className="border border-gray-400 p-3">
        <h3 className="font-bold text-sm mb-2">WEIGHT</h3>
        <p className="text-lg font-semibold">
          {invoice.items && Array.isArray(invoice.items) 
            ? `${invoice.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)} kg`
            : '1 kg'
          }
        </p>
      </div>
    </div>

    {/* Package Contents */}
    <div className="border-2 border-gray-400 p-4 mb-8">
      <h3 className="text-lg font-bold mb-3">PACKAGE CONTENTS</h3>
      <div className="space-y-2">
        {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item, index) => (
          <div key={item.id || index} className="flex justify-between border-b border-gray-200 pb-1">
            <span>{item.item_name || item.itemName || item.name || 'Item'}</span>
            <span>Qty: {item.quantity || item.qty || 1}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Barcode Area */}
    <div className="text-center border-2 border-black p-6">
      <div className="text-4xl font-mono tracking-widest mb-2">||||| ||||| ||||| |||||</div>
      <p className="text-lg font-bold">TRACKING: SHP{invoice.invoice_no}{new Date().getFullYear()}</p>
    </div>

    {/* Instructions */}
    <div className="mt-6 text-sm">
      <p><strong>Handling Instructions:</strong> Handle with care. This side up.</p>
      <p><strong>Delivery Instructions:</strong> Signature required upon delivery.</p>
    </div>
  </div>
)

export const DeliveryNoteTemplate: React.FC<TemplateProps> = ({ invoice, business }) => (
  <div className="bg-white p-8 print:p-6 max-w-4xl mx-auto">
    {/* Delivery Note Header */}
    <div className="border-b-4 border-blue-600 pb-6 mb-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{business.name}</h1>
          <div className="text-gray-600 mt-2">
            <p>{business.address}</p>
            <p>{business.city}, {business.state} - {business.pincode}</p>
            <p>Phone: {business.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-blue-600">DELIVERY NOTE</h2>
          <p className="text-lg font-semibold text-gray-700">DN-{invoice.invoice_no}</p>
          <p className="text-sm text-gray-600">Ref: {invoice.invoice_no}</p>
        </div>
      </div>
    </div>

    {/* Delivery Information */}
    <div className="grid grid-cols-2 gap-8 mb-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Deliver To:</h3>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-lg font-semibold text-gray-900">{invoice.party_name}</p>
          <p className="text-gray-700">{invoice.address}</p>
          <p className="text-gray-700">{invoice.state}</p>
          {invoice.phone && <p className="text-gray-700">Phone: {invoice.phone}</p>}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Delivery Details:</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery Date:</span>
            <span className="font-semibold">{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery Time:</span>
            <span className="font-semibold">10:00 AM - 6:00 PM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Vehicle No:</span>
            <span className="font-semibold">MH-12-AB-1234</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Driver:</span>
            <span className="font-semibold">Delivery Person</span>
          </div>
        </div>
      </div>
    </div>

    {/* Items to Deliver */}
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Items to Deliver:</h3>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item Description</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Quantity</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Unit</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.item_name || item.itemName || item.name || 'Item'}</p>
                    <p className="text-sm text-gray-600">HSN: {item.hsn_code || item.hsn || 'N/A'}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-semibold">{item.quantity || item.qty || 1}</td>
                <td className="px-4 py-3 text-center">Piece</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block w-6 h-6 border-2 border-gray-400 rounded"></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Delivery Instructions */}
    <div className="grid grid-cols-2 gap-8 mb-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Delivery Instructions:</h3>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <ul className="text-sm space-y-1">
            <li>• Check items for damage before accepting</li>
            <li>• Verify quantity matches delivery note</li>
            <li>• Sign only after inspection</li>
            <li>• Keep copy for your records</li>
          </ul>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Special Notes:</h3>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <p className="text-sm">Handle with care. Fragile items included.</p>
          <p className="text-sm mt-2">Contact: {business.phone} for any queries.</p>
        </div>
      </div>
    </div>

    {/* Signatures */}
    <div className="border-t-2 border-gray-300 pt-6">
      <div className="grid grid-cols-3 gap-8 text-center">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-8">Prepared By</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-600">Signature & Date</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-8">Delivered By</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-600">Driver Signature & Date</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-8">Received By</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-600">Customer Signature & Date</p>
        </div>
      </div>
    </div>
  </div>
)

export const QuotationTemplate: React.FC<TemplateProps> = ({ invoice, business }) => (
  <div className="bg-white p-8 print:p-6 max-w-4xl mx-auto">
    {/* Quotation Header */}
    <div className="border-b-4 border-green-600 pb-6 mb-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{business.name}</h1>
          <div className="text-gray-600 mt-2 space-y-1">
            <p>{business.address}</p>
            <p>{business.city}, {business.state} - {business.pincode}</p>
            <p>Phone: {business.phone} | Email: {business.email}</p>
            <p>GSTIN: {business.gstin}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg">
            <h2 className="text-2xl font-bold">QUOTATION</h2>
          </div>
          <p className="text-xl font-bold text-green-600 mt-2">QT-{invoice.invoice_no}</p>
          <p className="text-sm text-gray-600">Valid for 30 days</p>
        </div>
      </div>
    </div>

    {/* Quotation Information */}
    <div className="grid grid-cols-2 gap-8 mb-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-green-300 pb-1">Quote For:</h3>
        <div className="space-y-2">
          <p className="text-xl font-semibold text-gray-900">{invoice.party_name}</p>
          <p className="text-gray-600">{invoice.address}</p>
          <p className="text-gray-600">{invoice.state}</p>
          {invoice.gstin && <p className="text-gray-600">GSTIN: {invoice.gstin}</p>}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-green-300 pb-1">Quotation Details:</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Quote Date:</span>
            <span className="font-semibold">{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Valid Until:</span>
            <span className="font-semibold">{new Date(new Date(invoice.date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery Time:</span>
            <span className="font-semibold">7-10 working days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Terms:</span>
            <span className="font-semibold">50% advance</span>
          </div>
        </div>
      </div>
    </div>

    {/* Quotation Items */}
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Quotation Details:</h3>
      <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-green-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Qty</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tax</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{item.item_name || item.itemName || item.name || 'Item'}</p>
                    <p className="text-sm text-gray-600">HSN: {item.hsn_code || item.hsn || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">Premium quality product with warranty</p>
                  </div>
                </td>
                <td className="px-4 py-4 text-center font-semibold">{item.quantity || item.qty || 1}</td>
                <td className="px-4 py-4 text-right font-semibold">₹{Number(item.rate || 0).toFixed(2)}</td>
                <td className="px-4 py-4 text-right">₹{Number(item.tax_amount || item.taxAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-4 text-right font-bold text-green-600">₹{Number(item.total || (Number(item.quantity || item.qty || 0) * Number(item.rate || 0)) + Number(item.tax_amount || item.taxAmount || 0)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Quotation Summary */}
    <div className="flex justify-end mb-8">
      <div className="w-96">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Quotation Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">₹{Number((invoice.net_total || 0) - (invoice.total_tax || 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax (GST):</span>
              <span className="font-semibold">₹{Number(invoice.total_tax || 0).toFixed(2)}</span>
            </div>
            <hr className="border-green-300" />
            <div className="flex justify-between text-xl font-bold text-green-600">
              <span>Total Quoted Price:</span>
              <span>₹{Number(invoice.net_total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Terms and Conditions */}
    <div className="grid grid-cols-2 gap-8 mb-8">
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Terms & Conditions:</h4>
        <div className="bg-gray-50 p-4 rounded border-l-4 border-green-500">
          <ul className="text-sm space-y-2 text-gray-700">
            <li>• This quotation is valid for 30 days from the date of issue</li>
            <li>• 50% advance payment required to confirm order</li>
            <li>• Delivery within 7-10 working days after order confirmation</li>
            <li>• Prices are inclusive of GST as applicable</li>
            <li>• Installation and transportation charges extra if applicable</li>
            <li>• Any changes in specification may affect the quoted price</li>
          </ul>
        </div>
      </div>
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Payment Details:</h4>
        <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
          <div className="text-sm space-y-2">
            <p><strong>Bank Name:</strong> {business.bank_name || 'Bank Name'}</p>
            <p><strong>Account Number:</strong> {business.account_no || 'Account Number'}</p>
            <p><strong>IFSC Code:</strong> {business.ifsc_code || 'IFSC Code'}</p>
            <p><strong>UPI ID:</strong> {business.upi_id || 'UPI ID'}</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> Please share payment confirmation for faster processing
          </p>
        </div>
      </div>
    </div>

    {/* Call to Action */}
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-8">
      <div className="text-center">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">Ready to proceed?</h4>
        <p className="text-gray-600 mb-4">Contact us to confirm your order or for any clarifications</p>
        <div className="flex justify-center space-x-6 text-sm">
          <p><strong>Phone:</strong> {business.phone}</p>
          <p><strong>Email:</strong> {business.email}</p>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="border-t-2 border-gray-300 pt-6">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          <strong>Amount in Words:</strong> {numberToWords(invoice.net_total)} Rupees Only
        </p>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-600">Thank you for considering our services!</p>
            <p className="text-xs text-gray-500 mt-1">This is a computer generated quotation</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-8">Authorized Signatory</p>
            <div className="border-b border-gray-400 w-48"></div>
            <p className="text-sm text-gray-600 mt-2">{business.name}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export const ElegantTemplate: React.FC<TemplateProps> = ({ invoice, business }) => (
  <div className="bg-white p-8 print:p-6 max-w-4xl mx-auto">
    {/* Elegant Header with Gold Accent */}
    <div className="border-b-2 border-amber-300 pb-8 mb-8 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300"></div>
      
      <div className="flex justify-between items-start mt-4">
        <div className="flex-1">
          <h1 className="text-4xl font-serif text-gray-800 mb-3">{business.name}</h1>
          <div className="text-gray-600 space-y-1 text-sm">
            <p className="font-medium">{business.address}</p>
            <p>{business.city}, {business.state} - {business.pincode}</p>
            <div className="flex space-x-6 mt-3">
              <p><span className="font-medium">Phone:</span> {business.phone}</p>
              <p><span className="font-medium">Email:</span> {business.email}</p>
            </div>
            <p><span className="font-medium">GSTIN:</span> {business.gstin}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="inline-block border-2 border-amber-300 px-6 py-3 rounded-lg bg-amber-50">
            <h2 className="text-2xl font-serif font-bold text-amber-800">INVOICE</h2>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xl font-bold text-gray-800">{invoice.invoice_no}</p>
            <p className="text-sm text-gray-600">Date: {new Date(invoice.date).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>

    {/* Client Information Section */}
    <div className="grid grid-cols-2 gap-12 mb-8">
      <div>
        <h3 className="text-lg font-serif font-bold text-gray-800 mb-4 border-b border-amber-200 pb-2">
          Billed To
        </h3>
        <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-amber-300">
          <p className="text-xl font-semibold text-gray-900 mb-2">{invoice.party_name}</p>
          <div className="text-gray-700 space-y-1">
            <p>{invoice.address}</p>
            <p>{invoice.state}</p>
            {invoice.phone && <p><span className="font-medium">Phone:</span> {invoice.phone}</p>}
            {invoice.gstin && <p><span className="font-medium">GSTIN:</span> {invoice.gstin}</p>}
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-serif font-bold text-gray-800 mb-4 border-b border-amber-200 pb-2">
          Invoice Information
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-600 font-medium">Invoice Date:</span>
            <span className="font-semibold">{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-600 font-medium">Due Date:</span>
            <span className="font-semibold">{new Date(new Date(invoice.date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-600 font-medium">Payment Terms:</span>
            <span className="font-semibold">Net 30 days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Status:</span>
            <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
              invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {invoice.status?.toUpperCase() || 'PENDING'}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Elegant Items Table */}
    <div className="mb-8">
      <h3 className="text-lg font-serif font-bold text-gray-800 mb-4 border-b border-amber-200 pb-2">
        Invoice Details
      </h3>
      <div className="overflow-hidden rounded-lg border border-amber-200 shadow-sm">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-amber-50 to-amber-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-serif font-bold text-gray-700 border-b border-amber-200">
                Description
              </th>
              <th className="px-6 py-4 text-center text-sm font-serif font-bold text-gray-700 border-b border-amber-200">
                Quantity
              </th>
              <th className="px-6 py-4 text-right text-sm font-serif font-bold text-gray-700 border-b border-amber-200">
                Unit Price
              </th>
              <th className="px-6 py-4 text-right text-sm font-serif font-bold text-gray-700 border-b border-amber-200">
                Tax Amount
              </th>
              <th className="px-6 py-4 text-right text-sm font-serif font-bold text-gray-700 border-b border-amber-200">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item, index) => (
              <tr key={item.id || index} className="border-b border-gray-100 hover:bg-amber-25">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-gray-900">{item.item_name || item.itemName || item.name || 'Item'}</p>
                    <p className="text-sm text-gray-600 italic">HSN: {item.hsn_code || item.hsn || 'N/A'}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-medium">{item.quantity || item.qty || 1}</td>
                <td className="px-6 py-4 text-right font-medium">₹{Number(item.rate || 0).toFixed(2)}</td>
                <td className="px-6 py-4 text-right font-medium">₹{Number(item.tax_amount || item.taxAmount || 0).toFixed(2)}</td>
                <td className="px-6 py-4 text-right font-bold text-amber-800">₹{Number(item.total || (Number(item.quantity || item.qty || 0) * Number(item.rate || 0)) + Number(item.tax_amount || item.taxAmount || 0)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Elegant Summary Section */}
    <div className="flex justify-end mb-8">
      <div className="w-96">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-lg p-6">
          <h4 className="text-lg font-serif font-bold text-gray-800 mb-4 text-center">Invoice Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-amber-300 pb-2">
              <span className="text-gray-700 font-medium">Subtotal:</span>
              <span className="font-semibold">₹{Number((invoice.net_total || 0) - (invoice.total_tax || 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-amber-300 pb-2">
              <span className="text-gray-700 font-medium">Total Tax:</span>
              <span className="font-semibold">₹{Number(invoice.total_tax || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-amber-800 border-t-2 border-amber-400 pt-3">
              <span>Grand Total:</span>
              <span>₹{Number(invoice.net_total || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span className="font-medium">Amount Paid:</span>
              <span className="font-semibold">₹{Number(invoice.payment_received || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-700 font-bold text-lg">
              <span>Balance Due:</span>
              <span>₹{Number(invoice.balance_due || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Payment Information & Terms */}
    <div className="grid grid-cols-2 gap-8 mb-8">
      <div>
        <h4 className="font-serif font-bold text-gray-800 mb-3 border-b border-amber-200 pb-1">
          Payment Information
        </h4>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="text-sm space-y-2">
            <p><span className="font-semibold">Bank Name:</span> {business.bank_name || 'Bank Name'}</p>
            <p><span className="font-semibold">Account Number:</span> {business.account_no || 'Account Number'}</p>
            <p><span className="font-semibold">IFSC Code:</span> {business.ifsc_code || 'IFSC Code'}</p>
            <p><span className="font-semibold">Branch:</span> {business.branch_name || 'Branch Name'}</p>
            {business.upi_id && <p><span className="font-semibold">UPI ID:</span> {business.upi_id}</p>}
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="font-serif font-bold text-gray-800 mb-3 border-b border-amber-200 pb-1">
          Terms & Conditions
        </h4>
        <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
          <div className="text-sm space-y-2 text-gray-700">
            <p>• Payment is due within 30 days of invoice date</p>
            <p>• Late payment charges may apply after due date</p>
            <p>• All goods sold are not returnable</p>
            <p>• This invoice is computer generated and valid without signature</p>
            {business.terms_conditions && (
              <p>• {business.terms_conditions}</p>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Amount in Words */}
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
      <p className="text-center text-gray-700">
        <span className="font-serif font-bold">Amount in Words:</span> {numberToWords(invoice.net_total)} Rupees Only
      </p>
    </div>

    {/* Elegant Footer */}
    <div className="border-t-2 border-amber-300 pt-6">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm text-gray-600 font-medium">Thank you for your business!</p>
          <p className="text-xs text-gray-500 mt-1">We appreciate your trust in our services</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 mb-12 font-medium">Authorized Signatory</p>
          <div className="border-b-2 border-amber-300 w-56 mb-3"></div>
          <p className="text-sm font-serif font-bold text-gray-800">{business.name}</p>
          <p className="text-xs text-gray-600">Digitally Generated Invoice</p>
        </div>
      </div>
    </div>
  </div>
)

export const ProfessionalA4Template: React.FC<TemplateProps> = ({ invoice, business }) => (
  <div className="bg-white p-0 print:p-0 max-w-none mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
    {/* A4 Professional Invoice Template */}
    <div className="p-8 print:p-6">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-blue-600 pb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">{business.name}</h1>
          <div className="text-gray-700 text-sm space-y-1">
            <p className="font-medium">{business.address}</p>
            <p>{business.city}, {business.state} - {business.pincode}</p>
            <div className="flex gap-6 mt-2">
              <p><span className="font-semibold">Mobile:</span> {business.phone}</p>
              <p><span className="font-semibold">Email:</span> {business.email}</p>
            </div>
            <p><span className="font-semibold">GSTIN:</span> {business.gstin}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="bg-blue-600 text-white px-6 py-3 rounded-lg">
            <h2 className="text-xl font-bold">TAX INVOICE</h2>
          </div>
          <div className="mt-3 text-right">
            <p className="text-lg font-bold text-blue-600">{invoice.invoice_no}</p>
            <p className="text-sm text-gray-600">Date: {new Date(invoice.date).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Bill To Section */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
            BILL TO:
          </h3>
          <div className="border border-gray-300 p-4 rounded bg-gray-50">
            <p className="text-lg font-bold text-gray-900 mb-1">{invoice.party_name}</p>
            <p className="text-gray-700 text-sm">{invoice.address}</p>
            <p className="text-gray-700 text-sm">{invoice.state}</p>
            {invoice.gstin && (
              <p className="text-gray-700 text-sm mt-2">
                <span className="font-semibold">GSTIN:</span> {invoice.gstin}
              </p>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
            INVOICE DETAILS:
          </h3>
          <div className="border border-gray-300 p-4 rounded bg-gray-50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Date:</span>
                <span className="font-semibold">{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-semibold">{new Date(new Date(invoice.date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Place of Supply:</span>
                <span className="font-semibold">{invoice.state}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-blue-50">
              <th className="border border-gray-400 px-3 py-3 text-left text-xs font-bold text-gray-700" style={{width: '5%'}}>
                Sr.
              </th>
              <th className="border border-gray-400 px-3 py-3 text-left text-xs font-bold text-gray-700" style={{width: '35%'}}>
                Description of Goods
              </th>
              <th className="border border-gray-400 px-3 py-3 text-center text-xs font-bold text-gray-700" style={{width: '8%'}}>
                HSN
              </th>
              <th className="border border-gray-400 px-3 py-3 text-center text-xs font-bold text-gray-700" style={{width: '8%'}}>
                Qty
              </th>
              <th className="border border-gray-400 px-3 py-3 text-right text-xs font-bold text-gray-700" style={{width: '12%'}}>
                Rate
              </th>
              <th className="border border-gray-400 px-3 py-3 text-right text-xs font-bold text-gray-700" style={{width: '12%'}}>
                Amount
              </th>
              <th className="border border-gray-400 px-3 py-3 text-center text-xs font-bold text-gray-700" style={{width: '8%'}}>
                GST%
              </th>
              <th className="border border-gray-400 px-3 py-3 text-right text-xs font-bold text-gray-700" style={{width: '12%'}}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item, index) => (
              <tr key={item.id || index}>
                <td className="border border-gray-400 px-3 py-2 text-center text-sm">
                  {index + 1}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-sm">
                  {item.item_name || item.itemName || item.name || 'Item'}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-center text-sm">
                  {item.hsn_code || item.hsn || 'N/A'}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-center text-sm">
                  {item.quantity || item.qty || 1}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm">
                  ₹{Number(item.rate || 0).toFixed(2)}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm">
                  ₹{(Number(item.quantity || item.qty || 0) * Number(item.rate || 0)).toFixed(2)}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-center text-sm">
                  {item.gst_percent || item.gstPercent || 0}%
                </td>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">
                  ₹{Number(item.total || (Number(item.quantity || item.qty || 0) * Number(item.rate || 0)) + Number(item.tax_amount || item.taxAmount || 0)).toFixed(2)}
                </td>
              </tr>
            ))}
            
            {/* Add empty rows to fill space if needed */}
            {invoice.items && invoice.items.length < 10 && Array.from({ length: 10 - invoice.items.length }).map((_, index) => (
              <tr key={`empty-${index}`}>
                <td className="border border-gray-400 px-3 py-2 text-center text-sm">&nbsp;</td>
                <td className="border border-gray-400 px-3 py-2 text-sm">&nbsp;</td>
                <td className="border border-gray-400 px-3 py-2 text-center text-sm">&nbsp;</td>
                <td className="border border-gray-400 px-3 py-2 text-center text-sm">&nbsp;</td>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm">&nbsp;</td>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm">&nbsp;</td>
                <td className="border border-gray-400 px-3 py-2 text-center text-sm">&nbsp;</td>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h4 className="text-sm font-bold text-gray-800 mb-3">Amount in Words:</h4>
          <div className="border border-gray-300 p-3 bg-gray-50 rounded">
            <p className="text-sm font-semibold text-gray-800">
              {numberToWords(invoice.net_total)} Rupees Only
            </p>
          </div>
          
          <h4 className="text-sm font-bold text-gray-800 mb-3 mt-4">Bank Details:</h4>
          <div className="border border-gray-300 p-3 bg-gray-50 rounded text-xs">
            <div className="space-y-1">
              <p><span className="font-semibold">Bank Name:</span> {business.bank_name || "State Bank of India"}</p>
              <p><span className="font-semibold">A/c No:</span> {business.account_no || "1234567890"}</p>
              <p><span className="font-semibold">IFSC:</span> {business.ifsc_code || "SBIN0001234"}</p>
              <p><span className="font-semibold">Branch:</span> {business.branch_name || "Main Branch"}</p>
            </div>
          </div>
        </div>
        
        <div>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold bg-gray-50">
                  Taxable Amount:
                </td>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">
                  ₹{Number((invoice.net_total || 0) - (invoice.total_tax || 0)).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold bg-gray-50">
                  CGST:
                </td>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">
                  ₹{Number((invoice.total_tax || 0) / 2).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold bg-gray-50">
                  SGST:
                </td>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">
                  ₹{Number((invoice.total_tax || 0) / 2).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold bg-gray-50">
                  Round Off:
                </td>
                <td className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">
                  ₹{Number(invoice.round_off || 0).toFixed(2)}
                </td>
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-400 px-3 py-3 text-right text-sm font-bold">
                  Total Amount:
                </td>
                <td className="border border-gray-400 px-3 py-3 text-right text-lg font-bold text-blue-600">
                  ₹{Number(invoice.net_total || 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Terms and Signature */}
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div>
          <h4 className="text-sm font-bold text-gray-800 mb-2">Terms & Conditions:</h4>
          <div className="text-xs space-y-1 text-gray-700">
            {business.terms_conditions ? (
              <p>{business.terms_conditions}</p>
            ) : (
              <>
                <p>1. Goods once sold will not be taken back</p>
                <p>2. Interest @ 18% per annum will be charged on overdue amounts</p>
                <p>3. Subject to {business.city || 'Local'} Jurisdiction</p>
                <p>4. Our responsibility ceases as soon as the goods leave our premises</p>
                <p>5. Delivery at buyers risk</p>
              </>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="mt-4">
            <p className="text-sm font-bold text-gray-800 mb-1">For {business.name}</p>
            <div className="mt-12 mb-2">
              <div className="w-40 border-b border-gray-400 ml-auto"></div>
            </div>
            <p className="text-xs text-gray-600">Authorised Signatory</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-500">
          This is a Computer Generated Invoice
        </p>
      </div>
    </div>

    {/* Print Styles */}
    <style jsx>{`
      @media print {
        @page { 
          size: A4; 
          margin: 0.5in;
        }
        body { 
          print-color-adjust: exact; 
          -webkit-print-color-adjust: exact; 
        }
        .no-print { 
          display: none !important; 
        }
      }
    `}</style>
  </div>
)

// Template mapping for easy access
export const TEMPLATE_COMPONENTS = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  corporate: CorporateTemplate,
  elegant: ElegantTemplate,
  'professional-a4': ProfessionalA4Template,
  receipt: ReceiptTemplate,
  'thermal-receipt': ThermalReceiptTemplate,
  'shipping-label': ShippingLabelTemplate,
  'delivery-note': DeliveryNoteTemplate,
  quotation: QuotationTemplate
} as const

export type TemplateType = keyof typeof TEMPLATE_COMPONENTS
