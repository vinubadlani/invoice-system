import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { getSupabaseClient, getCurrentUser, verifyBusinessOwnership } from '@/lib/supabase'

// Enhanced cache with better performance and session management
interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
  loading?: boolean
  userId?: string // Add user ID for session tracking
}

class OptimizedCache {
  private cache = new Map<string, CacheItem<any>>()
  private readonly DEFAULT_EXPIRY = 5 * 60 * 1000 // 5 minutes
  private readonly FAST_EXPIRY = 30 * 1000 // 30 seconds for frequently changing data
  private currentUserId: string | null = null
  
  // Set current user for session management
  setCurrentUser(userId: string | null): void {
    if (this.currentUserId !== userId) {
      console.log(`User session changed from ${this.currentUserId} to ${userId}`)
      this.clearAllCache() // Clear cache when user changes
      this.currentUserId = userId
    }
  }
  
  set<T>(key: string, data: T, customExpiry?: number): void {
    const expiry = customExpiry || this.DEFAULT_EXPIRY
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry,
      loading: false,
      userId: this.currentUserId || undefined
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    // Check if item belongs to current user
    if (item.userId && item.userId !== this.currentUserId) {
      this.cache.delete(key)
      return null
    }
    
    if (Date.now() - item.timestamp > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  isLoading(key: string): boolean {
    const item = this.cache.get(key)
    return item?.loading || false
  }

  setLoading(key: string, loading: boolean): void {
    const item = this.cache.get(key)
    if (item) {
      item.loading = loading
    }
  }

  clear(): void {
    this.cache.clear()
  }

  // Clear all cache (used when user changes)
  clearAllCache(): void {
    this.cache.clear()
    console.log('All cache cleared due to user session change')
  }

  // Optimized preload critical data with timeout and fallbacks
  async preloadCriticalData(businessId: string): Promise<void> {
    // Don't wait for all promises - load in background
    const promises = [
      this.fetchParties(businessId).catch(() => []),
      this.fetchItems(businessId).catch(() => []),
      this.fetchBusiness(businessId).catch(() => null)
    ]
    
    // Set a timeout so we don't block the UI
    const timeoutPromise = new Promise(resolve => 
      setTimeout(() => resolve(null), 3000)
    )
    
    // Race between data loading and timeout
    await Promise.race([
      Promise.allSettled(promises),
      timeoutPromise
    ])
    
    console.log('Critical data preload completed or timed out')
  }

  // Optimized fetch functions with aggressive caching
  async fetchParties(businessId: string, type?: "Debtor" | "Creditor" | "Expense"): Promise<any[]> {
    const cacheKey = `parties-${businessId}-${type || 'all'}`
    
    if (this.isLoading(cacheKey)) {
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.isLoading(cacheKey)) {
            clearInterval(checkInterval)
            resolve(this.get(cacheKey) || [])
          }
        }, 50)
      })
    }

    const cached = this.get<any[]>(cacheKey)
    if (cached) return cached

    this.setLoading(cacheKey, true)
    
    try {
      // Security check - verify business ownership with improved error handling
      const user = await getCurrentUser()
      if (!user) {
        console.warn("User not authenticated in fetchParties")
        return []
      }

      // Add try-catch specifically for verifyBusinessOwnership
      let isOwner = false
      try {
        isOwner = await verifyBusinessOwnership(businessId, user.id)
      } catch (ownershipError: any) {
        console.error("Error during business ownership verification in fetchParties:", {
          message: ownershipError?.message || 'Unknown ownership error',
          businessId,
          userId: user.id
        })
        return []
      }

      if (!isOwner) {
        console.warn("User does not own this business in fetchParties:", { businessId, userId: user.id })
        return []
      }

      const client = getSupabaseClient()
      if (!client) {
        console.warn("Supabase client unavailable during build")
        return []
      }

      let query = client
        .from("parties")
        .select("id, name, mobile, email, type, gstin, state, address")
        .eq("business_id", businessId)
        .order("name")

      if (type) {
        query = query.eq("type", type)
      }

      const { data, error } = await query.limit(100)

      if (error) throw error
      
      const result = data || []
      this.set(cacheKey, result, this.DEFAULT_EXPIRY)
      return result
    } catch (error) {
      console.error("Error fetching parties:", error)
      return []
    } finally {
      this.setLoading(cacheKey, false)
    }
  }

  async fetchItems(businessId: string): Promise<any[]> {
    const cacheKey = `items-${businessId}`
    
    if (this.isLoading(cacheKey)) {
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.isLoading(cacheKey)) {
            clearInterval(checkInterval)
            resolve(this.get(cacheKey) || [])
          }
        }, 50)
      })
    }

    const cached = this.get<any[]>(cacheKey)
    if (cached) return cached

    this.setLoading(cacheKey, true)
    
    try {
      // Security check - verify business ownership with improved error handling
      const user = await getCurrentUser()
      if (!user) {
        console.warn("User not authenticated in fetchItems")
        return []
      }

      // Add try-catch specifically for verifyBusinessOwnership
      let isOwner = false
      try {
        isOwner = await verifyBusinessOwnership(businessId, user.id)
      } catch (ownershipError: any) {
        console.error("Error during business ownership verification in fetchItems:", {
          message: ownershipError?.message || 'Unknown ownership error',
          businessId,
          userId: user.id
        })
        return []
      }

      if (!isOwner) {
        console.warn("User does not own this business in fetchItems:", { businessId, userId: user.id })
        return []
      }

      const client = getSupabaseClient()
      if (!client) {
        console.warn("Supabase client unavailable during build")
        return []
      }

      const { data, error } = await client
        .from("items")
        .select("id, name, code, hsn_code, gst_percent, sales_price, purchase_price, unit")
        .eq("business_id", businessId)
        .order("name")

      if (error) throw error
      
      const result = data || []
      this.set(cacheKey, result, this.DEFAULT_EXPIRY)
      return result
    } catch (error) {
      console.error("Error fetching items:", error)
      return []
    } finally {
      this.setLoading(cacheKey, false)
    }
  }

  async fetchBusiness(businessId: string): Promise<any> {
    const cacheKey = `business-${businessId}`
    
    const cached = this.get<any>(cacheKey)
    if (cached) return cached

    try {
      const client = getSupabaseClient()
      if (!client) {
        console.warn("Supabase client unavailable during build")
        return null
      }

      const { data, error } = await client
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single()

      if (error) throw error
      
      this.set(cacheKey, data, this.DEFAULT_EXPIRY * 2) // Business data changes less frequently
      return data
    } catch (error) {
      console.error("Error fetching business:", error)
      return null
    }
  }

  // Fast fetch for frequently accessed data
  async fetchRecentInvoices(businessId: string, type: "sales" | "purchase", limit = 10): Promise<any[]> {
    const cacheKey = `recent-invoices-${businessId}-${type}-${limit}`
    
    const cached = this.get<any[]>(cacheKey)
    if (cached) return cached

    try {
      // Security check - verify business ownership with improved error handling
      const user = await getCurrentUser()
      if (!user) {
        console.warn("User not authenticated in fetchRecentInvoices")
        return []
      }

      // Add try-catch specifically for verifyBusinessOwnership
      let isOwner = false
      try {
        isOwner = await verifyBusinessOwnership(businessId, user.id)
      } catch (ownershipError: any) {
        console.error("Error during business ownership verification:", {
          message: ownershipError?.message || 'Unknown ownership error',
          businessId,
          userId: user.id
        })
        return []
      }

      if (!isOwner) {
        console.warn("User does not own this business:", { businessId, userId: user.id })
        return []
      }

      const client = getSupabaseClient()
      if (!client) {
        console.warn("Supabase client unavailable during build")
        return []
      }

      const { data, error } = await client
        .from("invoices")
        .select("id, invoice_no, date, party_name, net_total, balance_due, type")
        .eq("business_id", businessId)
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) throw error
      
      const result = data || []
      this.set(cacheKey, result, this.FAST_EXPIRY) // Shorter cache for dynamic data
      return result
    } catch (error: any) {
      console.error("Error fetching recent invoices:", {
        message: error?.message || 'Unknown error',
        businessId,
        type,
        limit,
        stack: error?.stack
      })
      return []
    }
  }

  // Invalidate cache when data changes
  invalidateBusinessData(businessId: string): void {
    const keysToInvalidate = [
      `parties-${businessId}`,
      `parties-${businessId}-Debtor`,
      `parties-${businessId}-Creditor`, 
      `parties-${businessId}-Expense`,
      `items-${businessId}`,
      `business-${businessId}`,
      `recent-invoices-${businessId}-sales-10`,
      `recent-invoices-${businessId}-purchase-10`
    ]
    
    keysToInvalidate.forEach(key => this.cache.delete(key))
  }

  // Update business data and invalidate cache
  async updateBusiness(businessId: string, businessData: any): Promise<any> {
    try {
      const client = getSupabaseClient()
      if (!client) throw new Error("Service unavailable")

      const { data, error } = await client
        .from("businesses")
        .update(businessData)
        .eq("id", businessId)
        .select()
        .single()

      if (error) throw error

      // Update cache with new data
      const cacheKey = `business-${businessId}`
      this.set(cacheKey, data, this.DEFAULT_EXPIRY * 2)
      
      // Also update localStorage
      const storedBusiness = localStorage.getItem("selectedBusiness")
      if (storedBusiness) {
        const parsed = JSON.parse(storedBusiness)
        if (parsed.id === businessId) {
          localStorage.setItem("selectedBusiness", JSON.stringify(data))
        }
      }

      return data
    } catch (error) {
      console.error("Error updating business:", error)
      throw error
    }
  }
}

