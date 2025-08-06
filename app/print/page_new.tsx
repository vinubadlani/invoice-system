'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { salesQueries } from '@/lib/supabase'
import { TEMPLATE_COMPONENTS, TemplateType } from '@/components/InvoiceTemplates'

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
  bank_name?: string
  account_number?: string
  ifsc_code?: string
  upi_id?: string
  terms_conditions?: string
  template_style?: TemplateType
}

interface InvoiceData {
  id: number
  invoice_no: string
  date: string
  party_name: string
  address: string
  state: string
  phone?: string
  gstin?: string
  items: any[]
  net_total: number
  total_tax: number
  payment_received: number
  balance_due: number
  status?: string
}

export default function PrintPage() {
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('id')
  
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!invoiceId) {
          setError('No invoice ID provided')
          return
        }

        // Get business data from localStorage
        const businessData = localStorage.getItem('businessInfo')
        if (businessData) {
          setBusiness(JSON.parse(businessData))
        } else {
          setError('Business information not found')
          return
        }

        // Fetch invoice data
        const invoiceData = await salesQueries.getSalesData(invoiceId)
        if (invoiceData) {
          setInvoice(invoiceData)
        } else {
          setError('Invoice not found')
        }

      } catch (err) {
        console.error('Error loading print data:', err)
        setError('Failed to load invoice data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [invoiceId])

  // Auto print when data is loaded
  useEffect(() => {
    if (invoice && business && !loading) {
      const timer = setTimeout(() => {
        window.print()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [invoice, business, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!invoice || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    )
  }

  // Get the selected template from business settings or default to classic
  const templateType = business.template_style || 'classic'
  const TemplateComponent = TEMPLATE_COMPONENTS[templateType]

  return (
    <div className="print:m-0 print:p-0">
      <TemplateComponent invoice={invoice} business={business} />
    </div>
  )
}
