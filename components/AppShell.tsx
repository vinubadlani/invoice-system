"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import { useBusiness } from "@/app/context/BusinessContext"
import SidebarNavigation from "@/components/SidebarNavigation"
import LoginForm from "@/components/LoginForm"
import BusinessSelector from "@/components/BusinessSelector"
import { Business } from "@/lib/types"

// Paths that render without the authenticated shell
const PUBLIC_PREFIXES = ["/auth", "/landing", "/print"]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const { selectedBusiness, setSelectedBusiness } = useBusiness()

  // Read business synchronously on first render so we never flash BusinessSelector on reload
  const [syncBusiness] = useState<Business | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem("selectedBusiness")
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  // Public routes — render naked, no sidebar
  if (PUBLIC_PREFIXES.some((p) => pathname?.startsWith(p))) {
    return <>{children}</>
  }

  // Auth is still resolving — show a slim top progress bar
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="w-56 space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Loading…</p>
          <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-[progress_1.4s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return <LoginForm />
  }

  // Use synchronously-read business to avoid flashing BusinessSelector on every reload
  const activeBusiness = selectedBusiness ?? syncBusiness

  // No business selected and nothing in storage — show selector
  if (!activeBusiness) {
    return <BusinessSelector onBusinessSelect={setSelectedBusiness} />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SidebarNavigation
        businessName={activeBusiness.name || ""}
        onBusinessChange={() => {}}
      />
      <div className="transition-all duration-200 lg:pl-64 pt-14 lg:pt-0">
        <main className="min-h-screen px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