// Singleton instance
const optimizedCache = new OptimizedCache()

// Cache store for frequently accessed data
interface CacheStore {
  // Data cache
  parties: any[]
  items: any[]
  businesses: any[]
  
  // Cache timestamps
  partiesLastFetch: number
  itemsLastFetch: number
  businessesLastFetch: number
  
  // Cache actions
  setParties: (parties: any[]) => void
  setItems: (items: any[]) => void
  setBusinesses: (businesses: any[]) => void
  
  // Cache helpers
  isPartiesCacheValid: () => boolean
  isItemsCacheValid: () => boolean
  isBusinessesCacheValid: () => boolean
  
  // Clear cache
  clearCache: () => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useCacheStore = create<CacheStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // Initial state
      parties: [],
      items: [],
      businesses: [],
      partiesLastFetch: 0,
      itemsLastFetch: 0,
      businessesLastFetch: 0,
      
      // Setters
      setParties: (parties) => set({ parties, partiesLastFetch: Date.now() }),
      setItems: (items) => set({ items, itemsLastFetch: Date.now() }),
      setBusinesses: (businesses) => set({ businesses, businessesLastFetch: Date.now() }),
      
      // Cache validation
      isPartiesCacheValid: () => {
        const { partiesLastFetch } = get()
        return Date.now() - partiesLastFetch < CACHE_DURATION
      },
      isItemsCacheValid: () => {
        const { itemsLastFetch } = get()
        return Date.now() - itemsLastFetch < CACHE_DURATION
      },
      isBusinessesCacheValid: () => {
        const { businessesLastFetch } = get()
        return Date.now() - businessesLastFetch < CACHE_DURATION
      },
      
