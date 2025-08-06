'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { salesQueries, getSupabaseClient } from '@/lib/supabase'
import { TEMPLATE_COMPONENTS, TemplateType } from '@/components/InvoiceTemplates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Eye, Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
  pan?: string
  terms_conditions?: string
  bank_name?: string
  account_no?: string
  ifsc_code?: string
  branch_name?: string
  upi_id?: string
  template_style?: TemplateType
}

interface InvoiceData {
  id: string
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
  [key: string]: any
}

const TEMPLATE_INFO = [
  {
    id: 'classic',
    name: 'Classic Professional',
    description: 'Traditional business invoice with clean layout',
    type: 'invoice',
    features: ['Company logo', 'Clean table', 'Professional styling']
  },
  {
    id: 'modern',
    name: 'Modern Minimalist',
    description: 'Clean, modern design with gradient accents',
    type: 'invoice',
    features: ['Gradient header', 'Modern typography', 'Sleek design']
  },
  {
    id: 'corporate',
    name: 'Corporate Blue',
    description: 'Professional corporate template with blue theme',
    type: 'invoice',
    features: ['Blue corporate theme', 'Structured layout', 'Professional branding']
  },
  {
    id: 'receipt',
    name: 'Simple Receipt',
    description: 'Compact receipt format for transactions',
    type: 'receipt',
    features: ['Compact design', 'Essential details', 'Receipt format']
  },
  {
    id: 'thermal-receipt',
    name: 'Thermal Receipt',
    description: 'Thermal printer compatible format',
    type: 'receipt',
    features: ['80mm width', 'Monospace font', 'POS compatible']
  },
  {
    id: 'shipping-label',
    name: 'Shipping Label',
    description: 'Professional shipping label with tracking',
    type: 'shipping',
    features: ['Large fonts', 'Shipping details', 'Barcode space']
  },
  {
    id: 'delivery-note',
    name: 'Delivery Note',
    description: 'Delivery confirmation document',
    type: 'delivery',
    features: ['Delivery details', 'Signature sections', 'Item checklist']
  },
  {
    id: 'quotation',
    name: 'Quotation',
    description: 'Professional quotation template',
    type: 'quotation',
    features: ['Green theme', 'Terms included', 'Call to action']
  }
]

export default function DownloadTemplatesPage() {
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('id')
  
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('classic')

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!invoiceId) {
          setError('No invoice ID provided')
          return
        }

        // Get business data from localStorage - try both keys
        let businessData = localStorage.getItem('selectedBusiness') || localStorage.getItem('businessInfo')
        if (businessData) {
          setBusiness(JSON.parse(businessData))
        } else {
          // Try to fetch from database as fallback
          try {
            const supabase = getSupabaseClient()
            if (supabase) {
              const { data } = await supabase
                .from('businesses')
                .select('*')
                .limit(1)
              
              if (data && data.length > 0) {
                setBusiness(data[0] as unknown as Business)
              } else {
                setError('Please set up your business information in Settings first')
                return
              }
            } else {
              setError('Database connection failed. Please set up your business in Settings.')
              return
            }
          } catch (dbError) {
            setError('Business information not found. Please set up your business in Settings.')
            return
          }
        }

        // Fetch invoice data
        const invoiceData = await salesQueries.getInvoiceById(invoiceId)
        if (invoiceData) {
          const invoice = { ...invoiceData, id: String(invoiceData.id) } as InvoiceData
          setInvoice(invoice)
        } else {
          setError('Invoice not found')
        }

      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load invoice data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [invoiceId])

  const handlePrint = (templateType: TemplateType) => {
    // Open a new window with the specific template
    const printWindow = window.open(`/print?id=${invoiceId}&template=${templateType}`, '_blank')
    if (printWindow) {
      printWindow.focus()
    }
  }

  const handleDownloadPDF = (templateType: TemplateType) => {
    // For PDF download, we'll open print dialog in a new window
    const printWindow = window.open(`/print?id=${invoiceId}&template=${templateType}&download=true`, '_blank')
    if (printWindow) {
      setTimeout(() => {
        printWindow.print()
      }, 1000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading templates...</p>
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
          <Link href="/sales" className="mt-4 inline-block">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sales
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!invoice || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
          <Link href="/sales" className="mt-4 inline-block">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sales
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Templates</h1>
          <p className="text-gray-600 mt-2">
            Download invoice {invoice.invoice_no} in different formats
          </p>
        </div>
        <Link href="/sales">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
          </Button>
        </Link>
      </div>

      {/* Invoice Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Invoice No.</p>
              <p className="font-semibold">{invoice.invoice_no}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-semibold">{invoice.party_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-semibold">{new Date(invoice.date).toLocaleDateString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount</p>
              <p className="font-semibold">₹{Number(invoice.net_total || 0).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {TEMPLATE_INFO.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  template.type === 'invoice' ? 'bg-blue-100 text-blue-800' :
                  template.type === 'receipt' ? 'bg-green-100 text-green-800' :
                  template.type === 'shipping' ? 'bg-orange-100 text-orange-800' :
                  template.type === 'delivery' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {template.type}
                </span>
              </div>
              <p className="text-sm text-gray-600">{template.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ul className="text-sm text-gray-600 space-y-1">
                  {template.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTemplate(template.id as TemplateType)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(template.id as TemplateType)}
                    className="flex-1"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Print
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownloadPDF(template.id as TemplateType)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview: {TEMPLATE_INFO.find(t => t.id === selectedTemplate)?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-96 overflow-auto">
            <div className="transform scale-50 origin-top-left w-[200%] h-[200%]">
              {React.createElement(TEMPLATE_COMPONENTS[selectedTemplate], {
                invoice,
                business
              })}
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <Button onClick={() => handlePrint(selectedTemplate)}>
              <Printer className="w-4 h-4 mr-2" />
              Print This Template
            </Button>
            <Button variant="outline" onClick={() => handleDownloadPDF(selectedTemplate)}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
