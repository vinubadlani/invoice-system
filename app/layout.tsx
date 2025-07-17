import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/AuthProvider"
import { AppProvider } from "@/app/context/AppContext"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import PerformanceMonitor from '@/components/PerformanceMonitor'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "POSHAM HERBALS - Invoicing & Inventory Management",
  description: "Complete invoicing and inventory management system",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppProvider>
              {children}
              <Toaster />
              <PerformanceMonitor />
            </AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
