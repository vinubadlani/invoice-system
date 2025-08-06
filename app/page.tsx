"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    // Add a small delay to prevent flashing
    const timer = setTimeout(() => {
      if (!loading) {
        if (user) {
          // If user is logged in, redirect to dashboard
          router.replace('/dashboard') // Use replace instead of push
        } else {
          // If user is not logged in, redirect to landing page
          router.replace('/landing') // Use replace instead of push
        }
      }
    }, 100) // Small delay to prevent flashing

    return () => clearTimeout(timer)
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    )
  }

  return null
}
