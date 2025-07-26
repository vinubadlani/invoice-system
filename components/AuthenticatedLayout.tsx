"use client"

import { useAuth } from "@/components/AuthProvider"
import { useEffect, useState } from "react"
import SidebarNavigation from "@/components/SidebarNavigation"
import LoginForm from "@/components/LoginForm"
import BusinessSelector from "@/components/BusinessSelector"

import { Business } from "@/lib/types"

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 dark:border-blue-400"></div>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNavigation businessName={selectedBusiness.name} />
      
      {/* Main Content Area - Updated for wider sidebar */}
      <div className="lg:pl-80 pt-16 lg:pt-0">
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}