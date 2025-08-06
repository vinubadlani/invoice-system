'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { salesQueries, getSupabaseClient, getCurrentUser } from '@/lib/supabase'
import { ClassicTemplate, ModernTemplate, CorporateTemplate, ElegantTemplate } from '@/components/InvoiceTemplates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Printer, ArrowLeft, Eye } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

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
}

interface InvoiceData {
  id: string | number
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
  status: string
  [key: string]: any
}

const INVOICE_TEMPLATES = [
  {
    id: 'classic',
    name: 'Invoice Template 1 - Classic',
    description: 'Traditional professional invoice with clean layout and comprehensive details',
    component: ClassicTemplate,
    features: ['Clean header design', 'Detailed itemization', 'Bank details included', 'Professional footer'],
    color: 'blue'
  },
  {
    id: 'modern',
    name: 'Invoice Template 2 - Modern',
    description: 'Contemporary design with gradient accents and modern typography',
    component: ModernTemplate,
    features: ['Gradient header', 'Modern styling', 'Enhanced readability', 'Status indicators'],
    color: 'indigo'
  },
  {
    id: 'corporate',
    name: 'Invoice Template 3 - Corporate',
    description: 'Professional corporate theme suitable for business-to-business transactions',
    component: CorporateTemplate,
    features: ['Corporate branding', 'Structured layout', 'Payment terms', 'Formal styling'],
    color: 'slate'
  },
  {
    id: 'elegant',
    name: 'Invoice Template 4 - Elegant',
    description: 'Sophisticated design with gold accents and refined typography',
    component: ElegantTemplate,
    features: ['Gold accent colors', 'Serif typography', 'Premium styling', 'Elegant borders'],
    color: 'amber'
  }
]

export default function InvoiceDownloadPage() {
  const searchParams = useSearchParams()
  const invoiceId = searchParams.get('id')
  const { toast } = useToast()
  
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('classic')

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
            const client = getSupabaseClient()
            if (client) {
              const { data } = await client
                .from('businesses')
                .select('*')
                .limit(1)
              
              if (data && data.length > 0) {
                setBusiness(data[0] as Business)
              } else {
                setError('Please set up your business information in Settings first')
                return
              }
            } else {
              setError('Unable to connect to database')
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
          // Ensure all required fields are present
          const formattedInvoice: InvoiceData = {
            ...invoiceData,
            id: String(invoiceData.id),
            status: invoiceData.status || 'pending'
          }
          setInvoice(formattedInvoice)
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

  const handlePrintTemplate = (templateId: string) => {
    if (!invoice || !business) return
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Get the template component
    const template = INVOICE_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    // Create the invoice HTML
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_no} - ${template.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div id="invoice-content"></div>
          <script type="module">
            import React from 'https://esm.sh/react@18'
            import ReactDOM from 'https://esm.sh/react-dom@18'
            
            const invoice = ${JSON.stringify(invoice)}
            const business = ${JSON.stringify(business)}
            
            // This would render the template component
            // For now, we'll use the print functionality
            window.print()
          </script>
        </body>
      </html>
    `

    printWindow.document.write(invoiceHTML)
    printWindow.document.close()
  }

  const handleDownloadPDF = (templateId: string) => {
    // Open the print page with the specific template
    const printUrl = `/print?id=${invoiceId}&template=${templateId}&download=true`
    const printWindow = window.open(printUrl, '_blank')
    if (printWindow) {
      setTimeout(() => {
        printWindow.print()
      }, 1500)
    }
    
    toast({
      title: "Download Started",
      description: `Preparing ${INVOICE_TEMPLATES.find(t => t.id === templateId)?.name} for download`,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice templates...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/sales">
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Invoice data not available</p>
          <Link href="/sales">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice Templates</h1>
              <p className="text-gray-600 mt-1">
                Choose from 4 professional invoice designs for Invoice #{invoice.invoice_no}
              </p>
            </div>
            <Link href="/sales">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sales
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        {/* Invoice Summary */}
        <Card className="mb-8 bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-xl text-gray-800">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Invoice Number</p>
                <p className="text-lg font-bold text-blue-600">{invoice.invoice_no}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Customer</p>
                <p className="text-lg font-semibold text-gray-800">{invoice.party_name}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Date</p>
                <p className="text-lg font-semibold text-gray-800">{new Date(invoice.date).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                <p className="text-lg font-bold text-green-600">₹{Number(invoice.net_total || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Selection Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {INVOICE_TEMPLATES.map((template) => (
            <Card key={template.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-white border-0">
              <CardHeader className={`bg-gradient-to-r from-${template.color}-50 to-${template.color}-100 border-b`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-gray-800">{template.name}</CardTitle>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium bg-${template.color}-200 text-${template.color}-800`}>
                    Template {template.id === 'classic' ? '1' : template.id === 'modern' ? '2' : template.id === 'corporate' ? '3' : '4'}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{template.description}</p>
              </CardHeader>
              
              <CardContent className="p-6">
                {/* Features */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3">Key Features:</h4>
                  <ul className="space-y-2">
                    {template.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <span className={`w-2 h-2 rounded-full bg-${template.color}-500 mr-3`}></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Preview */}
                <div className="mb-6">
                  <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 overflow-hidden">
                    <div className="transform scale-25 origin-top-left w-[400%] h-[300px] overflow-hidden">
                      {React.createElement(template.component, {
                        invoice,
                        business
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">Preview (scaled down)</p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTemplate(template.id)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Full Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintTemplate(template.id)}
                    className="flex-1"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownloadPDF(template.id)}
                    className={`flex-1 bg-${template.color}-600 hover:bg-${template.color}-700`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Full Preview Section */}
        {selectedTemplate && (
          <Card className="bg-white shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-gray-800">
                  Full Preview: {INVOICE_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                </CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintTemplate(selectedTemplate)}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print This Template
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownloadPDF(selectedTemplate)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 overflow-auto max-h-96">
                <div className="transform scale-75 origin-top-left w-[133%]">
                  {React.createElement(
                    INVOICE_TEMPLATES.find(t => t.id === selectedTemplate)?.component || INVOICE_TEMPLATES[0].component,
                    { invoice, business }
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
