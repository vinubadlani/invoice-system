"use client"

import dynamic from "next/dynamic"

const AppShell = dynamic(() => import("@/components/AppShell"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="w-56 space-y-2">
        <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full animate-[progress_1.4s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  ),
})

export default function AppShellLoader({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
