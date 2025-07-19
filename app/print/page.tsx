"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Printer, Download, Eye, ChevronLeft, ChevronRight, Building2 } from "lucide-react"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"

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

interface BankAccount {
  id: string
  bank_name: string
  account_number: string
  ifsc_code: string
  account_type: string
  branch_name: string
  account_holder_name: string
}

interface Party {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  gstin: string
  mobile: string
  email: string
}

interface InvoiceItem {
  id: string
  item_name: string
  item_code: string
  hsn: string
  qty: number
  rate: number
  unit: string
  gst_percent: number
  tax_amount: number
  total: number
}

interface Invoice {
  id: string
  invoice_no: string
  date: string
  party_id: string
  party_name: string
  gstin: string
  state: string
  address: string
  items: InvoiceItem[]
  total_tax: number
  round_off: number
  net_total: number
  payment_received: number
  balance_due: number
  type: "sales" | "purchase"
  created_at: string
}

export default function PrintInvoice() {
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('id')
  
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [party, setParty] = useState<Party | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData(invoiceId)
    } else {
      loadLatestInvoice()
    }
  }, [invoiceId])

  const loadInvoiceData = async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch invoice data
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single()

      if (invoiceError) throw invoiceError
      setInvoice(invoiceData)

      // Fetch business data
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", invoiceData.business_id)
        .single()

      if (businessError) throw businessError
      setBusiness(businessData)

      // Fetch party data
      const { data: partyData, error: partyError } = await supabase
        .from("parties")
        .select("*")
        .eq("id", invoiceData.party_id)
        .single()

      if (partyError) throw partyError
      setParty(partyData)

      // Fetch selected bank account for invoices
      const selectedBankAccountId = localStorage.getItem("selectedBankAccountForInvoices")
      if (selectedBankAccountId) {
        const { data: bankData, error: bankError } = await supabase
          .from("bank_accounts")
          .select("*")
          .eq("id", selectedBankAccountId)
          .single()

        if (!bankError && bankData) {
          setBankAccount(bankData)
        }
      }

      // If no selected bank account, get the first active one
      if (!selectedBankAccountId) {
        const { data: bankData, error: bankError } = await supabase
          .from("bank_accounts")
          .select("*")
          .eq("business_id", invoiceData.business_id)
          .eq("is_active", true)
          .limit(1)
          .single()

        if (!bankError && bankData) {
          setBankAccount(bankData)
        }
      }

    } catch (error: any) {
      console.error("Error loading invoice data:", error)
      setError(error.message || "Failed to load invoice data")
    } finally {
      setLoading(false)
    }
  }

  const loadLatestInvoice = async () => {
    try {
      setLoading(true)
      const storedBusiness = localStorage.getItem("selectedBusiness")
      if (!storedBusiness) {
        setError("No business selected")
        return
      }

      const business = JSON.parse(storedBusiness)

      // Get latest invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("business_id", business.id)
        .eq("type", "sales")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (invoiceError) throw invoiceError
      
      await loadInvoiceData(invoiceData.id)
    } catch (error: any) {
      console.error("Error loading latest invoice:", error)
      setError("No invoices found. Please create an invoice first.")
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    window.print()
  }

  const calculateSubtotal = () => {
    if (!invoice) return 0
    return invoice.items.reduce((sum, item) => sum + (item.qty * item.rate), 0)
  }

  const getDueDateFromInvoiceDate = (invoiceDate: string) => {
    const date = new Date(invoiceDate)
    date.setDate(date.getDate() + 30) // 30 days from invoice date
    return date.toLocaleDateString('en-IN')
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (error || !invoice) {
    return (
      <AuthenticatedLayout>
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Printer className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || "Invoice Not Found"}
          </h2>
          <p className="text-gray-500">
            {error || "The requested invoice could not be found."}
          </p>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Print Controls */}
        <div className="no-print bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Building2 className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Print Invoice</h1>
                <p className="text-sm text-gray-500">Invoice #{invoice.invoice_no}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              {business?.name || "Business Name"}
            </h1>
            <p className="text-lg text-gray-600 mb-2">Invoicing & Inventory Management</p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>
                {business?.address}, {business?.city}, {business?.state} - {business?.pincode}
              </p>
              <p>
                Phone: {business?.phone} | Email: {business?.email}
              </p>
              {business?.gstin && (
                <p>
                  <strong>GSTIN:</strong> {business.gstin}
                  {business?.pan && <span> | <strong>PAN:</strong> {business.pan}</span>}
                </p>
              )}
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
                  <span>{invoice.invoice_no}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-medium">Date:</span>
                  <span>{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-medium">Due Date:</span>
                  <span>{getDueDateFromInvoiceDate(invoice.date)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-medium">State:</span>
                  <span>{party?.state || invoice.state}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3 bg-gray-100 p-2 rounded">BILL TO:</h3>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-base">{party?.name || invoice.party_name}</p>
                <p className="text-gray-700">{party?.address || invoice.address}</p>
                <p className="text-gray-700">{party?.city}, {party?.state} - {party?.pincode}</p>
                {party?.mobile && (
                  <p className="text-gray-700">
                    <span className="font-medium">Mobile:</span> {party.mobile}
                  </p>
                )}
                {party?.email && (
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span> {party.email}
                  </p>
                )}
                <p className="text-gray-700">
                  <span className="font-medium">GSTIN:</span> {party?.gstin || invoice.gstin || "N/A"}
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
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{item.item_name}</span>
                        {item.item_code && (
                          <span className="text-gray-500 text-xs block">Code: {item.item_code}</span>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">{item.hsn}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                      {item.qty} {item.unit}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right">₹{item.rate.toFixed(2)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right">₹{(item.qty * item.rate).toFixed(2)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">{item.gst_percent}%</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right">₹{item.tax_amount.toFixed(2)}</td>
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

              {/* Dynamic Bank Details */}
              {bankAccount && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Bank Details:</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Bank:</span> {bankAccount.bank_name}</p>
                    <p><span className="font-medium">Account Holder:</span> {bankAccount.account_holder_name}</p>
                    <p><span className="font-medium">Account No:</span> {bankAccount.account_number}</p>
                    <p><span className="font-medium">IFSC Code:</span> {bankAccount.ifsc_code}</p>
                    <p><span className="font-medium">Branch:</span> {bankAccount.branch_name}</p>
                    <p><span className="font-medium">Account Type:</span> {bankAccount.account_type}</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-900 mb-2">Amount in Words:</h3>
                <p className="text-sm text-gray-600 font-medium">
                  {numberToWords(invoice.net_total)} Rupees Only
                </p>
              </div>
            </div>

            <div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-bold text-gray-900 mb-3">Invoice Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Total:</span>
                    <span>₹{invoice.total_tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span>₹{invoice.round_off.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Net Total:</span>
                    <span>₹{invoice.net_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Paid Amount:</span>
                    <span>₹{invoice.payment_received.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>Balance Due:</span>
                    <span>₹{invoice.balance_due.toFixed(2)}</span>
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
                    <p className="whitespace-pre-line">{business.terms_conditions}</p>
                  ) : (
                    <>
                      <p>1. Goods once sold will not be taken back or exchanged</p>
                      <p>2. Interest @ 18% per annum will be charged on overdue amounts</p>
                      <p>3. All disputes are subject to {business?.city || "Mumbai"} jurisdiction only</p>
                      <p>4. Payment to be made by cheque/DD in favour of {business?.name}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="mt-12">
                  <div className="inline-block">
                    <p className="text-sm font-medium mb-2">For {business?.name}</p>
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
            <p className="text-xs text-gray-400 mt-1">
              Generated on: {new Date().toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
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
