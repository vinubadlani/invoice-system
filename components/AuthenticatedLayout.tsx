"use client"

import { useAuth } from "@/components/AuthProvider"
import { useEffect, useState } from "react"
import { SidebarNavigation, AppSidebar } from "@/components/SidebarNavigation"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import LoginForm from "@/components/LoginForm"
import BusinessSelector from "@/components/BusinessSelector"

interface Business {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  gstin: string
  pan: string
  terms_conditions: string
}

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, loading } = useAuth()
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)

  useEffect(() => {
    // Check if business is stored in localStorage
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      setSelectedBusiness(JSON.parse(storedBusiness))
    }
  }, [])

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business)
    localStorage.setItem("selectedBusiness", JSON.stringify(business))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  if (!selectedBusiness) {
    return <BusinessSelector onBusinessSelect={handleBusinessSelect} />
  }

  return (
    <SidebarProvider>
      <AppSidebar businessName={selectedBusiness.name} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <main className="min-h-[calc(100vh-8rem)]">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}