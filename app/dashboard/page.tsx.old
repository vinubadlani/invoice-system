"use client"

import { useState, useEffect, useMemo } from "react"
import { useOptimizedData } from "@/lib/cache-store"
import { TrendingUp, TrendingDown, Users, FileText, DollarSign, ShoppingCart, Package, CreditCard, AlertCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface DashboardStats {
  totalSales: number
  totalPurchases: number
  totalParties: number
  totalItems: number
  pendingInvoices: number
  thisMonthSales: number
  thisMonthPurchases: number
  profit: number
}

interface RecentActivity {
  id: string
  type: "sale" | "purchase" | "payment"
  description: string
  amount: number
  date: string
  status: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const { fetchRecentInvoices, fetchParties, fetchItems } = useOptimizedData()
  const { toast } = useToast()

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadDashboardData(business.id)
    } else {
      setLoading(false)
    }
  }, [])

  const loadDashboardData = async (businessId: string) => {
    try {
      setLoading(true)
      
      // Load data in parallel for faster loading
      const [salesInvoices, purchaseInvoices, parties, items] = await Promise.all([
        fetchRecentInvoices(businessId, "sales", 50),
        fetchRecentInvoices(businessId, "purchase", 50),
        fetchParties(businessId),
        fetchItems(businessId)
      ])

      // Calculate stats efficiently
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const totalSales = salesInvoices.reduce((sum, inv) => sum + (inv.net_total || 0), 0)
      const totalPurchases = purchaseInvoices.reduce((sum, inv) => sum + (inv.net_total || 0), 0)
      const pendingInvoices = salesInvoices.filter(inv => (inv.balance_due || 0) > 0).length
      
      const thisMonthSales = salesInvoices
        .filter(inv => new Date(inv.date) >= thisMonth)
        .reduce((sum, inv) => sum + (inv.net_total || 0), 0)
      
      const thisMonthPurchases = purchaseInvoices
        .filter(inv => new Date(inv.date) >= thisMonth)
        .reduce((sum, inv) => sum + (inv.net_total || 0), 0)

      const calculatedStats: DashboardStats = {
        totalSales,
        totalPurchases,
        totalParties: parties.length,
        totalItems: items.length,
        pendingInvoices,
        thisMonthSales,
        thisMonthPurchases,
        profit: totalSales - totalPurchases
      }

      setStats(calculatedStats)

      // Create recent activities from invoices
      const activities: RecentActivity[] = [
        ...salesInvoices.slice(0, 5).map(inv => ({
          id: inv.id,
          type: "sale" as const,
          description: `Sale to ${inv.party_name}`,
          amount: inv.net_total || 0,
          date: inv.date,
          status: (inv.balance_due || 0) <= 0 ? "paid" : "pending"
        })),
        ...purchaseInvoices.slice(0, 5).map(inv => ({
          id: inv.id,
          type: "purchase" as const,
          description: `Purchase from ${inv.party_name}`,
          amount: inv.net_total || 0,
          date: inv.date,
          status: (inv.balance_due || 0) <= 0 ? "paid" : "pending"
        }))
      ]

      // Sort by date and take recent 10
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecentActivities(activities.slice(0, 10))

    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Memoized quick actions to prevent re-renders
  const quickActions = useMemo(() => [
    { title: "New Sale", href: "/sales-entry", icon: ShoppingCart, color: "bg-blue-500" },
    { title: "New Purchase", href: "/purchase-entry", icon: Package, color: "bg-green-500" },
    { title: "Add Party", href: "/party", icon: Users, color: "bg-purple-500" },
    { title: "Add Item", href: "/item", icon: FileText, color: "bg-orange-500" },
  ], [])

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!businessId || !stats) {
    return (
      <AuthenticatedLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Business Selected</h2>
          <p className="text-gray-500">Please select a business to view the dashboard</p>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-4 space-y-6">
          {/* Modern Header with Gradient */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-2xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
            <div className="relative p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Business Dashboard
                  </h1>
                  <p className="text-blue-100 text-base opacity-90">
                    Transform your business insights with real-time analytics
                  </p>
                </div>
                <div className="hidden lg:block">
                  <div className="w-24 h-24 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center">
                    <TrendingUp className="w-12 h-12 text-white/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-blue-700">Total Sales</CardTitle>
                <div className="p-2 bg-blue-500 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-blue-800 mb-1">
                  ₹{stats.totalSales.toLocaleString()}
                </div>
                <p className="text-blue-600 text-xs font-medium">
                  This month: ₹{stats.thisMonthSales.toLocaleString()}
                </p>
                <div className="absolute bottom-2 right-2 opacity-20">
                  <DollarSign className="h-6 w-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-700">Total Purchases</CardTitle>
                <div className="p-2 bg-emerald-500 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-emerald-800 mb-1">
                  ₹{stats.totalPurchases.toLocaleString()}
                </div>
                <p className="text-emerald-600 text-xs font-medium">
                  This month: ₹{stats.thisMonthPurchases.toLocaleString()}
                </p>
                <div className="absolute bottom-2 right-2 opacity-20">
                  <Package className="h-6 w-6 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-purple-700">Net Profit</CardTitle>
                <div className={`p-2 ${stats.profit >= 0 ? 'bg-purple-500' : 'bg-red-500'} rounded-lg shadow-md group-hover:scale-110 transition-transform`}>
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className={`text-2xl font-bold mb-1 ${stats.profit >= 0 ? 'text-purple-800' : 'text-red-700'}`}>
                  ₹{stats.profit.toLocaleString()}
                </div>
                <p className={`text-xs font-medium ${stats.profit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {stats.profit >= 0 ? 'Profitable' : 'Loss'} this period
                </p>
                <div className="absolute bottom-2 right-2 opacity-20">
                  {stats.profit >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-amber-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-amber-700">Pending Invoices</CardTitle>
                <div className="p-2 bg-amber-500 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-amber-800 mb-1">
                  {stats.pendingInvoices}
                </div>
                <p className="text-amber-600 text-xs font-medium">
                  Awaiting payment
                </p>
                <div className="absolute bottom-2 right-2 opacity-20">
                  <FileText className="h-6 w-6 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Modern Quick Actions */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 py-4">
              <CardTitle className="text-lg font-bold text-slate-800">Quick Actions</CardTitle>
              <p className="text-slate-600 text-sm">Create new transactions with ease</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <Link key={action.title} href={action.href}>
                    <div className="group relative p-4 bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className={`p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 ${action.color.replace('bg-', 'bg-gradient-to-br from-').replace('-500', '-400 to-' + action.color.split('-')[1] + '-600')}`}>
                          <action.icon className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                          {action.title}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Activity & Overview Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Modern Recent Activity */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-blue-900">Recent Activity</CardTitle>
                    <p className="text-blue-600 text-sm">Latest business transactions</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                    {recentActivities.length} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity, index) => (
                      <div key={activity.id} className="group flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg shadow-md ${
                            activity.type === 'sale' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                            activity.type === 'purchase' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                            'bg-gradient-to-br from-purple-500 to-purple-600'
                          }`}>
                            {activity.type === 'sale' ? <TrendingUp className="h-3 w-3 text-white" /> :
                             activity.type === 'purchase' ? <ShoppingCart className="h-3 w-3 text-white" /> :
                             <CreditCard className="h-3 w-3 text-white" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-xs group-hover:text-slate-900 transition-colors">
                              {activity.description}
                            </p>
                            <p className="text-slate-500 text-xs">
                              {new Date(activity.date).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800 text-xs">
                            ₹{activity.amount.toLocaleString()}
                          </p>
                          <Badge 
                            variant={activity.status === 'paid' ? 'default' : 'secondary'} 
                            className={`text-xs ${activity.status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}
                          >
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-sm">No recent activity</p>
                      <p className="text-slate-400 text-xs">Start creating transactions to see activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Business Overview */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 py-4">
                <div>
                  <CardTitle className="text-lg font-bold text-purple-900">Business Overview</CardTitle>
                  <p className="text-purple-600 text-sm">Key metrics and performance indicators</p>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-xl font-bold text-blue-800 mb-1">{stats.totalParties}</div>
                    <p className="text-blue-600 text-xs font-medium">Total Parties</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-xl font-bold text-emerald-800 mb-1">{stats.totalItems}</div>
                    <p className="text-emerald-600 text-xs font-medium">Total Items</p>
                  </div>
                </div>

                {/* Modern Progress Indicators */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-slate-700">Monthly Sales Target</span>
                      <span className="text-xs font-bold text-slate-800">
                        ₹{stats.thisMonthSales.toLocaleString()} / ₹5,00,000
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-sm transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min((stats.thisMonthSales / 500000) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {((stats.thisMonthSales / 500000) * 100).toFixed(1)}% of monthly target achieved
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-slate-700">Collection Efficiency</span>
                      <span className="text-xs font-bold text-slate-800">
                        {stats.pendingInvoices === 0 ? 100 : Math.max(0, 100 - (stats.pendingInvoices * 10))}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-sm transition-all duration-1000 ease-out"
                        style={{ width: `${stats.pendingInvoices === 0 ? 100 : Math.max(0, 100 - (stats.pendingInvoices * 10))}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {stats.pendingInvoices === 0 ? 'Perfect collection rate' : `${stats.pendingInvoices} pending invoices`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
