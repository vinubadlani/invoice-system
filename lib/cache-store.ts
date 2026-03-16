import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { getCurrentUser, fetchParties, fetchItems, fetchBusinesses, fetchInvoices, updateData } from '@/lib/supabase'

// Enhanced cache with better performance and session management
interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
  userId?: string
}

class OptimizedCache {
  private cache = new Map<string, CacheItem<any>>()
  // Deduplication: in-flight promise per cache key
  private pending = new Map<string, Promise<any>>()
  private readonly DEFAULT_EXPIRY = 10 * 60 * 1000 // 10 minutes
  private readonly FAST_EXPIRY = 2 * 60 * 1000     // 2 minutes for invoices
  private currentUserId: string | null = null

  setCurrentUser(userId: string | null): void {
    if (this.currentUserId !== userId) {
      this.clearAllCache()
      this.currentUserId = userId
    }
  }
  
  set<T>(key: string, data: T, customExpiry?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: customExpiry || this.DEFAULT_EXPIRY,
      userId: this.currentUserId || undefined,
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

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

  clear(): void {
    this.cache.clear()
    this.pending.clear()
  }

  clearAllCache(): void {
    this.cache.clear()
    this.pending.clear()
  }

  // Deduplicated fetch helper: if a fetch for `key` is already in-flight,
  // return the same promise instead of spawning a duplicate request.
  private dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.get<T>(key)
    if (hit !== null) return Promise.resolve(hit)

    const existing = this.pending.get(key)
    if (existing) return existing

    const promise = fn().then(
      (result) => { this.pending.delete(key); return result },
      (err)    => { this.pending.delete(key); throw err }
    )
    this.pending.set(key, promise)
    return promise
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
  }

  // Fetch functions — deduplication ensures only one in-flight request per key.
  // Ownership is enforced by Supabase RLS; no need for redundant app-level checks.
  async fetchParties(businessId: string, type?: "Debtor" | "Creditor" | "Expense"): Promise<any[]> {
    const cacheKey = `parties-${businessId}-${type || 'all'}`
    return this.dedupe(cacheKey, async () => {
      try {
        const result = await fetchParties(businessId, type)
        this.set(cacheKey, result, this.DEFAULT_EXPIRY)
        return result
      } catch {
        return []
      }
    })
  }

  async fetchItems(businessId: string): Promise<any[]> {
    const cacheKey = `items-${businessId}`
    return this.dedupe(cacheKey, async () => {
      try {
        const result = await fetchItems(businessId)
        this.set(cacheKey, result, this.DEFAULT_EXPIRY)
        return result
      } catch {
        return []
      }
    })
  }

  async fetchBusiness(businessId: string): Promise<any> {
    const cacheKey = `business-${businessId}`
    const cached = this.get<any>(cacheKey)
    if (cached) return cached

    return this.dedupe(cacheKey, async () => {
      try {
        const user = await getCurrentUser()
        if (!user) return null
        const businesses = await fetchBusinesses(user.id)
        const business = (businesses || []).find((b: any) => b.id === businessId) || null
        this.set(cacheKey, business, this.DEFAULT_EXPIRY * 2)
        return business
      } catch {
        return null
      }
    })
  }

  async fetchRecentInvoices(businessId: string, type: "sales" | "purchase", limit = 10): Promise<any[]> {
    const cacheKey = `recent-invoices-${businessId}-${type}-${limit}`
    return this.dedupe(cacheKey, async () => {
      try {
        const result = await fetchInvoices(businessId, type, limit)
        this.set(cacheKey, result, this.FAST_EXPIRY)
        return result
      } catch {
        return []
      }
    })
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
      `recent-invoices-${businessId}-purchase-10`,
    ]
    keysToInvalidate.forEach(key => { this.cache.delete(key); this.pending.delete(key) })
  }

  async updateBusiness(businessId: string, businessData: any): Promise<any> {
    try {
      const { data: updated, error } = await updateData('businesses', businessId, businessData)
      if (error) throw error

      const user = await getCurrentUser()
      if (!user) throw new Error('User not authenticated')
      const businesses = await fetchBusinesses(user.id)
      const data = (businesses || []).find((b: any) => b.id === businessId)
      if (!data) throw new Error('Business not found after update')

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