"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  Receipt, 
  DollarSign,
  Calendar,
  Download,
  FileText,
  Eye,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"

interface ReportData {
  totalSales: number
  totalPurchases: number
  totalParties: number
  totalItems: number
  salesCount: number
  purchasesCount: number
  profitLoss: number
  pendingPayments: number
}

interface SalesReport {
  id: string
  invoice_no: string
  date: string
  party_name: string
  net_total: number
  payment_received: number
  balance_due: number
}

interface PurchaseReport {
  id: string
  invoice_no: string
  date: string
  party_name: string
  net_total: number
  payment_made: number
  balance_due: number
}

interface PartyReport {
  id: string
  name: string
  type: string
  total_sales: number
  total_purchases: number
  balance: number
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [salesReports, setSalesReports] = useState<SalesReport[]>([])
  const [purchaseReports, setPurchaseReports] = useState<PurchaseReport[]>([])
  const [partyReports, setPartyReports] = useState<PartyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const { toast } = useToast()

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadReportData(business.id)
    }
  }, [])

  const loadReportData = async (businessId: string) => {
    try {
      setLoading(true)
      
      // Load summary data
      await Promise.all([
        loadSummaryData(businessId),
        loadSalesReports(businessId),
        loadPurchaseReports(businessId),
        loadPartyReports(businessId)
      ])
    } catch (error) {
      console.error("Error loading report data:", error)
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSummaryData = async (businessId: string) => {
    try {
      // Get sales data
      const { data: salesData } = await supabase
        .from("invoices")
        .select("net_total, payment_received, balance_due")
        .eq("business_id", businessId)
        .eq("type", "sales")
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)

      // Get purchase data
      const { data: purchaseData } = await supabase
        .from("invoices")
        .select("net_total, payment_received as payment_made, balance_due")
        .eq("business_id", businessId)
        .eq("type", "purchase")
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)

      // Get parties count
      const { count: partiesCount } = await supabase
        .from("parties")
        .select("id", { count: "exact" })
        .eq("business_id", businessId)

      // Get items count
      const { count: itemsCount } = await supabase
        .from("items")
        .select("id", { count: "exact" })
        .eq("business_id", businessId)

      const totalSales = salesData?.reduce((sum, item) => sum + item.net_total, 0) || 0
      const totalPurchases = purchaseData?.reduce((sum, item) => sum + item.net_total, 0) || 0
      const pendingPayments = salesData?.reduce((sum, item) => sum + item.balance_due, 0) || 0

      setReportData({
        totalSales,
        totalPurchases,
        totalParties: partiesCount || 0,
        totalItems: itemsCount || 0,
        salesCount: salesData?.length || 0,
        purchasesCount: purchaseData?.length || 0,
        profitLoss: totalSales - totalPurchases,
        pendingPayments
      })
    } catch (error) {
      console.error("Error loading summary data:", error)
    }
  }

  const loadSalesReports = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_no, date, party_name, net_total, payment_received, balance_due")
        .eq("business_id", businessId)
        .eq("type", "sales")
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date", { ascending: false })

      if (error) throw error
      setSalesReports(data || [])
    } catch (error) {
      console.error("Error loading sales reports:", error)
    }
  }

  const loadPurchaseReports = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_no, date, party_name, net_total, payment_received as payment_made, balance_due")
        .eq("business_id", businessId)
        .eq("type", "purchase")
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date", { ascending: false })

      if (error) throw error
      setPurchaseReports(data || [])
    } catch (error) {
      console.error("Error loading purchase reports:", error)
    }
  }

  const loadPartyReports = async (businessId: string) => {
    try {
      const { data: parties, error } = await supabase
        .from("parties")
        .select("id, name, type")
        .eq("business_id", businessId)

      if (error) throw error

      // Calculate totals for each party
      const partyData = await Promise.all(
        (parties || []).map(async (party) => {
          const { data: sales } = await supabase
            .from("invoices")
            .select("net_total, balance_due")
            .eq("business_id", businessId)
            .eq("party_id", party.id)
            .eq("type", "sales")

          const { data: purchases } = await supabase
            .from("invoices")
            .select("net_total, balance_due")
            .eq("business_id", businessId)
            .eq("party_id", party.id)
            .eq("type", "purchase")

          const totalSales = sales?.reduce((sum, item) => sum + item.net_total, 0) || 0
          const totalPurchases = purchases?.reduce((sum, item) => sum + item.net_total, 0) || 0
          const salesBalance = sales?.reduce((sum, item) => sum + item.balance_due, 0) || 0
          const purchaseBalance = purchases?.reduce((sum, item) => sum + item.balance_due, 0) || 0

          return {
            id: party.id,
            name: party.name,
            type: party.type,
            total_sales: totalSales,
            total_purchases: totalPurchases,
            balance: salesBalance - purchaseBalance
          }
        })
      )

      setPartyReports(partyData)
    } catch (error) {
      console.error("Error loading party reports:", error)
    }
  }

  const handleDateRangeChange = () => {
    if (businessId) {
      loadReportData(businessId)
    }
  }

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {})
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600">View business insights and generate reports</p>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="from_date">From Date</Label>
                <Input
                  id="from_date"
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="to_date">To Date</Label>
                <Input
                  id="to_date"
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleDateRangeChange} className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Apply Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{reportData.totalSales.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{reportData.salesCount} transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{reportData.totalPurchases.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{reportData.purchasesCount} transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit/Loss</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reportData.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{reportData.profitLoss.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {reportData.profitLoss >= 0 ? 'Profit' : 'Loss'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <Receipt className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">₹{reportData.pendingPayments.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Outstanding amount</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reports Tabs */}
        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales">Sales Reports</TabsTrigger>
            <TabsTrigger value="purchases">Purchase Reports</TabsTrigger>
            <TabsTrigger value="parties">Party Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Sales Report</CardTitle>
                  <Button 
                    onClick={() => exportToCSV(salesReports, 'sales_report')}
                    disabled={salesReports.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Party Name</TableHead>
                        <TableHead className="text-right">Net Total</TableHead>
                        <TableHead className="text-right">Payment Received</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.invoice_no}</TableCell>
                          <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                          <TableCell>{report.party_name}</TableCell>
                          <TableCell className="text-right">₹{report.net_total.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{report.payment_received.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{report.balance_due.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {salesReports.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No sales data found for the selected date range
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Purchase Report</CardTitle>
                  <Button 
                    onClick={() => exportToCSV(purchaseReports, 'purchase_report')}
                    disabled={purchaseReports.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Party Name</TableHead>
                        <TableHead className="text-right">Net Total</TableHead>
                        <TableHead className="text-right">Payment Made</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.invoice_no}</TableCell>
                          <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                          <TableCell>{report.party_name}</TableCell>
                          <TableCell className="text-right">₹{report.net_total.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{report.payment_made.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{report.balance_due.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {purchaseReports.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No purchase data found for the selected date range
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parties">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Party Report</CardTitle>
                  <Button 
                    onClick={() => exportToCSV(partyReports, 'party_report')}
                    disabled={partyReports.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Party Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Total Sales</TableHead>
                        <TableHead className="text-right">Total Purchases</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partyReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.name}</TableCell>
                          <TableCell>{report.type}</TableCell>
                          <TableCell className="text-right">₹{report.total_sales.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{report.total_purchases.toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-medium ${
                            report.balance > 0 ? 'text-green-600' : 
                            report.balance < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            ₹{Math.abs(report.balance).toLocaleString()}
                            {report.balance > 0 ? ' (To Receive)' : report.balance < 0 ? ' (To Pay)' : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                      {partyReports.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No party data found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}
