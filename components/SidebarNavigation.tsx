"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { signOut } from "@/lib/auth"
import { useAuth } from "./AuthProvider"
import {
  Menu,
  X,
  Home,
  Users,
  Package,
  ShoppingCart,
  ShoppingBag,
  BookOpen,
  CreditCard,
  BarChart3,
  Building2,
  Settings,
  LogOut,
  FileText,
  Upload,
  Moon,
  Sun,
  Store,
  ChevronLeft,
  ChevronRight,
  SwitchCamera,
  Receipt,
  ChevronDown,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

const navigationSections = [
  {
    title: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home },
    ]
  },
  {
    title: "Masters",
    items: [
      { name: "Party Master", href: "/party", icon: Users },
      { name: "Item Master", href: "/item", icon: Package },
    ]
  },
  {
    title: "Transactions",
    items: [
      { name: "Sales Entry", href: "/sales-entry", icon: ShoppingCart },
      { name: "Purchase Entry", href: "/purchase-entry", icon: ShoppingBag },
      { name: "Sales", href: "/sales", icon: FileText },
      { name: "Purchases", href: "/purchases", icon: FileText },
      { name: "Payments", href: "/payments", icon: CreditCard },
      { name: "Expenses", href: "/expenses", icon: Receipt },
    ]
  },
  {
    title: "Reports",
    items: [
      { name: "Ledger", href: "/ledger", icon: BookOpen },
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Bank Accounts", href: "/bank", icon: Building2 },
    ]
  },
  {
    title: "System",
    items: [
      { name: "Upload Data", href: "/upload", icon: Upload },
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  }
]

interface SidebarNavigationProps {
  businessName: string
  onBusinessChange?: () => void
}

export default function SidebarNavigation({ businessName, onBusinessChange }: SidebarNavigationProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-full bg-white dark:bg-gray-950 border-r border-border/60 shadow-soft transition-all duration-200 flex flex-col",
        isCollapsed ? "w-[68px]" : "w-64",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>

        {/* Brand */}
        <div className={cn(
          "flex items-center h-16 shrink-0 px-4",
          isCollapsed ? "justify-center" : "gap-3"
        )}>
          <div className="h-9 w-9 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-soft">
            <Store className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">हिसाब-किताब</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{businessName || "Select Business"}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">
          <nav className="space-y-5">
            {navigationSections.map((section) => (
              <div key={section.title}>
                {!isCollapsed && (
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-2.5">
                    {section.title}
                  </p>
                )}
                {isCollapsed && <div className="border-t border-border/60 my-1" />}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        title={isCollapsed ? item.name : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-soft"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-muted",
                          isCollapsed && "justify-center px-0"
                        )}
                      >
                        <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                        {!isCollapsed && <span>{item.name}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 p-3 space-y-0.5">
          {/* Theme */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
            className={cn(
              "relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-muted transition-colors w-full",
              isCollapsed && "justify-center px-0"
            )}
          >
            <Sun className="h-4 w-4 shrink-0 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 shrink-0 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 left-[14px]" />
            {!isCollapsed && <span className="pl-0">Toggle Theme</span>}
          </button>

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-muted transition-colors w-full",
                isCollapsed && "justify-center px-0"
              )}>
                <div className="h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate text-xs">{user?.email}</span>
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side={isCollapsed ? "right" : "top"} className="w-52">
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  localStorage.removeItem("selectedBusinessId")
                  localStorage.removeItem("selectedBusiness")
                  window.location.reload()
                }}
              >
                <SwitchCamera className="h-4 w-4 mr-2" />
                Switch Business
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Collapse toggle desktop only */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "hidden lg:flex fixed top-[52px] z-50 h-6 w-6 rounded-full bg-white dark:bg-gray-950 border border-border/60 items-center justify-center shadow-soft hover:bg-muted transition-all duration-200",
          isCollapsed ? "left-[55px]" : "left-[241px]"
        )}
      >
        {isCollapsed
          ? <ChevronRight className="h-3 w-3 text-gray-500" />
          : <ChevronLeft className="h-3 w-3 text-gray-500" />
        }
      </button>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-950 border-b border-border/60 shadow-soft h-14 flex items-center px-4 justify-between">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-1.5 rounded-xl hover:bg-muted"
        >
          <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <span className="font-semibold text-sm text-gray-900 dark:text-white">हिसाब-किताब</span>
        <div className="w-8" />
      </div>
    </>
  )
}
