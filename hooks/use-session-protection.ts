// React hook for session protection
import { useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { sessionManager } from '@/lib/session-manager'
import { useOptimizedData } from '@/lib/cache-store'

export function useSessionProtection() {
  const { user } = useAuth()
  const { clearAllCache, setCurrentUser } = useOptimizedData()

  useEffect(() => {
    if (user) {
      // Check if this is a new user session
      if (!sessionManager.isSessionValid(user.id)) {
        console.log('New user session detected, clearing old data')
        sessionManager.clearUserData()
        sessionManager.setCurrentUser(user.id)
        setCurrentUser(user.id)
      }
    } else {
      // No user, clear everything
      sessionManager.clearUserData()
      sessionManager.setCurrentUser(null)
      setCurrentUser(null)
    }
  }, [user?.id, clearAllCache, setCurrentUser])

  return { 
    isSessionValid: user ? sessionManager.isSessionValid(user.id) : false,
    currentUserId: user?.id || null
  }
}
