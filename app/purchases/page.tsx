"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { ShoppingCart, Eye, Edit, Printer, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import DataTable from "@/components/DataTable"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"

interface Invoice {
  id: string
  invoice_no: string
  date: string
  party_id: string
  party_name: string
  gstin: string
  state: string
  address: string
  items: any[]
  total_tax: number
  round_off: number
  net_total: number
  payment_received: number
  balance_due: number
  type: "sales" | "purchase"
  created_at: string
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadPurchases(business.id)
    }
  }, [])

  const loadPurchases = async (businessId: string) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("business_id", businessId)
        .eq("type", "purchase")
        .order("created_at", { ascending: false })

      if (error) throw error
      setPurchases(data || [])
    } catch (error) {
      console.error("Error loading purchases:", error)
      toast({
        title: "Error",
        description: "Failed to load purchases data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleView = (purchase: Invoice) => {
    // Navigate to view purchase details or open modal
    console.log("View purchase:", purchase)
  }

  const handleEdit = (purchase: Invoice) => {
    // Navigate to edit purchase
    window.location.href = `/purchase-entry?edit=${purchase.id}`
  }

  const columns = useMemo(
    () => [
      { 
        key: "invoice_no", 
        label: "Purchase No", 
        render: (value: string) => <span className="font-medium">{value}</span> 
      },
      { 
        key: "date", 
        label: "Date", 
        render: (value: string) => new Date(value).toLocaleDateString() 
      },
      { key: "party_name", label: "Supplier Name" },
      { 
        key: "net_total", 
        label: "Net Total", 
        render: (value: number) => `₹${value.toLocaleString()}` 
      },
      { 
        key: "payment_received", 
        label: "Payment Made", 
        render: (value: number) => `₹${value.toLocaleString()}` 
      },
      { 
        key: "balance_due", 
        label: "Balance Due", 
        render: (value: number) => `₹${value.toLocaleString()}` 
      },
      { 
        key: "status", 
        label: "Status", 
        render: (value: any, row: Invoice) => (
          <Badge variant={row.balance_due <= 0 ? "default" : "secondary"}>
            {row.balance_due <= 0 ? "Paid" : "Pending"}
          </Badge>
        )
      },
    ],
    []
  )

  const actions = (purchase: Invoice) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={() => handleView(purchase)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleEdit(purchase)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => window.open(`/print?id=${purchase.id}`, '_blank')}>
        <Printer className="h-4 w-4" />
      </Button>
    </div>
  )

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.net_total, 0)
    const totalPaid = purchases.reduce((sum, purchase) => sum + purchase.payment_received, 0)
    const totalDue = purchases.reduce((sum, purchase) => sum + purchase.balance_due, 0)
    const totalCount = purchases.length

    return { totalPurchases, totalPaid, totalDue, totalCount }
  }, [purchases])

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
              <p className="text-gray-600">View and manage purchase transactions</p>
            </div>
          </div>
          <Button onClick={() => window.location.href = '/purchase-entry'}>
            <Package className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">₹{summary.totalPurchases.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{summary.totalCount} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
              <Badge className="bg-green-100 text-green-800">Paid</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{summary.totalPaid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Payments made</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Badge className="bg-red-100 text-red-800">Due</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">₹{summary.totalDue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Amount pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Rate</CardTitle>
              <Badge variant="outline">%</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalPurchases > 0 
                  ? ((summary.totalPaid / summary.totalPurchases) * 100).toFixed(1)
                  : '0.0'
                }%
              </div>
              <p className="text-xs text-muted-foreground">Payment completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchases Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={purchases}
              columns={columns}
              title=""
              searchKeys={["invoice_no", "party_name"]}
              actions={actions}
            />
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
