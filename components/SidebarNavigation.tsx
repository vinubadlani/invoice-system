"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { signOut } from "@/lib/auth"
import { useAuth } from "./AuthProvider"
import BusinessSelector from "./BusinessSelector"
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
  Printer,
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
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import Image from "next/image"
import { cn } from "@/lib/utils"

const navigationSections = [
  {
    title: "MAIN",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home },
    ]
  },
  {
    title: "MASTERS",
    items: [
      { name: "Party Master", href: "/party", icon: Users },
      { name: "Item Master", href: "/item", icon: Package },
    ]
  },
  {
    title: "TRANSACTIONS",
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
    title: "REPORTS & TOOLS",
    items: [
      { name: "Ledger", href: "/ledger", icon: BookOpen },
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Bank Accounts", href: "/bank", icon: Building2 },
    ]
  },
  {
    title: "MANAGEMENT",
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
  // const [showBusinessSelector, setShowBusinessSelector] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col",
        isCollapsed ? "w-20" : "w-80",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header with Bigger Centered Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="w-full flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4">
                  <Image
                    src="/logo.png"
                    alt="Hisab Kitaab Logo"
                    width={512}
                    height={128}
                    className="dark:hidden object-contain"
                    priority
                  />
                  <Image
                    src="/logo2.png"
                    alt="Hisab Kitaab Logo"
                    width={512}
                    height={128}
                    className="hidden dark:block object-contain"
                    priority
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                  <Store className="h-4 w-4" />
                  <p className="text-sm font-medium truncate max-w-[180px]">
                    {businessName || "Business Management"}
                  </p>
                </div>
                {/* Business Switch Button - Commented out for now */}
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 py-1 h-7"
                  onClick={() => setShowBusinessSelector(true)}
                >
                  <SwitchCamera className="h-3 w-3 mr-1" />
                  Switch Business
                </Button> */}
              </div>
            )}
            
            {isCollapsed && (
              <div className="relative w-12 h-12 mx-auto">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={48}
                  height={48}
                  className="dark:hidden object-contain"
                  priority
                />
                <Image
                  src="/logo2.png"
                  alt="Logo"
                  width={48}
                  height={48}
                  className="hidden dark:block object-contain"
                  priority
                />
              </div>
            )}

            {/* Collapse Toggle - Desktop Only */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "hidden lg:flex p-1.5 absolute",
                isCollapsed ? "top-4 right-4" : "top-6 right-6"
              )}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>

            {/* Close Button - Mobile Only */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-1.5 absolute top-4 right-4"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Items with Sections */}
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="px-4 space-y-6">
            {navigationSections.map((section) => (
              <div key={section.title}>
                {!isCollapsed && (
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-3">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                          isActive
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800",
                          isCollapsed ? "justify-center" : "justify-start"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", isCollapsed ? "mx-0" : "mr-3")} />
                        {!isCollapsed && <span>{item.name}</span>}
                        
                        {/* Tooltip for collapsed state */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                            {item.name}
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className={cn("space-y-2", isCollapsed ? "flex flex-col items-center" : "")}>
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(
                "dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 group relative",
                isCollapsed ? "w-12 h-12 p-0" : "w-full justify-start px-3 py-3"
              )}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              {!isCollapsed && <span className="ml-3">Toggle Theme</span>}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  Toggle Theme
                </div>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "dark:hover:bg-gray-800 group relative",
                    isCollapsed ? "w-12 h-12 p-0" : "w-full justify-start px-3 py-3"
                  )}
                >
                  <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  {!isCollapsed && (
                    <span className="ml-3 truncate text-sm">{user?.email}</span>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                      {user?.email}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                side={isCollapsed ? "right" : "top"}
                className="w-48 dark:bg-gray-800 dark:border-gray-700"
              >
                <div className="px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                  {user?.email}
                </div>
                <DropdownMenuSeparator className="dark:bg-gray-700" />
                <DropdownMenuItem 
                  onClick={() => {
                    // Clear selected business to trigger business selector
                    localStorage.removeItem('selectedBusinessId');
                    window.location.reload();
                  }}
                  className="dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  <SwitchCamera className="h-4 w-4 mr-2" />
                  Switch Business
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-gray-700" />
                <DropdownMenuItem 
                  onClick={handleSignOut} 
                  className="dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Menu Button - Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(true)}
            className="p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="relative w-8 h-8">
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="dark:hidden object-contain"
                priority
              />
              <Image
                src="/logo2.png"
                alt="Logo"
                width={32}
                height={32}
                className="hidden dark:block object-contain"
                priority
              />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">Hisab Kitaab</span>
          </div>

          <div className="w-8" /> {/* Spacer for balance */}
        </div>
      </div>

      {/* Business Selector Modal - Commented out for now */}
      {/* {showBusinessSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Switch Business
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBusinessSelector(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <BusinessSelector 
              onBusinessSelect={(business) => {
                setShowBusinessSelector(false)
                onBusinessChange?.()
                // Force page reload to update business context
                window.location.reload()
              }}
              className="w-full"
            />
          </div>
        </div>
      )} */}
    </>
  )
}