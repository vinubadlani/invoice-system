import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

// Enhanced cache with better performance
interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
  loading?: boolean
}

class OptimizedCache {
  private cache = new Map<string, CacheItem<any>>()
  private readonly DEFAULT_EXPIRY = 5 * 60 * 1000 // 5 minutes
  private readonly FAST_EXPIRY = 30 * 1000 // 30 seconds for frequently changing data
  
  set<T>(key: string, data: T, customExpiry?: number): void {
    const expiry = customExpiry || this.DEFAULT_EXPIRY
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry,
      loading: false
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
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

  // Preload critical data
  async preloadCriticalData(businessId: string): Promise<void> {
    const promises = [
      this.fetchParties(businessId),
      this.fetchItems(businessId),
      this.fetchBusiness(businessId)
    ]
    
    await Promise.allSettled(promises)
  }

  // Optimized fetch functions with aggressive caching
  async fetchParties(businessId: string): Promise<any[]> {
    const cacheKey = `parties-${businessId}`
    
    if (this.isLoading(cacheKey)) {
      // Wait for existing request
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
      const { data, error } = await supabase
        .from("parties")
        .select("id, name, gstin, address, city, state, type, mobile, email")
        .eq("business_id", businessId)
        .order("name")
        .limit(100)

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
      const { data, error } = await supabase
        .from("items")
        .select("id, name, code, hsn_code, gst_percent, sales_price, purchase_price, unit")
        .eq("business_id", businessId)
        .order("name")
        .limit(200)

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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
    } catch (error) {
      console.error("Error fetching recent invoices:", error)
      return []
    }
  }

  // Invalidate cache when data changes
  invalidateBusinessData(businessId: string): void {
    const keysToInvalidate = [
      `parties-${businessId}`,
      `items-${businessId}`,
      `business-${businessId}`,
      `recent-invoices-${businessId}-sales-10`,
      `recent-invoices-${businessId}-purchase-10`
    ]
    
    keysToInvalidate.forEach(key => this.cache.delete(key))
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

// Enhanced hook with better performance
export function useOptimizedData() {
  return {
    fetchParties: (businessId: string) => optimizedCache.fetchParties(businessId),
    fetchItems: (businessId: string) => optimizedCache.fetchItems(businessId),
    fetchBusiness: (businessId: string) => optimizedCache.fetchBusiness(businessId),
    fetchRecentInvoices: (businessId: string, type: "sales" | "purchase", limit?: number) => 
      optimizedCache.fetchRecentInvoices(businessId, type, limit),
    preloadCriticalData: (businessId: string) => optimizedCache.preloadCriticalData(businessId),
    invalidateBusinessData: (businessId: string) => optimizedCache.invalidateBusinessData(businessId),
    clearCache: () => optimizedCache.clear()
  }
}