"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "@/lib/auth"
import { useAuth } from "./AuthProvider"
import { ModeToggle } from "./ModeToggle"
import {
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
  ChevronRight,
  User,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navigationGroups = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/", icon: Home },
    ],
  },
  {
    label: "Masters",
    items: [
      { name: "Party Master", href: "/party", icon: Users },
      { name: "Item Master", href: "/item", icon: Package },
    ],
  },
  {
    label: "Transactions",
    items: [
      { name: "Sales Entry", href: "/sales-entry", icon: ShoppingCart },
      { name: "Purchase Entry", href: "/purchase-entry", icon: ShoppingBag },
      { name: "Sales", href: "/sales", icon: FileText },
      { name: "Purchases", href: "/purchases", icon: FileText },
      { name: "Payments", href: "/payments", icon: CreditCard },
    ],
  },
  {
    label: "Reports & Tools",
    items: [
      { name: "Ledger", href: "/ledger", icon: BookOpen },
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Bank Accounts", href: "/bank", icon: Building2 },
    ],
  },
  {
    label: "Management",
    items: [
      { name: "Upload Data", href: "/upload", icon: Upload },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

interface SidebarNavigationProps {
  businessName: string
}

export function AppSidebar({ businessName }: SidebarNavigationProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <Sidebar variant="inset" className="border-r dark:border-gray-800">
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{businessName}</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">Invoicing & Inventory</p>
            </div>
          </div>
          <ModeToggle />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild isActive={isActive} className="w-full">
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full w-6 h-6 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="truncate text-sm">{user?.email}</span>
                  <ChevronRight className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 font-medium">{user?.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export function SidebarNavigation({ businessName }: SidebarNavigationProps) {
  return (
    <SidebarProvider>
      <AppSidebar businessName={businessName} />
    </SidebarProvider>
  )
}