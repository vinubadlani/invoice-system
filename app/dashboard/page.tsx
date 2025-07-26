"use client"

import { useState, useEffect, useMemo } from "react"
import { useOptimizedData } from "@/lib/cache-store"
import { TrendingUp, Users, FileText, DollarSign, ShoppingCart, Package, CreditCard, AlertCircle, Loader2 } from "lucide-react"
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your business.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="dashboard-stats-card border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">₹{stats.totalSales.toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-1">
                This month: ₹{stats.thisMonthSales.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-stats-card border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{stats.totalPurchases.toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-1">
                This month: ₹{stats.thisMonthPurchases.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-stats-card border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                ₹{stats.profit.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600 mt-1">Sales - Purchases</p>
            </CardContent>
          </Card>

          <Card className="dashboard-stats-card border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingInvoices}</div>
              <p className="text-xs text-gray-600 mt-1">Awaiting payment</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="quick-actions-grid grid grid-cols-2 md:grid-cols-4">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <Button variant="outline" className="quick-action-button w-full flex flex-col gap-2 hover:bg-gray-50">
                    <div className={`quick-action-icon ${action.color}`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium">{action.title}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Business Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Activity
                <Badge variant="outline">{recentActivities.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div key={activity.id} className="activity-item flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`activity-icon ${
                          activity.type === 'sale' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'purchase' ? 'bg-green-100 text-green-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          {activity.type === 'sale' ? <TrendingUp className="h-4 w-4" /> :
                           activity.type === 'purchase' ? <ShoppingCart className="h-4 w-4" /> :
                           <CreditCard className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{activity.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{activity.amount.toLocaleString()}</p>
                        <Badge variant={activity.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Business Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="overview-metric-card bg-blue-50">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{stats.totalParties}</div>
                  <p className="text-sm text-gray-600">Total Parties</p>
                </div>
                <div className="overview-metric-card bg-green-50">
                  <Package className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{stats.totalItems}</div>
                  <p className="text-sm text-gray-600">Total Items</p>
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Monthly Sales Target</span>
                    <span>₹{stats.thisMonthSales.toLocaleString()} / ₹500,000</span>
                  </div>
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${Math.min((stats.thisMonthSales / 500000) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Collection Efficiency</span>
                    <span>{stats.pendingInvoices === 0 ? 100 : Math.max(0, 100 - (stats.pendingInvoices * 10))}%</span>
                  </div>
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${stats.pendingInvoices === 0 ? 100 : Math.max(0, 100 - (stats.pendingInvoices * 10))}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
