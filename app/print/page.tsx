"use client"

import { useState, useEffect } from "react"
import { useApp } from "../context/AppContext"
import { Printer, Download, Eye, ChevronLeft, ChevronRight } from "lucide-react"

interface Business {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  gstin: string
  pan: string
  terms_conditions: string
}

export default function PrintInvoice() {
  const { invoices } = useApp()
  const [business, setBusiness] = useState<Business | null>(null)
  const [selectedInvoiceIndex, setSelectedInvoiceIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load business data from localStorage
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      setBusiness(JSON.parse(storedBusiness))
    }
    setLoading(false)
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // This would typically use a library like jsPDF or react-pdf
    // For now, we'll use the print functionality
    window.print()
  }

  const handlePreview = () => {
    // Toggle preview mode (you can add preview state if needed)
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Printer className="h-12 w-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Invoices Available</h2>
        <p className="text-gray-500">Create an invoice first to print it</p>
      </div>
    )
  }

  const invoice = invoices[selectedInvoiceIndex]

  return (
    <div className="space-y-6">
      {/* Print Controls */}
      <div className="no-print bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Print Invoice</h1>
            {invoices.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedInvoiceIndex(Math.max(0, selectedInvoiceIndex - 1))}
                  disabled={selectedInvoiceIndex === 0}
                  className="p-1 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600">
                  {selectedInvoiceIndex + 1} of {invoices.length}
                </span>
                <button
                  onClick={() => setSelectedInvoiceIndex(Math.min(invoices.length - 1, selectedInvoiceIndex + 1))}
                  disabled={selectedInvoiceIndex === invoices.length - 1}
                  className="p-1 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              className="btn-secondary flex items-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 print:shadow-none print:border-none print:p-0">
        {/* Company Header */}
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {business?.name || "POSHAM HERBALS"}
          </h1>
          <p className="text-lg text-gray-600 mb-2">Natural Health Solutions</p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>
              {business?.address || "123 Herbal Street"}, {business?.city || "Mumbai"}, {business?.state || "Maharashtra"} - {business?.pincode || "400001"}
            </p>
            <p>
              Phone: {business?.phone || "+91 98765 43210"} | Email: {business?.email || "info@poshamherbals.com"}
            </p>
            <p>
              <strong>GSTIN:</strong> {business?.gstin || "27ABCDE1234F1Z5"}
              {business?.pan && <span> | <strong>PAN:</strong> {business.pan}</span>}
            </p>
          </div>
        </div>

        {/* Invoice Header */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 bg-gray-100 p-2 rounded">
              TAX INVOICE
            </h2>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="font-medium">Invoice No:</span>
                <span>{invoice.invoiceNo}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="font-medium">Date:</span>
                <span>{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="font-medium">Due Date:</span>
                <span>{new Date(new Date(invoice.date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="font-medium">State:</span>
                <span>{invoice.state}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-3 bg-gray-100 p-2 rounded">BILL TO:</h3>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-base">{invoice.partyName}</p>
              <p className="text-gray-700">{invoice.address}</p>
              <p className="text-gray-700">
                <span className="font-medium">GSTIN:</span> {invoice.gstin || "N/A"}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">State:</span> {invoice.state}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">S.No</th>
                <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">Description of Goods</th>
                <th className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold">HSN/SAC</th>
                <th className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold">Qty</th>
                <th className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">Rate</th>
                <th className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">Amount</th>
                <th className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">GST %</th>
                <th className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">Tax Amount</th>
                <th className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 text-sm">{index + 1}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{item.itemName}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-center">{item.hsn}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-center">{item.qty}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-right">₹{item.rate.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-right">₹{(item.qty * item.rate).toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-center">{item.gstPercent}%</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-right">₹{item.taxAmount.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-right font-semibold">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
              {/* Empty rows for better formatting */}
              {[...Array(Math.max(0, 5 - invoice.items.length))].map((_, index) => (
                <tr key={`empty-${index}`}>
                  <td className="border border-gray-300 px-3 py-2 text-sm h-8">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary and Payment Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Payment Terms:</h3>
              <p className="text-sm text-gray-600">Payment due within 30 days from invoice date</p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Bank Details:</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Bank:</span> State Bank of India</p>
                <p><span className="font-medium">Account No:</span> 1234567890</p>
                <p><span className="font-medium">IFSC Code:</span> SBIN0001234</p>
                <p><span className="font-medium">Branch:</span> Mumbai Main Branch</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Amount in Words:</h3>
              <p className="text-sm text-gray-600 font-medium">
                {numberToWords(invoice.netTotal)} Rupees Only
              </p>
            </div>
          </div>

          <div>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-bold text-gray-900 mb-3">Invoice Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{(invoice.netTotal - invoice.totalTax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Total:</span>
                  <span>₹{invoice.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Round Off:</span>
                  <span>₹{invoice.roundOff.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Net Total:</span>
                  <span>₹{invoice.netTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Paid Amount:</span>
                  <span>₹{invoice.paymentReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600 font-bold">
                  <span>Balance Due:</span>
                  <span>₹{invoice.balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Terms & Conditions:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                {business?.terms_conditions ? (
                  <p>{business.terms_conditions}</p>
                ) : (
                  <>
                    <p>1. Goods once sold will not be taken back or exchanged</p>
                    <p>2. Interest @ 18% per annum will be charged on overdue amounts</p>
                    <p>3. All disputes are subject to Mumbai jurisdiction only</p>
                    <p>4. Payment to be made by cheque/DD in favour of {business?.name || "POSHAM HERBALS"}</p>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="mt-12">
                <div className="inline-block">
                  <p className="text-sm font-medium mb-2">For {business?.name || "POSHAM HERBALS"}</p>
                  <div className="h-16 w-32 border-b border-gray-400 mb-2"></div>
                  <p className="text-xs text-gray-600">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            This is a computer generated invoice and does not require physical signature.
          </p>
        </div>
      </div>
    </div>
  )
}

// Helper function to convert number to words (basic implementation)
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
