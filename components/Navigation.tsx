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
  Printer,
  BarChart3,
  Building2,
  Settings,
  LogOut,
  FileText,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navigationItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Party Master", href: "/party", icon: Users },
  { name: "Item Master", href: "/item", icon: Package },
  { name: "Sales Entry", href: "/sales-entry", icon: ShoppingCart },
  { name: "Purchase Entry", href: "/purchase-entry", icon: ShoppingBag },
  { name: "Sales", href: "/sales", icon: FileText },
  { name: "Purchases", href: "/purchases", icon: FileText },
  { name: "Ledger", href: "/ledger", icon: BookOpen },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Print Invoice", href: "/print", icon: Printer },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Bank Accounts", href: "/bank", icon: Building2 },
  { name: "Upload Data", href: "/upload", icon: Upload },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface NavigationProps {
  businessName: string
}

export default function Navigation({ businessName }: NavigationProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{businessName}</h1>
              <p className="text-sm text-gray-600">Invoicing & Inventory</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.slice(0, 8).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-4 w-4 mr-2" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navigationItems.slice(8).map((item) => {
                  const Icon = item.icon
                  return (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link href={item.href} className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm text-gray-700">{user?.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden pb-4">
            <div className="grid grid-cols-2 gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
