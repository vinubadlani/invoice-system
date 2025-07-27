"use client"

import { useState, useEffect } from "react"
import { supabase, getSupabaseClient } from "@/lib/supabase"
import { Plus, Trash2, Save, FileText, Download, Eye, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import DataTable from "@/components/DataTable"
import DataTableFilters, { FilterConfig, FilterValues } from "@/components/DataTableFilters"

interface Purchase {
  id: string
  invoice_no: string
  date: string
  party_name: string
  net_total: number
  balance_due: number
  payment_made: number
  total_tax: number
  type: string
  gstin: string
  state: string
  created_at: string
}

// Get financial year date range
const getFinancialYearRange = (financialYear: string) => {
  const [startYear, endYear] = financialYear.split('-').map(Number)
  return {
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`
  }
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const [financialYear, setFinancialYear] = useState<string>("")

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "invoice_no",
      label: "Invoice Number",
      type: "text",
      placeholder: "Search by invoice number"
    },
    {
      id: "party_name", 
      label: "Party Name",
      type: "text",
      placeholder: "Search by party name"
    },
    {
      id: "date_range",
      label: "Date Range",
      type: "dateRange"
    },
    {
      id: "amount_range",
      label: "Amount Range",
      type: "select",
      options: [
        { value: "0-10000", label: "₹0 - ₹10,000" },
        { value: "10000-50000", label: "₹10,000 - ₹50,000" },
        { value: "50000-100000", label: "₹50,000 - ₹1,00,000" },
        { value: "100000-999999999", label: "Above ₹1,00,000" }
      ]
    },
    {
      id: "status",
      label: "Payment Status", 
      type: "select",
      options: [
        { value: "paid", label: "Paid" },
        { value: "pending", label: "Pending" },
        { value: "partial", label: "Partially Paid" }
      ]
    },
    {
      id: "state",
      label: "State",
      type: "text",
      placeholder: "Filter by state"
    },
    {
      id: "gstin",
      label: "GSTIN",
      type: "text", 
      placeholder: "Filter by GSTIN"
    }
  ]

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      
      // Set current financial year
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth() + 1
      const finYear = currentMonth >= 4 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`
      setFinancialYear(finYear)
    }
  }, [])

  useEffect(() => {
    if (businessId && financialYear) {
      fetchPurchases()
    }
  }, [businessId, financialYear])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      const { start, end } = getFinancialYearRange(financialYear)
      
      const client = getSupabaseClient()
      if (!client) {
        console.error("Supabase client not available")
        return
      }
      
      const { data, error } = await client
        .from('invoices')
        .select('*')
        .eq('business_id', businessId)
        .eq('type', 'purchase')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })

      if (error) throw error
      
      setPurchases((data as unknown as Purchase[]) || [])
      setFilteredPurchases((data as unknown as Purchase[]) || [])
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPaymentStatus = (purchase: Purchase) => {
    if (purchase.payment_made >= purchase.net_total) return 'paid'
    if (purchase.payment_made > 0) return 'partial'
    return 'pending'
  }

  const handleFilterChange = (filters: FilterValues) => {
    let filtered = [...purchases]

    // Apply text filters
    if (filters.invoice_no) {
      filtered = filtered.filter(purchase => 
        purchase.invoice_no.toLowerCase().includes(filters.invoice_no.toLowerCase())
      )
    }

    if (filters.party_name) {
      filtered = filtered.filter(purchase =>
        purchase.party_name.toLowerCase().includes(filters.party_name.toLowerCase())
      )
    }

    if (filters.state) {
      filtered = filtered.filter(purchase =>
        purchase.state?.toLowerCase().includes(filters.state.toLowerCase())
      )
    }

    if (filters.gstin) {
      filtered = filtered.filter(purchase =>
        purchase.gstin?.toLowerCase().includes(filters.gstin.toLowerCase())
      )
    }

    // Apply date range filter
    if (filters.date_range?.from && filters.date_range?.to) {
      filtered = filtered.filter(purchase => {
        const purchaseDate = new Date(purchase.date)
        const fromDate = new Date(filters.date_range.from)
        const toDate = new Date(filters.date_range.to)
        return purchaseDate >= fromDate && purchaseDate <= toDate
      })
    }

    // Apply amount range filter
    if (filters.amount_range) {
      const [min, max] = filters.amount_range.split('-').map(Number)
      filtered = filtered.filter(purchase => 
        purchase.net_total >= min && purchase.net_total <= max
      )
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(purchase => {
        const status = getPaymentStatus(purchase)
        return status === filters.status
      })
    }

    setFilteredPurchases(filtered)
  }

  const handleFinancialYearChange = (year: string) => {
    setFinancialYear(year)
  }

  const handleExport = () => {
    console.log('Exporting purchases data...')
  }

  // Calculate summary statistics
  const summary = {
    totalPurchases: purchases.reduce((sum, p) => sum + p.net_total, 0),
    totalPaid: purchases.reduce((sum, p) => sum + p.payment_made, 0),
    totalOutstanding: purchases.reduce((sum, p) => sum + p.balance_due, 0),
    totalTax: purchases.reduce((sum, p) => sum + p.total_tax, 0),
    totalCount: purchases.length,
    paidCount: purchases.filter(p => getPaymentStatus(p) === 'paid').length,
    pendingCount: purchases.filter(p => getPaymentStatus(p) === 'pending').length,
    avgPurchase: purchases.length ? purchases.reduce((sum, p) => sum + p.net_total, 0) / purchases.length : 0
  }

  // Define table columns
  const columns = [
    { 
      key: "invoice_no", 
      label: "Invoice No.",
      render: (value: string) => (
        <span className="font-medium text-blue-600">{value}</span>
      )
    },
    { 
      key: "date", 
      label: "Date", 
      render: (value: string) => new Date(value).toLocaleDateString('en-IN') 
    },
    { key: "party_name", label: "Party Name" },
    { key: "state", label: "State" },
    { 
      key: "net_total", 
      label: "Net Total", 
      render: (value: number) => `₹${value.toLocaleString('en-IN')}` 
    },
    { 
      key: "total_tax", 
      label: "Tax Amount", 
      render: (value: number) => `₹${value.toLocaleString('en-IN')}` 
    },
    { 
      key: "payment_made", 
      label: "Paid", 
      render: (value: number) => `₹${value.toLocaleString('en-IN')}` 
    },
    { 
      key: "balance_due", 
      label: "Balance Due", 
      render: (value: number) => (
        <span className={value > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
          ₹{value.toLocaleString('en-IN')}
        </span>
      )
    },
    { 
      key: "status", 
      label: "Status", 
      render: (value: any, row: Purchase) => {
        const status = getPaymentStatus(row)
        const statusConfig = {
          paid: { class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", text: "Paid" },
          partial: { class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", text: "Partial" },
          pending: { class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", text: "Pending" }
        }
        const config = statusConfig[status as keyof typeof statusConfig]
        
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.class}`}>
            {config.text}
          </span>
        )
      }
    },
  ]

  const actions = (purchase: Purchase) => (
    <div className="flex gap-2">
      <Button variant="outline" size="sm">
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm">
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm">
        <FileText className="h-4 w-4" />
      </Button>
    </div>
  )

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchases</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your purchase transactions</p>
          </div>
          <Button asChild>
            <a href="/purchase-entry">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase
            </a>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Purchases</p>
                  <p className="text-2xl font-bold">₹{summary.totalPurchases.toLocaleString('en-IN')}</p>
                  <p className="text-blue-100 text-xs mt-1">{summary.totalCount} invoices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Paid</p>
                  <p className="text-2xl font-bold">₹{summary.totalPaid.toLocaleString('en-IN')}</p>
                  <p className="text-green-100 text-xs mt-1">{summary.paidCount} paid invoices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-red-100 text-sm font-medium">Outstanding</p>
                  <p className="text-2xl font-bold">₹{summary.totalOutstanding.toLocaleString('en-IN')}</p>
                  <p className="text-red-100 text-xs mt-1">{summary.pendingCount} pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Tax Amount</p>
                  <p className="text-2xl font-bold">₹{summary.totalTax.toLocaleString('en-IN')}</p>
                  <p className="text-purple-100 text-xs mt-1">Avg: ₹{Math.round(summary.avgPurchase).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Filters */}
        <DataTableFilters
          filters={filterConfigs}
          onFilterChange={handleFilterChange}
          onExport={handleExport}
          showFinancialYear={true}
          financialYear={financialYear}
          onFinancialYearChange={handleFinancialYearChange}
        />

        <DataTable
          data={filteredPurchases}
          columns={columns}
          title={`Purchase Invoices (${filteredPurchases.length} of ${purchases.length})`}
          searchKeys={["invoice_no", "party_name"]}
          actions={actions}
        />
      </div>
    </AuthenticatedLayout>
  )
}
