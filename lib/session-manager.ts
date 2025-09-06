// Session management utilities for handling user data and cache clearing

export class SessionManager {
  private static instance: SessionManager
  private currentUserId: string | null = null

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  setCurrentUser(userId: string | null): void {
    console.log(`Session: User changed from ${this.currentUserId} to ${userId}`)
    
    // If user changed, clear all data
    if (this.currentUserId !== userId) {
      this.clearUserData()
    }
    
    this.currentUserId = userId
  }

  getCurrentUser(): string | null {
    return this.currentUserId
  }

  clearUserData(): void {
    console.log('SessionManager: Clearing user data')
    
    // Clear localStorage
    const keysToRemove = [
      'selectedBusiness',
      'selectedBusinessId', 
      'invoicing-cache',
      'business-context',
      'user-preferences',
      'party-cache',
      'item-cache',
      'invoice-cache'
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })

    // Clear sessionStorage as well
    const sessionKeysToRemove = [
      'temp-business-data',
      'form-data',
      'search-filters'
    ]
    
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key)
    })

    // Clear any IndexedDB data if we were using it
    this.clearIndexedDB().catch(console.warn)
  }

  private async clearIndexedDB(): Promise<void> {
    try {
      // Clear any IndexedDB databases we might be using
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases()
        await Promise.all(
          databases.map(db => {
            if (db.name && db.name.includes('hisabkitab')) {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!)
                deleteReq.onsuccess = () => resolve()
                deleteReq.onerror = () => reject(deleteReq.error)
              })
            }
          })
        )
      }
    } catch (error) {
      console.warn('Error clearing IndexedDB:', error)
    }
  }

  // Force a clean logout with hard refresh
  async forceLogout(): Promise<void> {
    this.clearUserData()
    this.currentUserId = null
    
    // Clear any service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      )
    }
    
    // Force hard refresh to ensure clean state
    window.location.href = '/auth/login'
  }

  // Check if current session is valid for a specific user
  isSessionValid(userId: string): boolean {
    return this.currentUserId === userId
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance()
