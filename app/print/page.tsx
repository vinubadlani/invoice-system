'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import A4SinglePageInvoice from '@/components/A4SinglePageInvoice'
import { queryBuilder, salesQueries } from '@/lib/supabase'

type RawInvoiceItem = {
  id?: string
  item_id?: string
  item_name?: string
  item_code?: string
  item?: string
  name?: string
  description?: string
  hsn?: string
  hsn_code?: string
  qty?: number
  quantity?: number
  rate?: number
  price?: number
  gst_percent?: number
  tax_percent?: number
  gst_amount?: number
  tax_amount?: number
  amount?: number
  total?: number
  total_amount?: number
}

type PrintInvoice = {
  invoice_number: string
  invoice_date: string
  business: {
    name: string
    address: string
    city: string
    state: string
    pincode: string
    phone: string
    email: string
    gstin?: string
    pan?: string
    category?: string
    bank_name?: string
    account_no?: string
    ifsc_code?: string
    branch?: string
    terms_conditions?: string
  }
  party: {
    name: string
    address: string
    mobile?: string
    state?: string
    gstin?: string
  }
  items: Array<{
    id: string
    item_name: string
    hsn_code?: string
    quantity: number
    rate: number
    gst_percent: number
    gst_amount: number
    total_amount: number
  }>
  subtotal: number
  round_off?: number
  total_tax: number
  net_total: number
  payment_received: number
  balance_due: number
  notes?: string
}

function normalizeInvoiceItems(items: RawInvoiceItem[] | null | undefined) {
  const rows = Array.isArray(items) ? items : []

  return rows.map((item, index) => {
    const quantity = Number(item.quantity ?? item.qty ?? 0)
    const rate = Number(item.rate ?? item.price ?? 0)
    const gstPercent = Number(item.gst_percent ?? item.tax_percent ?? 0)
    const baseAmount = quantity * rate
    const gstAmount = Number(item.gst_amount ?? item.tax_amount ?? ((baseAmount * gstPercent) / 100))
    const totalAmount = Number(item.total_amount ?? item.total ?? item.amount ?? (baseAmount + gstAmount))

    return {
      id: item.id || item.item_id || `item-${index + 1}`,
      item_name: item.item_name || item.item || item.name || item.description || 'Unnamed Item',
      hsn_code: item.hsn_code || item.hsn || '',
      quantity,
      rate,
      gst_percent: gstPercent,
      gst_amount: gstAmount,
      total_amount: totalAmount,
    }
  })
}

function calculateTotals(items: ReturnType<typeof normalizeInvoiceItems>) {
  return items.reduce(
    (acc, item) => {
      acc.subtotal += item.quantity * item.rate
      acc.totalTax += item.gst_amount
      acc.netTotal += item.total_amount
      return acc
    },
    { subtotal: 0, totalTax: 0, netTotal: 0 }
  )
}

export default function PrintPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const invoiceId = searchParams?.get('id') ?? ''

  const [invoice, setInvoice] = useState<PrintInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadInvoice() {
      if (!invoiceId) {
        setError('Invoice ID is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const invoiceData = await salesQueries.getInvoiceById(invoiceId)
        if (!invoiceData) {
          throw new Error('Invoice not found')
        }

        const businessRows = await queryBuilder('businesses', '*', { id: invoiceData.business_id }, { limit: 1 })
        const businessData = businessRows?.[0]
        if (!businessData) {
          throw new Error('Business details not found for this invoice')
        }

        let partyData: any = null
        if (invoiceData.party_id) {
          const partyRows = await queryBuilder(
            'parties',
            '*',
            { business_id: invoiceData.business_id, id: invoiceData.party_id },
            { limit: 1 }
          )
          partyData = partyRows?.[0] || null
        }

        const lineItems = normalizeInvoiceItems(invoiceData.items)
        const calculatedTotals = calculateTotals(lineItems)

        setInvoice({
          invoice_number: invoiceData.invoice_no || 'N/A',
          invoice_date: invoiceData.date || new Date().toISOString().split('T')[0],
          business: {
            name: businessData.name || '',
            address: businessData.address || '',
            city: businessData.city || '',
            state: businessData.state || '',
            pincode: businessData.pincode || '',
            phone: businessData.phone || '',
            email: businessData.email || '',
            gstin: businessData.gstin || '',
            pan: businessData.pan || '',
            category: businessData.category || '',
            bank_name: businessData.bank_name || '',
            account_no: businessData.account_no || '',
            ifsc_code: businessData.ifsc_code || '',
            branch: businessData.branch_name || businessData.branch || '',
            terms_conditions: businessData.terms_conditions || '',
          },
          party: {
            name: invoiceData.party_name || partyData?.name || 'Unknown Party',
            address: invoiceData.address || partyData?.address || '',
            mobile: partyData?.mobile || '',
            state: invoiceData.state || partyData?.state || '',
            gstin: invoiceData.gstin || partyData?.gstin || '',
          },
          items: lineItems,
          subtotal: Number(invoiceData.subtotal ?? calculatedTotals.subtotal),
          round_off: Number(invoiceData.round_off ?? 0),
          total_tax: Number(invoiceData.total_tax ?? calculatedTotals.totalTax),
          net_total: Number(invoiceData.net_total ?? calculatedTotals.netTotal),
          payment_received: Number(invoiceData.payment_received ?? 0),
          balance_due: Number(invoiceData.balance_due ?? 0),
          notes: invoiceData.notes || businessData.terms_conditions || '',
        })
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }

    loadInvoice()
  }, [invoiceId])

  function handleBack() {
    router.push('/sales-entry')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Invoice not found</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return <A4SinglePageInvoice invoice={invoice} onBack={handleBack} />
}
