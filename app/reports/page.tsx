"use client"

import { useState, useEffect } from "react"
import { fetchInvoices, queryBuilder, getCurrentUser } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Download, 
  Calendar,
  BarChart3,
  PieChart,
  Receipt,
  CreditCard,
  Target
} from "lucide-react"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"

interface SalesData {
  month: string
  year: number
  taxableAmount: number
  gstAmount: number
  totalAmount: number
  invoiceCount: number
}

interface PurchaseData {
  month: string
  year: number
  taxableAmount: number
  gstAmount: number
  totalAmount: number
  invoiceCount: number
}

interface PaymentData {
  month: string
  year: number
  received: number
  paid: number
  receivedCount: number
  paidCount: number
}

interface PartyData {
  party_name: string
  totalSales: number
  totalPurchases: number
  balance: number
  invoiceCount: number
}

export default function ReportsPage() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [purchaseData, setPurchaseData] = useState<PurchaseData[]>([])
  const [paymentData, setPaymentData] = useState<PaymentData[]>([])
  const [partyData, setPartyData] = useState<PartyData[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [reportType, setReportType] = useState<string>("monthly")

  const { toast } = useToast()

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      
      // Set default date range (current year)
      const currentYear = new Date().getFullYear()
      setDateFrom(`${currentYear}-01-01`)
      setDateTo(`${currentYear}-12-31`)
      
      loadReportsData(business.id, `${currentYear}-01-01`, `${currentYear}-12-31`)
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (businessId && dateFrom && dateTo) {
      loadReportsData(businessId, dateFrom, dateTo)
    }
  }, [businessId, dateFrom, dateTo])

  const loadReportsData = async (businessId: string, fromDate: string, toDate: string) => {
    try {
      setLoading(true)
      const user = await getCurrentUser()

      // Load all data in parallel
      const [salesInvoices, purchaseInvoices, payments] = await Promise.all([
        fetchInvoices(businessId, 'sales', 1000, user?.id),
        fetchInvoices(businessId, 'purchase', 1000, user?.id),
        queryBuilder('payments', '*', { business_id: businessId }, { orderBy: 'date', ascending: false })
      ])

      // Filter by date range
      const filterByDate = (data: any[]) => data.filter(item => {
        const itemDate = new Date(item.date)
        return itemDate >= new Date(fromDate) && itemDate <= new Date(toDate)
      })

      const filteredSales = filterByDate(salesInvoices)
      const filteredPurchases = filterByDate(purchaseInvoices)
      const filteredPayments = Array.isArray(payments) ? filterByDate(payments) : []

      // Process sales data by month
      const salesByMonth = processByMonth(filteredSales, 'sales')
      setSalesData(salesByMonth)

      // Process purchase data by month
      const purchasesByMonth = processByMonth(filteredPurchases, 'purchase')
      setPurchaseData(purchasesByMonth)

      // Process payment data by month
      const paymentsByMonth = processPaymentsByMonth(filteredPayments)
      setPaymentData(paymentsByMonth)

      // Process party-wise data
      const partyWiseData = processPartyData(filteredSales, filteredPurchases, filteredPayments)
      setPartyData(partyWiseData)

    } catch (error) {
      console.error("Error loading reports data:", error)
      toast({
        title: "Error",
        description: "Failed to load reports data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const processByMonth = (invoices: any[], type: 'sales' | 'purchase') => {
    const monthlyData: Record<string, SalesData | PurchaseData> = {}

    invoices.forEach(invoice => {
      const date = new Date(invoice.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          year: date.getFullYear(),
          taxableAmount: 0,
          gstAmount: 0,
          totalAmount: 0,
          invoiceCount: 0
        }
      }

      const taxable = invoice.sub_total || 0
      const gst = invoice.gst_amount || 0
      const total = invoice.net_total || invoice.total_amount || 0

      monthlyData[monthKey].taxableAmount += taxable
      monthlyData[monthKey].gstAmount += gst
      monthlyData[monthKey].totalAmount += total
      monthlyData[monthKey].invoiceCount += 1
    })

    return Object.values(monthlyData).sort((a, b) => 
      new Date(a.year, parseInt(a.month.split(' ')[0]) - 1).getTime() - 
      new Date(b.year, parseInt(b.month.split(' ')[0]) - 1).getTime()
    )
  }

  const processPaymentsByMonth = (payments: any[]) => {
    const monthlyData: Record<string, PaymentData> = {}

    payments.forEach(payment => {
      const date = new Date(payment.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          year: date.getFullYear(),
          received: 0,
          paid: 0,
          receivedCount: 0,
          paidCount: 0
        }
      }

      if (payment.type === 'Received') {
        monthlyData[monthKey].received += payment.amount || 0
        monthlyData[monthKey].receivedCount += 1
      } else {
        monthlyData[monthKey].paid += payment.amount || 0
        monthlyData[monthKey].paidCount += 1
      }
    })

    return Object.values(monthlyData).sort((a, b) => 
      new Date(a.year, parseInt(a.month.split(' ')[0]) - 1).getTime() - 
      new Date(b.year, parseInt(b.month.split(' ')[0]) - 1).getTime()
    )
  }

  const processPartyData = (sales: any[], purchases: any[], payments: any[]) => {
    const partyMap: Record<string, PartyData> = {}

    // Process sales
    sales.forEach(invoice => {
      const party = invoice.party_name
      if (!partyMap[party]) {
        partyMap[party] = {
          party_name: party,
          totalSales: 0,
          totalPurchases: 0,
          balance: 0,
          invoiceCount: 0
        }
      }
      partyMap[party].totalSales += invoice.net_total || 0
      partyMap[party].invoiceCount += 1
    })

    // Process purchases
    purchases.forEach(invoice => {
      const party = invoice.party_name
      if (!partyMap[party]) {
        partyMap[party] = {
          party_name: party,
          totalSales: 0,
          totalPurchases: 0,
          balance: 0,
          invoiceCount: 0
        }
      }
      partyMap[party].totalPurchases += invoice.net_total || 0
      partyMap[party].invoiceCount += 1
    })

    // Calculate balances (sales - purchases + payments)
    Object.values(partyMap).forEach(party => {
      const partyPayments = payments.filter(p => p.party_name === party.party_name)
      const received = partyPayments.filter(p => p.type === 'Received').reduce((sum, p) => sum + (p.amount || 0), 0)
      const paid = partyPayments.filter(p => p.type === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0)
      party.balance = party.totalSales - party.totalPurchases - received + paid
    })

    return Object.values(partyMap).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
  }

  const exportReport = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers,
      ...data.map(row => headers.map(header => {
        const key = header.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '')
        return row[key] || row[header] || ''
      }))
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Calculate totals
  const totalSales = salesData.reduce((sum, item) => sum + item.totalAmount, 0)
  const totalPurchases = purchaseData.reduce((sum, item) => sum + item.totalAmount, 0)
  const totalGSTCollected = salesData.reduce((sum, item) => sum + item.gstAmount, 0)
  const totalGSTPaid = purchaseData.reduce((sum, item) => sum + item.gstAmount, 0)
  const netGSTLiability = totalGSTCollected - totalGSTPaid
  const totalPaymentsReceived = paymentData.reduce((sum, item) => sum + item.received, 0)
  const totalPaymentsMade = paymentData.reduce((sum, item) => sum + item.paid, 0)
  const netCashFlow = totalPaymentsReceived - totalPaymentsMade

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Business Reports</h1>
              <p className="text-slate-600 dark:text-slate-400">Comprehensive analysis of your business performance</p>
            </div>
          </div>

          {/* Date Range Filter */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Report Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">To Date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Report Type</label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly Summary</SelectItem>
                      <SelectItem value="quarterly">Quarterly Summary</SelectItem>
                      <SelectItem value="yearly">Yearly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-blue-700">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800">₹{totalSales.toLocaleString()}</div>
                <p className="text-xs text-blue-600 mt-1">{salesData.reduce((sum, item) => sum + item.invoiceCount, 0)} invoices</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-red-700">Total Purchases</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-800">₹{totalPurchases.toLocaleString()}</div>
                <p className="text-xs text-red-600 mt-1">{purchaseData.reduce((sum, item) => sum + item.invoiceCount, 0)} invoices</p>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${netGSTLiability >= 0 ? 'from-green-50 to-green-100' : 'from-orange-50 to-orange-100'} border-0 shadow-lg`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-semibold ${netGSTLiability >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                  Net GST Liability
                </CardTitle>
                <Receipt className={`h-4 w-4 ${netGSTLiability >= 0 ? 'text-green-600' : 'text-orange-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netGSTLiability >= 0 ? 'text-green-800' : 'text-orange-800'}`}>
                  ₹{Math.abs(netGSTLiability).toLocaleString()}
                </div>
                <p className={`text-xs mt-1 ${netGSTLiability >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {netGSTLiability >= 0 ? 'To Pay' : 'Refund Due'}
                </p>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${netCashFlow >= 0 ? 'from-purple-50 to-purple-100' : 'from-gray-50 to-gray-100'} border-0 shadow-lg`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-semibold ${netCashFlow >= 0 ? 'text-purple-700' : 'text-gray-700'}`}>
                  Net Cash Flow
                </CardTitle>
                <CreditCard className={`h-4 w-4 ${netCashFlow >= 0 ? 'text-purple-600' : 'text-gray-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-purple-800' : 'text-gray-800'}`}>
                  ₹{Math.abs(netCashFlow).toLocaleString()}
                </div>
                <p className={`text-xs mt-1 ${netCashFlow >= 0 ? 'text-purple-600' : 'text-gray-600'}`}>
                  {netCashFlow >= 0 ? 'Positive' : 'Negative'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Reports Tabs */}
          <Tabs defaultValue="sales" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sales">Sales Reports</TabsTrigger>
              <TabsTrigger value="purchases">Purchase Reports</TabsTrigger>
              <TabsTrigger value="payments">Payment Reports</TabsTrigger>
              <TabsTrigger value="parties">Party Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sales Summary (Monthly)
                  </CardTitle>
                  <Button 
                    onClick={() => exportReport(salesData, 'sales-report', ['Month', 'Taxable Amount', 'GST Amount', 'Total Amount', 'Invoice Count'])}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Taxable Amount</TableHead>
                          <TableHead>GST Amount</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Invoice Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{row.month}</TableCell>
                            <TableCell>₹{row.taxableAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-green-600 font-medium">₹{row.gstAmount.toLocaleString()}</TableCell>
                            <TableCell className="font-bold">₹{row.totalAmount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.invoiceCount}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableRow>
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="font-bold">₹{salesData.reduce((sum, row) => sum + row.taxableAmount, 0).toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-green-600">₹{totalGSTCollected.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">₹{totalSales.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">
                          <Badge>{salesData.reduce((sum, row) => sum + row.invoiceCount, 0)}</Badge>
                        </TableCell>
                      </TableRow>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="purchases">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Purchase Summary (Monthly)
                  </CardTitle>
                  <Button 
                    onClick={() => exportReport(purchaseData, 'purchase-report', ['Month', 'Taxable Amount', 'GST Amount', 'Total Amount', 'Invoice Count'])}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Taxable Amount</TableHead>
                          <TableHead>GST Amount</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Invoice Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{row.month}</TableCell>
                            <TableCell>₹{row.taxableAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-red-600 font-medium">₹{row.gstAmount.toLocaleString()}</TableCell>
                            <TableCell className="font-bold">₹{row.totalAmount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.invoiceCount}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableRow>
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="font-bold">₹{purchaseData.reduce((sum, row) => sum + row.taxableAmount, 0).toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-red-600">₹{totalGSTPaid.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">₹{totalPurchases.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">
                          <Badge>{purchaseData.reduce((sum, row) => sum + row.invoiceCount, 0)}</Badge>
                        </TableCell>
                      </TableRow>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Summary (Monthly)
                  </CardTitle>
                  <Button 
                    onClick={() => exportReport(paymentData, 'payment-report', ['Month', 'Received', 'Paid', 'Net Flow', 'Total Transactions'])}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Payments Received</TableHead>
                          <TableHead>Payments Made</TableHead>
                          <TableHead>Net Flow</TableHead>
                          <TableHead>Total Transactions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{row.month}</TableCell>
                            <TableCell className="text-green-600 font-medium">₹{row.received.toLocaleString()}</TableCell>
                            <TableCell className="text-red-600 font-medium">₹{row.paid.toLocaleString()}</TableCell>
                            <TableCell className={`font-bold ${(row.received - row.paid) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{Math.abs(row.received - row.paid).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.receivedCount + row.paidCount}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableRow>
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="font-bold text-green-600">₹{totalPaymentsReceived.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-red-600">₹{totalPaymentsMade.toLocaleString()}</TableCell>
                        <TableCell className={`font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{Math.abs(netCashFlow).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-bold">
                          <Badge>{paymentData.reduce((sum, row) => sum + row.receivedCount + row.paidCount, 0)}</Badge>
                        </TableCell>
                      </TableRow>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="parties">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Party-wise Analysis
                  </CardTitle>
                  <Button 
                    onClick={() => exportReport(partyData, 'party-analysis', ['Party Name', 'Total Sales', 'Total Purchases', 'Outstanding Balance', 'Invoice Count'])}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Party Name</TableHead>
                          <TableHead>Total Sales</TableHead>
                          <TableHead>Total Purchases</TableHead>
                          <TableHead>Outstanding Balance</TableHead>
                          <TableHead>Invoice Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partyData.slice(0, 20).map((party, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{party.party_name}</TableCell>
                            <TableCell className="text-green-600">₹{party.totalSales.toLocaleString()}</TableCell>
                            <TableCell className="text-red-600">₹{party.totalPurchases.toLocaleString()}</TableCell>
                            <TableCell className={`font-medium ${party.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                              ₹{Math.abs(party.balance).toLocaleString()} {party.balance >= 0 ? 'Dr' : 'Cr'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{party.invoiceCount}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {partyData.length > 20 && (
                    <p className="text-sm text-gray-500 mt-4 text-center">
                      Showing top 20 parties. Export to see all data.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
