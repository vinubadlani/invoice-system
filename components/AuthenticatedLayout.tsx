"use client"

import { useAuth } from "@/components/AuthProvider"
import { useEffect, useState } from "react"
import Navigation from "@/components/Navigation"
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
    <div className="min-h-screen bg-gray-50">
      <Navigation businessName={selectedBusiness.name} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}