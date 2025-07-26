"use client"

import { useState, useEffect, useMemo } from "react"
import { salesQueries } from "@/lib/supabase"
import { TrendingUp, TrendingDown, DollarSign, FileText, Calendar, Filter, Download, Eye, RefreshCw, X, MapPin, Phone, Mail } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts"

interface SalesData {
  id: string
  invoice_no: string
  party_name: string
  subtotal: number
  total_tax: number
  net_total: number
  payment_received: number
  balance_due: number
  date: string
  status: string
  payment_method: string
  items: any[]
  gstin?: string
  state: string
  address: string
  created_at: string
  updated_at?: string
}

interface SalesStats {
  total_sales: number
  total_invoices: number
  average_order_value: number
  pending_amount: number
  paid_amount: number
  this_month_sales: number
  last_month_sales: number
  growth_percentage: number
}

interface ChartData {
  date: string
  amount: number
  invoices: number
}

export default function SalesPage() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [filteredData, setFilteredData] = useState<SalesData[]>([])
  const [stats, setStats] = useState<SalesStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState("30")
  const [businessId, setBusinessId] = useState<string>("")
  const [selectedInvoice, setSelectedInvoice] = useState<SalesData | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  
  const { toast } = useToast()

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadSalesData(business.id)
      
      // Subscribe to real-time updates
      const subscription = salesQueries.subscribeSalesUpdates(business.id, (payload) => {
        console.log('Real-time update:', payload)
        // Refresh data when changes occur
        loadSalesData(business.id, false)
      })

      return () => {
        subscription.unsubscribe()
      }
    } else {
      setLoading(false)
      toast({
        title: "No Business Selected",
        description: "Please select a business to view sales data.",
        variant: "destructive",
      })
    }
  }, [toast])

  const loadSalesData = async (businessId: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      else setRefreshing(true)
      
      // Calculate date range
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      const startDateStr = startDate.toISOString().split('T')[0]

      // Fetch sales data and stats in parallel
      const [salesDataResult, statsResult] = await Promise.all([
        salesQueries.getSalesData(businessId, {
          startDate: startDateStr,
          endDate: endDate,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 100
        }),
        salesQueries.getSalesStats(businessId)
      ])

      setSalesData(salesDataResult)
      setFilteredData(salesDataResult)
      setStats(statsResult)

    } catch (error) {
      console.error("Error loading sales data:", error)
      toast({
        title: "Error",
        description: "Failed to load sales data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Refresh data
  const handleRefresh = () => {
    if (businessId) {
      loadSalesData(businessId, false)
    }
  }

  // Handle view invoice
  const handleViewInvoice = (invoice: SalesData) => {
    setSelectedInvoice(invoice)
    setIsViewDialogOpen(true)
  }

  // Filter data based on search and filters
  useEffect(() => {
    let filtered = salesData

    if (searchTerm) {
      filtered = filtered.filter(sale => 
        sale.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.invoice_no.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(sale => sale.status === statusFilter)
    }

    setFilteredData(filtered)
  }, [salesData, searchTerm, statusFilter])

  // Reload data when date range or status filter changes
  useEffect(() => {
    if (businessId) {
      loadSalesData(businessId, false)
    }
  }, [dateRange, businessId])

  // Chart data processing
  const chartData = useMemo(() => {
    const dailyData: { [key: string]: { amount: number, invoices: number } } = {}
    
    salesData.forEach(sale => {
      const date = format(new Date(sale.date), 'MMM dd')
      if (!dailyData[date]) {
        dailyData[date] = { amount: 0, invoices: 0 }
      }
      dailyData[date].amount += sale.net_total
      dailyData[date].invoices += 1
    })

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        invoices: data.invoices
      }))
      .sort((a, b) => new Date(a.date + ', 2025').getTime() - new Date(b.date + ', 2025').getTime())
  }, [salesData])

  const statusData = useMemo(() => {
    const statusCounts = salesData.reduce((acc, sale) => {
      acc[sale.status] = (acc[sale.status] || 0) + 1
      return acc
    }, {} as { [key: string]: number })

    const colorMap = {
      paid: "#10B981",
      pending: "#F59E0B", 
      partial: "#8B5CF6",
      overdue: "#EF4444",
      draft: "#6B7280",
      cancelled: "#DC2626"
    }

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: colorMap[status as keyof typeof colorMap] || "#6B7280"
    }))
  }, [salesData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: "default",
      pending: "secondary",
      partial: "outline",
      overdue: "destructive",
      draft: "outline",
      cancelled: "destructive"
    } as const
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading sales data...</p>
          </div>
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
            <h1 className="text-3xl font-bold tracking-tight">Sales Overview</h1>
            <p className="text-muted-foreground">
              Track and analyze your sales performance in real-time
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Link href="/sales-entry">
              <Button size="sm">
                <FileText className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.total_sales)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.growth_percentage >= 0 ? (
                    <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />
                  ) : (
                    <TrendingDown className="inline h-3 w-3 mr-1 text-red-500" />
                  )}
                  {Math.abs(stats.growth_percentage).toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_invoices}</div>
                <p className="text-xs text-muted-foreground">
                  Active sales transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.average_order_value)}</div>
                <p className="text-xs text-muted-foreground">
                  Per transaction average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.pending_amount)}</div>
                <p className="text-xs text-muted-foreground">
                  Outstanding payments
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Trend</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'amount' ? formatCurrency(Number(value)) : value,
                          name === 'amount' ? 'Sales' : 'Invoices'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Performance</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'amount' ? formatCurrency(Number(value)) : value,
                          name === 'amount' ? 'Sales Amount' : 'Invoice Count'
                        ]}
                      />
                      <Bar yAxisId="left" dataKey="amount" fill="#8884d8" />
                      <Bar yAxisId="right" dataKey="invoices" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Filters - Always Visible */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by party name or invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table - Always Visible */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Transactions</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredData.length} transactions found
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-6">
                      <div className="text-muted-foreground">
                        <FileText className="mx-auto h-8 w-8 mb-2" />
                        <p>No sales data found</p>
                        <p className="text-sm">Try adjusting your filters or date range</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        {sale.invoice_no}
                      </TableCell>
                      <TableCell>{sale.party_name}</TableCell>
                      <TableCell>
                        {format(new Date(sale.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{Array.isArray(sale.items) ? sale.items.length : 0}</TableCell>
                      <TableCell>{formatCurrency(sale.subtotal || 0)}</TableCell>
                      <TableCell>{formatCurrency(sale.total_tax || 0)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(sale.net_total)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(sale.payment_received || 0)}
                      </TableCell>
                      <TableCell className={sale.balance_due > 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(sale.balance_due || 0)}
                      </TableCell>
                      <TableCell>{getStatusBadge(sale.status)}</TableCell>
                      <TableCell className="capitalize">
                        {sale.payment_method || 'Cash'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewInvoice(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoice View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Invoice Details</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Invoice Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invoice No:</span>
                        <span className="font-medium">{selectedInvoice.invoice_no}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{format(new Date(selectedInvoice.date), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date:</span>
                        <span>{selectedInvoice.due_date ? format(new Date(selectedInvoice.due_date), 'MMM dd, yyyy') : 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span>{getStatusBadge(selectedInvoice.status)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Method:</span>
                        <span className="capitalize">{selectedInvoice.payment_method || 'Cash'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Customer Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground font-medium">{selectedInvoice.party_name}</span>
                      </div>
                      {selectedInvoice.gstin && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">GSTIN:</span>
                          <span className="font-mono text-sm">{selectedInvoice.gstin}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="text-sm">
                          <div>{selectedInvoice.address}</div>
                          <div className="text-muted-foreground">{selectedInvoice.state}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.item || item.item_name || 'Item'}</div>
                                {item.hsn && <div className="text-sm text-muted-foreground">HSN: {item.hsn}</div>}
                              </div>
                            </TableCell>
                            <TableCell>{item.qty || item.quantity || 1}</TableCell>
                            <TableCell>{formatCurrency(item.rate || 0)}</TableCell>
                            <TableCell>{formatCurrency(item.amount || item.total || 0)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No items data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Totals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div></div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(selectedInvoice.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST:</span>
                      <span>{formatCurrency(selectedInvoice.total_tax || 0)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedInvoice.net_total)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Paid:</span>
                      <span>{formatCurrency(selectedInvoice.payment_received || 0)}</span>
                    </div>
                    <div className={`flex justify-between ${selectedInvoice.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <span>Balance:</span>
                      <span>{formatCurrency(selectedInvoice.balance_due || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button asChild>
                    <Link href={`/sales-entry?edit=${selectedInvoice.id}`}>
                      Edit Invoice
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  )
}
