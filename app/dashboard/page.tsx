"use client"

import { useState, useEffect, useMemo } from "react"
import { useOptimizedData } from "@/lib/cache-store"
import {
  TrendingUp, TrendingDown, Users, FileText, DollarSign,
  ShoppingCart, ShoppingBag, Package, CreditCard, AlertCircle, Loader2,
  ArrowUpRight, ArrowDownRight, ReceiptText, PlusCircle, BarChart2,
  BookOpen, Building2, Activity, Clock
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useBusiness } from "@/app/context/BusinessContext"
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
  const [loadError, setLoadError] = useState(false)
  const [progress, setProgress] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const { selectedBusiness } = useBusiness()
  const businessId = selectedBusiness?.id ?? ""
  const { fetchRecentInvoices, fetchParties, fetchItems } = useOptimizedData()
  const { toast } = useToast()

  const loadDashboardData = async (bId: string) => {
    try {
      setLoading(true)
      setLoadError(false)
      setProgress(0)

      // Animate progress bar from 0 → 85% while fetch is in-flight
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) { clearInterval(progressInterval); return 85 }
          return prev + (85 - prev) * 0.08
        })
      }, 120)

      const [salesInvoices, purchaseInvoices, parties, items] = await Promise.all([
        fetchRecentInvoices(bId, "sales", 50),
        fetchRecentInvoices(bId, "purchase", 50),
        fetchParties(bId),
        fetchItems(bId)
      ])

      clearInterval(progressInterval)
      setProgress(100)

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

      setStats({
        totalSales, totalPurchases,
        totalParties: parties.length, totalItems: items.length,
        pendingInvoices, thisMonthSales, thisMonthPurchases,
        profit: totalSales - totalPurchases
      })

      const activities: RecentActivity[] = [
        ...salesInvoices.slice(0, 5).map(inv => ({
          id: inv.id, type: "sale" as const,
          description: `Sale to ${inv.party_name}`,
          amount: inv.net_total || 0, date: inv.date,
          status: (inv.balance_due || 0) <= 0 ? "paid" : "pending"
        })),
        ...purchaseInvoices.slice(0, 5).map(inv => ({
          id: inv.id, type: "purchase" as const,
          description: `Purchase from ${inv.party_name}`,
          amount: inv.net_total || 0, date: inv.date,
          status: (inv.balance_due || 0) <= 0 ? "paid" : "pending"
        }))
      ]
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecentActivities(activities.slice(0, 10))
      // Small pause so the bar visually completes at 100% before showing content
      await new Promise(res => setTimeout(res, 300))
      setLoading(false)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      setProgress(0)
      if (retryCount < 2) {
        // Auto-retry up to 2 times with a short delay
        setRetryCount(r => r + 1)
        setTimeout(() => loadDashboardData(bId), 1500)
      } else {
        setLoadError(true)
        toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" })
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (businessId) {
      setRetryCount(0)
      loadDashboardData(businessId)
    } else {
      setLoading(false)
    }
  }, [businessId])

  const quickActions = useMemo(() => [
    { title: "New Sale", href: "/sales-entry", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40", desc: "Create sales invoice" },
    { title: "New Purchase", href: "/purchase-entry", icon: ShoppingBag, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", desc: "Record purchase" },
    { title: "Add Party", href: "/party", icon: Users, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40", desc: "Manage customers" },
    { title: "Add Item", href: "/item", icon: Package, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", desc: "Manage inventory" },
    { title: "Payments", href: "/payments", icon: CreditCard, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/40", desc: "Record payment" },
    { title: "Reports", href: "/reports", icon: BarChart2, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/40", desc: "View analytics" },
    { title: "Ledger", href: "/ledger", icon: BookOpen, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/40", desc: "Party ledger" },
    { title: "Bank", href: "/bank", icon: Building2, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/40", desc: "Bank accounts" },
  ], [])

  if (loading) {
    const steps = [
      { label: "Connecting to database", threshold: 20 },
      { label: "Loading sales data", threshold: 45 },
      { label: "Loading parties & items", threshold: 70 },
      { label: "Building dashboard", threshold: 90 },
    ]
    const currentStep = steps.filter(s => progress >= s.threshold).pop() ?? steps[0]
    return (
      <AuthenticatedLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-5">
          <div className="w-64 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 font-medium">{currentStep.label}…</span>
              <span className="text-gray-400 text-xs tabular-nums">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!businessId) {
    return (
      <AuthenticatedLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">No Business Selected</h2>
          <p className="text-sm text-gray-500">Please select a business to view the dashboard</p>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (loadError || !stats) {
    return (
      <AuthenticatedLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Failed to load data</h2>
          <p className="text-sm text-gray-500">Could not fetch dashboard data.</p>
          <Button size="sm" onClick={() => { setRetryCount(0); loadDashboardData(businessId) }}>
            Retry
          </Button>
        </div>
      </AuthenticatedLayout>
    )
  }

  const statCards = [
    {
      label: "Total Sales",
      value: `₹${stats.totalSales.toLocaleString()}`,
      sub: `This month: ₹${stats.thisMonthSales.toLocaleString()}`,
      icon: TrendingUp,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      trend: "up",
    },
    {
      label: "Total Purchases",
      value: `₹${stats.totalPurchases.toLocaleString()}`,
      sub: `This month: ₹${stats.thisMonthPurchases.toLocaleString()}`,
      icon: ShoppingCart,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      trend: null,
    },
    {
      label: "Net Profit",
      value: `₹${stats.profit.toLocaleString()}`,
      sub: stats.profit >= 0 ? "Profitable period" : "Loss this period",
      icon: stats.profit >= 0 ? ArrowUpRight : ArrowDownRight,
      iconColor: stats.profit >= 0 ? "text-violet-600" : "text-red-500",
      iconBg: stats.profit >= 0 ? "bg-violet-50 dark:bg-violet-950/40" : "bg-red-50 dark:bg-red-950/40",
      trend: stats.profit >= 0 ? "up" : "down",
    },
    {
      label: "Pending Invoices",
      value: stats.pendingInvoices.toString(),
      sub: "Awaiting payment",
      icon: Clock,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      trend: null,
    },
  ]

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Welcome back — here is what is happening today.
            </p>
          </div>
          <Link href="/sales-entry">
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.label} className="border border-gray-200 dark:border-gray-800 shadow-none hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{card.label}</p>
                      <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white truncate">{card.value}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.sub}</p>
                    </div>
                    <div className={`h-10 w-10 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0 ml-3`}>
                      <Icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Parties", value: stats.totalParties, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
            { label: "Total Items", value: stats.totalItems, icon: Package, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
            { label: "Sales Invoices", value: recentActivities.filter(a => a.type === "sale").length, icon: ReceiptText, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
            { label: "Activity", value: recentActivities.length, icon: Activity, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.label} className="border border-gray-200 dark:border-gray-800 shadow-none">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{item.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-none">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.title} href={action.href}>
                    <div className="group flex flex-col items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all text-center">
                      <div className={`h-10 w-10 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <Icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{action.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:block">{action.desc}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bottom row */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

          {/* Recent Activity */}
          <Card className="xl:col-span-3 border border-gray-200 dark:border-gray-800 shadow-none">
            <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</CardTitle>
              <Badge variant="secondary" className="text-xs">{recentActivities.length} records</Badge>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {recentActivities.length > 0 ? (
                <div className="space-y-1">
                  {recentActivities.map((activity, index) => (
                    <div key={activity.id}>
                      <div className="flex items-center gap-3 py-2.5">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          activity.type === "sale"
                            ? "bg-blue-50 dark:bg-blue-950/40"
                            : activity.type === "purchase"
                            ? "bg-emerald-50 dark:bg-emerald-950/40"
                            : "bg-violet-50 dark:bg-violet-950/40"
                        }`}>
                          {activity.type === "sale"
                            ? <TrendingUp className="h-4 w-4 text-blue-600" />
                            : activity.type === "purchase"
                            ? <ShoppingCart className="h-4 w-4 text-emerald-600" />
                            : <CreditCard className="h-4 w-4 text-violet-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{activity.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(activity.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{activity.amount.toLocaleString()}</p>
                          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            activity.status === "paid"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          }`}>
                            {activity.status}
                          </span>
                        </div>
                      </div>
                      {index < recentActivities.length - 1 && <Separator className="opacity-50" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No activity yet</p>
                  <p className="text-xs text-gray-400">Start creating invoices to see activity here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="xl:col-span-2 border border-gray-200 dark:border-gray-800 shadow-none">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Performance</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-6">
              {/* Monthly Sales */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Monthly Sales Target</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">
                    {Math.min(((stats.thisMonthSales / 500000) * 100), 100).toFixed(0)}%
                  </p>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((stats.thisMonthSales / 500000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400">₹{stats.thisMonthSales.toLocaleString()} of ₹5,00,000</p>
              </div>

              {/* Collection */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Collection Rate</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">
                    {stats.pendingInvoices === 0 ? "100" : Math.max(0, 100 - stats.pendingInvoices * 10)}%
                  </p>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${stats.pendingInvoices === 0 ? 100 : Math.max(0, 100 - stats.pendingInvoices * 10)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  {stats.pendingInvoices === 0 ? "All invoices collected" : `${stats.pendingInvoices} invoices pending`}
                </p>
              </div>

              <Separator />

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Parties", value: stats.totalParties, icon: Users, color: "text-blue-600" },
                  { label: "Items", value: stats.totalItems, icon: Package, color: "text-emerald-600" },
                  { label: "Pending", value: stats.pendingInvoices, icon: AlertCircle, color: "text-amber-600" },
                  { label: "This Month", value: `₹${(stats.thisMonthSales / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-violet-600" },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</p>
                        <p className="text-[10px] text-gray-500">{item.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </AuthenticatedLayout>
  )
}
