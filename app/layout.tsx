import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/AuthProvider"
import { AppProvider } from "@/app/context/AppContext"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import PerformanceMonitor from "@/components/PerformanceMonitor"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Hisab Kitaab - Complete Invoicing & Accounting System",
  description: "Professional invoicing and accounting management system for businesses",
  generator: 'Next.js',
  keywords: "invoicing, accounting, billing, inventory, business management, hisab kitaab",
  authors: [{ name: "Hisab Kitaab Team" }],
  viewport: "width=device-width, initial-scale=1",
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
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppProvider>
              {children}
              <Toaster />
              {/* Performance Monitor */}
              <PerformanceMonitor />
            </AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
