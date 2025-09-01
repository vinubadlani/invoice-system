"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useOptimizedData } from '@/lib/cache-store'
import { Business } from '@/lib/types'

interface BusinessContextType {
  selectedBusiness: Business | null
  setSelectedBusiness: (business: Business | null) => void
  updateBusinessData: (businessId: string, updates: Partial<Business>) => Promise<void>
  refreshBusiness: (businessId: string) => Promise<void>
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

interface BusinessProviderProps {
  children: ReactNode
}

export function BusinessProvider({ children }: BusinessProviderProps) {
  const [selectedBusiness, setSelectedBusinessState] = useState<Business | null>(null)
  const { updateBusiness, fetchBusiness, invalidateBusinessData } = useOptimizedData()

  // Load business from localStorage on mount
  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      try {
        const business = JSON.parse(storedBusiness)
        setSelectedBusinessState(business)
      } catch (error) {
        console.error("Error parsing stored business:", error)
        localStorage.removeItem("selectedBusiness")
      }
    }
  }, [])

  const setSelectedBusiness = (business: Business | null) => {
    setSelectedBusinessState(business)
    if (business) {
      localStorage.setItem("selectedBusiness", JSON.stringify(business))
      localStorage.setItem("selectedBusinessId", business.id)
    } else {
      localStorage.removeItem("selectedBusiness")
      localStorage.removeItem("selectedBusinessId")
    }
  }

  const updateBusinessData = async (businessId: string, updates: Partial<Business>) => {
    try {
      const updatedBusiness = await updateBusiness(businessId, updates)
      
      // Update the selected business if it's the one being updated
      if (selectedBusiness?.id === businessId) {
        setSelectedBusiness(updatedBusiness)
      }

      // Invalidate related cache
      invalidateBusinessData(businessId)
      
      // Trigger a custom event to notify all components
      window.dispatchEvent(new CustomEvent('businessUpdated', { 
        detail: { businessId, updatedBusiness } 
      }))
      
    } catch (error) {
      console.error("Error updating business:", error)
      throw error
    }
  }

  const refreshBusiness = async (businessId: string) => {
    try {
      // Clear cache and fetch fresh data
      invalidateBusinessData(businessId)
      const freshBusiness = await fetchBusiness(businessId)
      
      if (selectedBusiness?.id === businessId && freshBusiness) {
        setSelectedBusiness(freshBusiness)
      }
      
      return freshBusiness
    } catch (error) {
      console.error("Error refreshing business:", error)
      throw error
    }
  }

  const value: BusinessContextType = {
    selectedBusiness,
    setSelectedBusiness,
    updateBusinessData,
    refreshBusiness
  }

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  const context = useContext(BusinessContext)
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider')
  }
  return context
}

// Hook to listen for business updates
export function useBusinessUpdates(businessId: string, onUpdate?: (business: Business) => void) {
  useEffect(() => {
    const handleBusinessUpdate = (event: CustomEvent) => {
      const { businessId: updatedBusinessId, updatedBusiness } = event.detail
      if (updatedBusinessId === businessId && onUpdate) {
        onUpdate(updatedBusiness)
      }
    }

    window.addEventListener('businessUpdated', handleBusinessUpdate as EventListener)
    
    return () => {
      window.removeEventListener('businessUpdated', handleBusinessUpdate as EventListener)
    }
  }, [businessId, onUpdate])
}
