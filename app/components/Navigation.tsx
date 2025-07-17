"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
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
} from "lucide-react"

const navigationItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Party Master", href: "/party", icon: Users },
  { name: "Item Master", href: "/item", icon: Package },
  { name: "Sales Entry", href: "/sales", icon: ShoppingCart },
  { name: "Purchase Entry", href: "/purchases", icon: ShoppingBag },
  { name: "Ledger", href: "/ledger", icon: BookOpen },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Print Invoice", href: "/print", icon: Printer },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Bank Accounts", href: "/bank", icon: Building2 },
]

export default function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
              <h1 className="text-xl font-bold text-gray-900">POSHAM HERBALS</h1>
              <p className="text-sm text-gray-600">Invoicing & Inventory</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
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
          </div>

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
