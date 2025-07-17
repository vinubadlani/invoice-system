"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/AuthProvider"
import { BarChart3, Users, Package, ShoppingCart, CreditCard, TrendingUp, DollarSign } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

interface ChartDataPoint {
  month: string
  sales: number
}

interface MonthlyComparisonData {
  month: string
  sales: number
  purchases: number
}

interface CategoryBreakdownData {
  name: string
  value: number
  color: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalParties: 0,
    totalItems: 0,
    salesThisMonth: 0,
    outstandingAmount: 0,
    totalInvoices: 0,
    totalPurchases: 0,
  })

  const [chartData, setChartData] = useState<{
    salesTrend: ChartDataPoint[]
    categoryBreakdown: CategoryBreakdownData[]
    monthlyComparison: MonthlyComparisonData[]
  }>({
    salesTrend: [],
    categoryBreakdown: [],
    monthlyComparison: [],
  })

  useEffect(() => {
    if (user) {
      fetchBusinessId()
    }
  }, [user])

  useEffect(() => {
    if (businessId) {
      fetchDashboardData()
    }
  }, [businessId])

  const fetchBusinessId = async () => {
    try {
      const { data } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user?.id)
        .single()

      if (data) {
        setBusinessId(data.id)
      }
    } catch (error) {
      console.error("Error fetching business ID:", error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      // Fetch parties count
      const { count: partiesCount } = await supabase
        .from("parties")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)

      // Fetch items count
      const { count: itemsCount } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)

      // Fetch invoices for calculations
      const { data: invoices } = await supabase.from("invoices").select("*").eq("business_id", businessId)

      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()

      const salesThisMonth =
        invoices
          ?.filter((inv) => {
            const invDate = new Date(inv.date)
            return inv.type === "sales" && invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear
          })
          .reduce((sum, inv) => sum + inv.net_total, 0) || 0

      const outstandingAmount =
        invoices?.filter((inv) => inv.type === "sales").reduce((sum, inv) => sum + inv.balance_due, 0) || 0

      const totalPurchases =
        invoices?.filter((inv) => inv.type === "purchase").reduce((sum, inv) => sum + inv.net_total, 0) || 0

      setStats({
        totalParties: partiesCount || 0,
        totalItems: itemsCount || 0,
        salesThisMonth,
        outstandingAmount,
        totalInvoices: invoices?.filter((inv) => inv.type === "sales").length || 0,
        totalPurchases,
      })

      // Generate chart data
      generateChartData(invoices || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    }
  }

  const generateChartData = (invoices: any[]) => {
    // Sales trend for last 6 months
    const salesTrend: ChartDataPoint[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthName = date.toLocaleDateString("en-US", { month: "short" })

      const monthSales = invoices
        .filter((inv) => {
          const invDate = new Date(inv.date)
          return (
            inv.type === "sales" &&
            invDate.getMonth() === date.getMonth() &&
            invDate.getFullYear() === date.getFullYear()
          )
        })
        .reduce((sum, inv) => sum + inv.net_total, 0)

      salesTrend.push({ month: monthName, sales: monthSales })
    }

    // Monthly comparison
    const monthlyComparison: MonthlyComparisonData[] = []
    for (let i = 2; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthName = date.toLocaleDateString("en-US", { month: "short" })

      const sales = invoices
        .filter((inv) => {
          const invDate = new Date(inv.date)
          return (
            inv.type === "sales" &&
            invDate.getMonth() === date.getMonth() &&
            invDate.getFullYear() === date.getFullYear()
          )
        })
        .reduce((sum, inv) => sum + inv.net_total, 0)

      const purchases = invoices
        .filter((inv) => {
          const invDate = new Date(inv.date)
          return (
            inv.type === "purchase" &&
            invDate.getMonth() === date.getMonth() &&
            invDate.getFullYear() === date.getFullYear()
          )
        })
        .reduce((sum, inv) => sum + inv.net_total, 0)

      monthlyComparison.push({ month: monthName, sales, purchases })
    }

    setChartData({
      salesTrend,
      categoryBreakdown: [
        { name: "Sales", value: stats.salesThisMonth, color: "#3B82F6" },
        { name: "Outstanding", value: stats.outstandingAmount, color: "#EF4444" },
        { name: "Purchases", value: stats.totalPurchases, color: "#10B981" },
      ],
      monthlyComparison,
    })
  }

  const statCards = [
    {
      name: "Total Parties",
      value: stats.totalParties.toString(),
      icon: Users,
      color: "bg-blue-500",
      change: "+12%",
    },
    {
      name: "Total Items",
      value: stats.totalItems.toString(),
      icon: Package,
      color: "bg-green-500",
      change: "+8%",
    },
    {
      name: "Sales This Month",
      value: `₹${stats.salesThisMonth.toLocaleString()}`,
      icon: ShoppingCart,
      color: "bg-purple-500",
      change: "+23%",
    },
    {
      name: "Outstanding Amount",
      value: `₹${stats.outstandingAmount.toLocaleString()}`,
      icon: CreditCard,
      color: "bg-orange-500",
      change: "-5%",
    },
    {
      name: "Total Invoices",
      value: stats.totalInvoices.toString(),
      icon: BarChart3,
      color: "bg-indigo-500",
      change: "+15%",
    },
    {
      name: "Total Purchases",
      value: `₹${stats.totalPurchases.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-pink-500",
      change: "+10%",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your business today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                <span className="text-sm text-gray-500 ml-1">from last month</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Sales"]} />
              <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Comparison Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales vs Purchases (Last 3 Months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`]} />
              <Bar dataKey="sales" fill="#3B82F6" name="Sales" />
              <Bar dataKey="purchases" fill="#10B981" name="Purchases" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Business Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Overview */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-900">₹{(stats.salesThisMonth * 12).toLocaleString()}</p>
              <p className="text-sm text-green-600">Projected Annual</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800">Profit Margin</h3>
              <p className="text-2xl font-bold text-blue-900">
                {stats.salesThisMonth > 0
                  ? Math.round(((stats.salesThisMonth - stats.totalPurchases) / stats.salesThisMonth) * 100)
                  : 0}
                %
              </p>
              <p className="text-sm text-blue-600">This Month</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-orange-800">Collection Efficiency</h3>
              <p className="text-2xl font-bold text-orange-900">
                {stats.salesThisMonth > 0
                  ? Math.round(((stats.salesThisMonth - stats.outstandingAmount) / stats.salesThisMonth) * 100)
                  : 0}
                %
              </p>
              <p className="text-sm text-orange-600">Payment Collection</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-800">Average Invoice</h3>
              <p className="text-2xl font-bold text-purple-900">
                ₹{stats.totalInvoices > 0 ? Math.round(stats.salesThisMonth / stats.totalInvoices).toLocaleString() : 0}
              </p>
              <p className="text-sm text-purple-600">Per Invoice</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/sales-entry"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <ShoppingCart className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <span className="text-sm font-medium text-gray-900">New Sale</span>
                <p className="text-xs text-gray-500">Create sales invoice</p>
              </div>
            </a>
            <a
              href="/purchase-entry"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <Package className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <span className="text-sm font-medium text-gray-900">New Purchase</span>
                <p className="text-xs text-gray-500">Record purchase</p>
              </div>
            </a>
            <a
              href="/party"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <Users className="h-6 w-6 text-purple-600 mr-3" />
              <div>
                <span className="text-sm font-medium text-gray-900">Add Party</span>
                <p className="text-xs text-gray-500">Customer/Supplier</p>
              </div>
            </a>
            <a
              href="/payments"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <CreditCard className="h-6 w-6 text-orange-600 mr-3" />
              <div>
                <span className="text-sm font-medium text-gray-900">Record Payment</span>
                <p className="text-xs text-gray-500">Payment received/made</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
