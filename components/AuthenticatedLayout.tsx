"use client"

import { useAuth } from "@/components/AuthProvider"
import { useEffect, useState } from "react"
import SidebarNavigation from "@/components/SidebarNavigation"
import LoginForm from "@/components/LoginForm"
import BusinessSelector from "@/components/BusinessSelector"
import { useSessionProtection } from "@/hooks/use-session-protection"

import { Business } from "@/lib/types"

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, loading } = useAuth()
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  
  // Add session protection
  const { isSessionValid } = useSessionProtection()

  useEffect(() => {
    // Only load business if session is valid
    if (user && isSessionValid) {
      // Check if business is stored in localStorage
      const storedBusiness = localStorage.getItem("selectedBusiness")
      if (storedBusiness) {
        try {
          setSelectedBusiness(JSON.parse(storedBusiness))
        } catch (error) {
          console.warn('Invalid business data in localStorage:', error)
          localStorage.removeItem("selectedBusiness")
        }
      }
    } else if (!user) {
      // Clear business selection if no user
      setSelectedBusiness(null)
    }
  }, [user, isSessionValid])

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business)
    localStorage.setItem("selectedBusiness", JSON.stringify(business))
  }

  const handleBusinessChange = () => {
    // This will trigger when business is changed in sidebar
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      setSelectedBusiness(JSON.parse(storedBusiness))
    }
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

  // Show business selector if no business is selected
  if (!selectedBusiness) {
    return <BusinessSelector onBusinessSelect={handleBusinessSelect} />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNavigation 
        businessName={selectedBusiness?.name || "Business Management"} 
        onBusinessChange={handleBusinessChange}
      />
      
      {/* Main Content Area - Updated for wider sidebar */}
      <div className="lg:pl-80 pt-16 lg:pt-0">
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}