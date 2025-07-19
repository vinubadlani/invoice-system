"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Function to set up auth listener
    const setupAuthListener = () => {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        setLoading(false)
      }).catch((error) => {
        console.error('Error getting session:', error)
        setLoading(false)
      })

      // Set up auth state change listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        setLoading(false)
      })

      // Return cleanup function
      return () => {
        subscription.unsubscribe()
      }
    }

    // Call the setup function and store its cleanup return
    const cleanup = setupAuthListener()

    // Return the cleanup function from useEffect
    return cleanup
  }, []) // Empty dependency array ensures this runs only once on mount

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
