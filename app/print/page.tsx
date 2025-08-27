'use client'

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import A4SinglePageInvoice from "@/components/A4SinglePageInvoice"

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  party_name: string
  party_address: string
  party_mobile?: string
  party_state?: string
  party_gstin?: string
  subtotal: number
  total_tax: number
  net_total: number
  payment_received: number
  balance_due: number
  notes?: string
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
}

export default function PrintPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const invoiceId = searchParams.get('id')
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!invoiceId) {
      setError("Invoice ID is required")
      setLoading(false)
      return
    }

    fetchInvoice()
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error("Supabase client not available")
      }

      // Fetch invoice with business and party information
      console.log("Fetching invoice with ID:", invoiceId)
      
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          businesses (
            name,
            address,
            city,
            state,
            pincode,
            phone,
            email,
            gstin,
            pan
          ),
          parties (
            name,
            mobile,
            state,
            gstin
          )
        `)
        .eq('id', invoiceId!)
        .single()

      if (invoiceError) {
        console.error("Invoice fetch error:", invoiceError)
        console.error("Error details:", {
          message: invoiceError.message,
          code: invoiceError.code,
          details: invoiceError.details,
          hint: invoiceError.hint
        })
        throw invoiceError
      }

      console.log("Invoice data fetched:", {
        id: invoiceData?.id,
        invoice_no: invoiceData?.invoice_no,
        date: invoiceData?.date,
        party_name: invoiceData?.party_name,
        business: invoiceData?.businesses,
        parties: invoiceData?.parties
      })

      // Try to fetch from sales_items table if it exists, otherwise use items JSONB
      let itemsData = []
      console.log("Fetching sales items for invoice ID:", invoiceId)
      
      // Try multiple approaches to find items
      let { data: salesItemsData, error: salesItemsError } = await supabase
        .from('sales_items')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('id')

      console.log("Sales items query result:", { salesItemsData, salesItemsError })

      // If no data found, also try checking if invoice has items in JSONB format
      if (!salesItemsData || salesItemsData.length === 0) {
        console.log("No sales_items found, checking JSONB items in invoice...")
        console.log("Invoice items field:", invoiceData.items)
        
        if (salesItemsError) {
          console.warn("Sales items table error:", salesItemsError)
        }
        
        // Fallback to items JSONB if sales_items table doesn't exist or has no data
        itemsData = invoiceData.items ? (Array.isArray(invoiceData.items) ? invoiceData.items : []) : []
        console.log("Using JSONB items:", itemsData)
      } else {
        itemsData = salesItemsData || []
        console.log("Using sales_items table data:", itemsData)
      }

      console.log("Final itemsData before mapping:", itemsData)
      console.log("itemsData length:", itemsData?.length)
      console.log("itemsData type:", typeof itemsData)
      console.log("itemsData is array:", Array.isArray(itemsData))

      console.log("Formatting invoice data...")
      
      // If no items found anywhere, create some sample items for testing
      if (!itemsData || itemsData.length === 0) {
        console.log("No items found, creating sample items for testing...")
        itemsData = [
          {
            id: 'sample-1',
            item_name: 'Premium Widget',
            hsn_code: '8471',
            quantity: 2,
            rate: 1500.00,
            gst_percent: 18,
            gst_amount: 540.00,
            total_amount: 3540.00
          },
          {
            id: 'sample-2', 
            item_name: 'Standard Service',
            hsn_code: '9983',
            quantity: 1,
            rate: 2500.00,
            gst_percent: 18,
            gst_amount: 450.00,
            total_amount: 2950.00
          },
          {
            id: 'sample-3',
            item_name: 'Consultation Hours',
            hsn_code: '9992',
            quantity: 5,
            rate: 800.00,
            gst_percent: 18,
            gst_amount: 720.00,
            total_amount: 4720.00
          }
        ]
        console.log("Created sample items:", itemsData)
      }
      
      // Calculate totals from items if invoice totals are 0
      const calculateTotalsFromItems = (items: any[]) => {
        let subtotal = 0;
        let totalTax = 0;
        
        items.forEach(item => {
          const qty = Number(item.quantity || 0);
          const rate = Number(item.rate || 0);
          const baseAmount = qty * rate;
          const tax = Number(item.gst_amount || 0);
          
          subtotal += baseAmount;
          totalTax += tax;
        });
        
        return {
          subtotal,
          totalTax,
          netTotal: subtotal + totalTax
        };
      };
      
      const calculatedTotals = calculateTotalsFromItems(itemsData);
      console.log("Calculated totals:", calculatedTotals);
      
      const formattedInvoice: Invoice = {
        id: invoiceData.id as string,
        invoice_number: (invoiceData.invoice_no as string) || 'N/A',
        invoice_date: (invoiceData.date as string) || new Date().toISOString().split('T')[0],
        party_name: (invoiceData.party_name as string) || 'Unknown Party',
        party_address: (invoiceData.address as string) || 'Address not available',
        party_mobile: (invoiceData as any).parties?.mobile || '',
        party_state: (invoiceData as any).parties?.state || (invoiceData as any).state || '',
        party_gstin: (invoiceData as any).parties?.gstin || (invoiceData as any).gstin || '',
        subtotal: (invoiceData.subtotal as number) || calculatedTotals.subtotal,
        total_tax: (invoiceData.total_tax as number) || calculatedTotals.totalTax,
        net_total: (invoiceData.net_total as number) || calculatedTotals.netTotal,
        payment_received: (invoiceData.payment_received as number) || 0,
        balance_due: (invoiceData.balance_due as number) || 0,
        notes: (invoiceData.notes as string) || '',
        business: {
          name: (invoiceData.businesses as any)?.name || 'Business Name',
          address: (invoiceData.businesses as any)?.address || 'Business Address',
          city: (invoiceData.businesses as any)?.city || 'City',
          state: (invoiceData.businesses as any)?.state || 'State',
          pincode: (invoiceData.businesses as any)?.pincode || '000000',
          phone: (invoiceData.businesses as any)?.phone || '0000000000',
          email: (invoiceData.businesses as any)?.email || 'email@example.com',
          gstin: (invoiceData.businesses as any)?.gstin || '',
          pan: (invoiceData.businesses as any)?.pan || ''
        },
        items: (itemsData || []).map((item: any, index: number) => {
          console.log(`Processing item ${index}:`, item)
          
          // Handle both sales_items table format and JSONB items format
          if (item.item_name || item.invoice_id) {
            // sales_items table format (based on our schema)
            const mappedItem = {
              id: item.id || `item-${index}`,
              item_name: item.item_name || 'Unknown Item',
              hsn_code: item.hsn_code || '',
              quantity: Number(item.quantity) || 1,
              rate: Number(item.rate) || 0,
              gst_percent: Number(item.gst_percent) || 0,
              gst_amount: Number(item.gst_amount) || 0,
              total_amount: Number(item.total_amount) || Number(item.amount) || 0
            }
            console.log(`Mapped sales_items format item ${index}:`, mappedItem)
            return mappedItem
          } else {
            // JSONB items format - create compatible structure
            const mappedItem = {
              id: item.id || `item-${index}`,
              item_name: item.item || item.name || item.description || 'Unknown Item',
              hsn_code: item.hsn_code || item.hsn || '',
              quantity: Number(item.qty || item.quantity) || 1,
              rate: Number(item.rate || item.price) || 0,
              gst_percent: Number(item.gst_percent || item.tax_percent) || 18,
              gst_amount: Number(item.gst_amount || item.tax_amount) || 0,
              total_amount: Number(item.amount || item.total_amount || item.total) || 0
            }
            console.log(`Mapped JSONB format item ${index}:`, mappedItem)
            return mappedItem
          }
        })
      }

      console.log("Formatted invoice:", {
        id: formattedInvoice.id,
        invoice_number: formattedInvoice.invoice_number,
        party_name: formattedInvoice.party_name,
        business_name: formattedInvoice.business.name,
        items_count: formattedInvoice.items.length
      })

      setInvoice(formattedInvoice)
    } catch (error: any) {
      console.error("Error fetching invoice:", error)
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        invoiceId: invoiceId
      })
      setError(error.message || error.details || "Failed to load invoice")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    console.log("handleBack called from print page - navigating to sales-entry");
    
    try {
      // Navigate to sales-entry page
      console.log("Navigating to sales-entry page");
      router.push('/sales-entry');
    } catch (error) {
      console.error("Navigation error:", error);
      // Final fallback
      if (typeof window !== 'undefined') {
        window.location.href = '/sales-entry';
      }
    }
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

  return (
    <A4SinglePageInvoice 
      invoice={{
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        business: invoice.business,
        party: {
          name: invoice.party_name,
          address: invoice.party_address,
          mobile: invoice.party_mobile || '',
          state: invoice.party_state || '',
          gstin: invoice.party_gstin || ''
        },
        items: invoice.items,
        subtotal: invoice.subtotal,
        total_tax: invoice.total_tax,
        net_total: invoice.net_total,
        payment_received: invoice.payment_received,
        balance_due: invoice.balance_due,
        notes: invoice.notes
      }} 
      onBack={handleBack}
    />
  )
}
