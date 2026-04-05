"use client"

// AppShell in app/layout.tsx now handles auth, business selection, and the persistent sidebar.
// This component is kept as a passthrough so existing page imports continue to work unchanged.

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return <>{children}</>
}