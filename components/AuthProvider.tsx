"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase, secureQueries } from "@/lib/supabase"

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
    // Function to create user record safely
    const createUserRecord = async (user: User) => {
      try {
        if (!user?.id || !user?.email) {
          console.warn('Invalid user data for record creation')
          return
        }

        // Use secure insert method
        const { error } = await secureQueries.insertSecure('users', {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          created_at: new Date().toISOString(),
        })
        
        // Ignore duplicate key errors - user already exists
        if (error && !error.message.includes('duplicate key') && !error.message.includes('already exists')) {
          // Only log actual errors, not expected duplicates
          if (process.env.NODE_ENV === 'development') {
            console.warn('User record creation warning:', error.message)
          }
        }
      } catch (error: any) {
        // Better error handling with type safety
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error creating user record:', error?.message || 'Unknown error')
        }
      }
    }

    // Function to set up auth listener
    const setupAuthListener = () => {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error.message)
          setLoading(false)
          return
        }

        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        // Create user record if user exists and is new
        if (currentUser) {
          createUserRecord(currentUser)
        }
        
        setLoading(false)
      })

      // Set up auth state change listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        // Create user record on sign in
        if (currentUser && event === 'SIGNED_IN') {
          await createUserRecord(currentUser)
        }
        
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
