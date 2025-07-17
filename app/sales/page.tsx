"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, Trash2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import DataTable from "@/components/DataTable"

interface Party {
  id: string
  name: string
}

interface Item {
  id: string
  name: string
  hsn_code: string
  gst_percent: number
  sales_price: number
}

interface Invoice {
  id: string
  invoice_no: string
  date: string
  party_name: string
  net_total: number
  balance_due: number
  type: string
}

export default function SalesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      fetchInvoices(business.id)
    }
  }, [])

  const fetchInvoices = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("business_id", businessId)
        .eq("type", "sales")
        .order("created_at", { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { key: "invoice_no", label: "Invoice No", render: (value: string) => <span className="font-medium">{value}</span> },
    { key: "date", label: "Date", render: (value: string) => new Date(value).toLocaleDateString() },
    { key: "party_name", label: "Party Name" },
    { key: "net_total", label: "Net Total", render: (value: number) => `₹${value.toLocaleString()}` },
    { key: "balance_due", label: "Balance Due", render: (value: number) => `₹${value.toLocaleString()}` },
    { 
      key: "status", 
      label: "Status", 
      render: (value: any, row: Invoice) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          row.balance_due <= 0 
            ? "bg-green-100 text-green-800" 
            : "bg-yellow-100 text-yellow-800"
        }`}>
          {row.balance_due <= 0 ? "Paid" : "Pending"}
        </span>
      )
    },
  ]

  const actions = (invoice: Invoice) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={() => window.open(`/print?id=${invoice.id}`, '_blank')}>
        Print
      </Button>
    </div>
  )

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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <Button onClick={() => window.location.href = '/sales-entry'}>
            <Plus className="h-4 w-4 mr-2" />
            New Sales Invoice
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">Total Invoices</h3>
                <p className="text-2xl font-bold text-blue-900">{invoices.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">Total Sales</h3>
                <p className="text-2xl font-bold text-green-900">
                  ₹{invoices.reduce((sum, inv) => sum + inv.net_total, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800">Outstanding</h3>
                <p className="text-2xl font-bold text-yellow-900">
                  ₹{invoices.reduce((sum, inv) => sum + inv.balance_due, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">Avg Invoice</h3>
                <p className="text-2xl font-bold text-purple-900">
                  ₹{invoices.length > 0 ? Math.round(invoices.reduce((sum, inv) => sum + inv.net_total, 0) / invoices.length).toLocaleString() : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <DataTable
          data={invoices}
          columns={columns}
          title="Sales Invoices"
          searchKeys={["invoice_no", "party_name"]}
          actions={actions}
        />
      </div>
    </AuthenticatedLayout>
  )
}
