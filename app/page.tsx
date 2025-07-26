"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import Dashboard from "./dashboard/page"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle } from "lucide-react"

export default function Home() {
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for verification success
    if (searchParams.get("verified") === "true") {
      setShowVerificationSuccess(true)
      setTimeout(() => setShowVerificationSuccess(false), 5000)
    }
  }, [searchParams])

  return (
    <AuthenticatedLayout>
      {showVerificationSuccess && (
        <div className="fixed top-4 right-4 z-50">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Email verified successfully! Welcome to POSHAM HERBALS.
            </AlertDescription>
          </Alert>
        </div>
      )}
      <Dashboard />
    </AuthenticatedLayout>
  )
}
