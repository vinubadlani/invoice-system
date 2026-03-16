"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/lib/supabase"
import { useOptimizedData } from "@/lib/cache-store"
import { sessionManager } from "@/lib/session-manager"

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
  const { setCurrentUser, clearAllCache } = useOptimizedData()

  useEffect(() => {
    // Sync auth.users -> public.users through the database RPC.
    const createUserRecord = async (user: User) => {
      try {
        if (!user?.id || !user?.email) {
          return
        }

        const client = getSupabaseClient()
        if (!client) {
          return
        }

        const fullName = user.user_metadata?.full_name || user.email.split('@')[0]
        const { error } = await client.rpc('rpc_sync_user_profile', {
          p_full_name: fullName,
        })

        if (
          error &&
          !error.message?.includes('duplicate key') &&
          !error.message?.includes('already exists') &&
          !error.message?.includes('rpc_sync_user_profile')
        ) {
          console.warn('User profile sync warning:', error.message)
        }
      } catch (error: any) {
        console.warn('Error syncing user profile:', error?.message || 'Unknown error')
      }
    }

    // Optimized auth listener setup
    const setupAuthListener = () => {
      const client = getSupabaseClient()
      if (!client) {
        console.error('Supabase client not available')
        setLoading(false)
        return null
      }
      
      // Get initial session with timeout
      const sessionPromise = client.auth.getSession()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
      )

      Promise.race([sessionPromise, timeoutPromise])
        .then(({ data: { session }, error }: any) => {
          if (error) {
            console.error('Error getting session:', error.message)
            setLoading(false)
            return
          }

          const currentUser = session?.user ?? null
          setUser(currentUser)
          
          // Set current user for cache session management
          if (currentUser) {
            setCurrentUser(currentUser.id)
            sessionManager.setCurrentUser(currentUser.id)
            // Create user record in background - don't wait for it
            createUserRecord(currentUser).catch(console.warn)
          } else {
            setCurrentUser(null)
            sessionManager.setCurrentUser(null)
          }
          
          setLoading(false)
        })
        .catch((error) => {
          console.error('Session timeout or error:', error)
          setLoading(false)
        })

      // Set up auth state change listener
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
        const currentUser = session?.user ?? null
        const previousUser = user
        
        // Clear data when signing out or switching users
        if (event === 'SIGNED_OUT') {
          sessionManager.clearUserData()
          setCurrentUser(null)
          sessionManager.setCurrentUser(null)
        } else if (event === 'SIGNED_IN' && currentUser) {
          // Check if this is a different user
          if (previousUser && currentUser.id !== previousUser.id) {
            sessionManager.clearUserData()
          }
          setCurrentUser(currentUser.id)
          sessionManager.setCurrentUser(currentUser.id)
        }
        
        setUser(currentUser)
        
        // Create user record in background on sign in
        if (currentUser && event === 'SIGNED_IN') {
          createUserRecord(currentUser).catch(console.warn)
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
    return cleanup || undefined
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
