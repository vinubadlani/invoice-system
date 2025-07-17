import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

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

// Optimized data fetching with caching
export const useOptimizedData = () => {
  const cacheStore = useCacheStore()
  
  const fetchParties = async (businessId: string, force = false) => {
    if (!force && cacheStore.isPartiesCacheValid() && cacheStore.parties.length > 0) {
      return cacheStore.parties.filter(p => p.business_id === businessId)
    }
    
    const { data, error } = await supabase
      .from('parties')
      .select('id, name, gstin, address, city, state, business_id')
      .eq('business_id', businessId)
      .order('name')
    
    if (error) throw error
    
    // Update cache with all parties
    const existingParties = cacheStore.parties.filter(p => p.business_id !== businessId)
    cacheStore.setParties([...existingParties, ...data])
    
    return data
  }
  
  const fetchItems = async (businessId: string, force = false) => {
    if (!force && cacheStore.isItemsCacheValid() && cacheStore.items.length > 0) {
      return cacheStore.items.filter(i => i.business_id === businessId)
    }
    
    const { data, error } = await supabase
      .from('items')
      .select('id, name, code, hsn_code, gst_percent, sales_price, unit, business_id')
      .eq('business_id', businessId)
      .order('name')
    
    if (error) throw error
    
    // Update cache with all items
    const existingItems = cacheStore.items.filter(i => i.business_id !== businessId)
    cacheStore.setItems([...existingItems, ...data])
    
    return data
  }
  
  const fetchBusiness = async (businessId: string, force = false) => {
    if (!force && cacheStore.isBusinessesCacheValid()) {
      const cached = cacheStore.businesses.find(b => b.id === businessId)
      if (cached) return cached
    }
    
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()
    
    if (error) throw error
    
    // Update cache
    const existingBusinesses = cacheStore.businesses.filter(b => b.id !== businessId)
    cacheStore.setBusinesses([...existingBusinesses, data])
    
    return data
  }
  
  return {
    fetchParties,
    fetchItems,
    fetchBusiness,
    clearCache: cacheStore.clearCache,
  }
}