      // Clear cache
      clearCache: () => set({
        parties: [],
        items: [],
        businesses: [],
        partiesLastFetch: 0,
        itemsLastFetch: 0,
        businessesLastFetch: 0,
      }),
    })),
    {
      name: 'invoicing-cache',
      version: 1,
    }
  )
)

// Enhanced hook with better performance and session management
export function useOptimizedData() {
  return {
    fetchParties: (businessId: string) => optimizedCache.fetchParties(businessId),
    fetchItems: (businessId: string) => optimizedCache.fetchItems(businessId),
    fetchBusiness: (businessId: string) => optimizedCache.fetchBusiness(businessId),
    fetchRecentInvoices: (businessId: string, type: "sales" | "purchase", limit?: number) => 
      optimizedCache.fetchRecentInvoices(businessId, type, limit),
    preloadCriticalData: (businessId: string) => optimizedCache.preloadCriticalData(businessId),
    invalidateBusinessData: (businessId: string) => optimizedCache.invalidateBusinessData(businessId),
    updateBusiness: (businessId: string, businessData: any) => optimizedCache.updateBusiness(businessId, businessData),
    clearCache: () => optimizedCache.clear(),
    setCurrentUser: (userId: string | null) => optimizedCache.setCurrentUser(userId),
    clearAllCache: () => optimizedCache.clearAllCache()
  }
}