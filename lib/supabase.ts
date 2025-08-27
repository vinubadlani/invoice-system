import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create Supabase client with proper error handling for build time
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  // Return null during build time when env vars are not available
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      return null
    }
    throw new Error('Missing Supabase environment variables')
  }

  // Create client if not already created
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'apikey': supabaseAnonKey,
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }

  return supabaseClient
}

// Helper function to ensure we have a valid client
function ensureSupabaseClient() {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Supabase client not available. Please check your environment variables.')
  }
  return client
}

// Export for backwards compatibility
export const supabase = getSupabaseClient()

// Input validation helpers
export const validators = {
  sanitizeString: (input: string): string => {
    if (typeof input !== 'string') return ''
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  },

  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  isValidPhone: (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/
    return phoneRegex.test(phone.replace(/\s+/g, ''))
  },

  isValidGST: (gst: string): boolean => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    return gstRegex.test(gst.toUpperCase())
  },

  isValidPAN: (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    return panRegex.test(pan.toUpperCase())
  },

  isValidUUID: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}

// Enhanced query builder with error handling
export async function queryBuilder(
  table: string, 
  fields = '*', 
  filters: Record<string, any> = {},
  options: { limit?: number; orderBy?: string; ascending?: boolean } = {}
) {
  try {
    const client = ensureSupabaseClient()
    let query = client.from(table).select(fields)

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.includes('%')) {
          query = query.ilike(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    // Apply sorting
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true })
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  } catch (error) {
    console.error('Query error:', error)
    throw error
  }
}

// Enhanced insert with validation
export async function insertData(table: string, data: Record<string, any>) {
  try {
    const client = ensureSupabaseClient()
    
    // Sanitize string fields
    const validatedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? validators.sanitizeString(value) : value
      ])
    )

    return client.from(table).insert(validatedData)
  } catch (error) {
    console.error('Insert error:', error)
    throw error
  }
}

// Enhanced update with validation
export async function updateData(table: string, id: string, data: Record<string, any>) {
  try {
    const client = ensureSupabaseClient()
    
    // Sanitize string fields
    const validatedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? validators.sanitizeString(value) : value
      ])
    )

    return client.from(table).update(validatedData).eq('id', id)
  } catch (error) {
    console.error('Update error:', error)
    throw error
  }
}

// Enhanced delete
export async function deleteData(table: string, id: string) {
  try {
    const client = ensureSupabaseClient()
    return client.from(table).delete().eq('id', id)
  } catch (error) {
    console.error('Delete error:', error)
    throw error
  }
}

// Authentication helpers
export async function getCurrentUser() {
  try {
    const client = ensureSupabaseClient()
    const { data: { user }, error } = await client.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function signOut() {
  try {
    const client = ensureSupabaseClient()
    const { error } = await client.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    return { success: false, error }
  }
}

// Data security helpers
export async function verifyBusinessOwnership(businessId: string, userId: string): Promise<boolean> {
  try {
    if (!businessId || !userId) {
      console.warn('BusinessId and UserId are required for ownership verification')
      return false
    }

    console.log('Verifying business ownership:', { businessId, userId })

    const client = ensureSupabaseClient()
    
    // First check if we have a valid authenticated session
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user || user.id !== userId) {
      console.error('Authentication issue in verifyBusinessOwnership:', {
        authError: authError?.message || 'No auth error',
        userExists: !!user,
        userIdMatch: user?.id === userId
      })
      return false
    }

    const { data, error } = await client
      .from('businesses')
      .select('id, user_id, name')
      .eq('id', businessId)
      .eq('user_id', userId)
      .single()

    if (error) {
      // Better error logging with more details
      const errorInfo = {
        message: error.message || 'Unknown error',
        code: error.code || 'No code',
        details: error.details || 'No details',
        hint: error.hint || 'No hint',
        businessId,
        userId
      }
      
      console.error('Error verifying business ownership:', errorInfo)
      
      // Handle specific error cases
      if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
        // This means the business doesn't exist or doesn't belong to the user
        console.log('Business not found or access denied:', { businessId, userId })
        return false
      }
      
      // For debugging - check what businesses exist for this user (only in development)
      if (process.env.NODE_ENV === 'development') {
        try {
          const { data: userBusinesses } = await client
            .from('businesses')
            .select('id, user_id, name')
            .eq('user_id', userId)
          
          console.log('User businesses:', userBusinesses)
          
          // And what business exists with this ID
          const { data: businessData } = await client
            .from('businesses')
            .select('id, user_id, name')
            .eq('id', businessId)
          
          console.log('Business data:', businessData)
        } catch (debugError) {
          console.warn('Debug query failed:', debugError)
        }
      }
      
      return false
    }

    console.log('Business ownership verified:', data)
    return !!data
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    const errorCode = error?.code || 'No code'
    
    console.error('Error in verifyBusinessOwnership:', {
      message: errorMessage,
      code: errorCode,
      businessId,
      userId,
      stack: error?.stack
    })
    
    // Handle specific error types
    if (errorMessage.includes('Auth session missing') || errorMessage.includes('not authenticated')) {
      console.warn('Authentication session issue in verifyBusinessOwnership')
      return false
    }
    
    // Handle network errors
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
      console.warn('Network connectivity issue in verifyBusinessOwnership')
      return false
    }
    
    return false
  }
}

// Secure fetch functions that verify ownership
export async function fetchBusinesses(userId: string) {
  try {
    if (!userId) {
      console.warn('UserId is required for fetchBusinesses')
      return []
    }

    const client = ensureSupabaseClient()
    const { data, error } = await client
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching businesses:', error)
      return []
    }
    return data || []
  } catch (error: any) {
    console.error('Error fetching businesses:', error?.message || 'Unknown error')
    return []
  }
}

export async function fetchParties(businessId: string, type?: "Debtor" | "Creditor" | "Expense", userId?: string) {
  try {
    if (!businessId) {
      console.warn('BusinessId is required for fetchParties')
      return []
    }

    // Verify ownership if userId is provided
    if (userId && !(await verifyBusinessOwnership(businessId, userId))) {
      console.warn('User does not own this business')
      return []
    }

    const client = ensureSupabaseClient()
    let query = client
      .from('parties')
      .select('*')
      .eq('business_id', businessId)

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) {
      console.error('Error fetching parties:', error)
      return []
    }
    return data || []
  } catch (error: any) {
    console.error('Error fetching parties:', error?.message || 'Unknown error')
    return []
  }
}

export async function fetchItems(businessId: string, userId?: string) {
  try {
    if (!businessId) {
      console.warn('BusinessId is required for fetchItems')
      return []
    }

    // Verify ownership if userId is provided
    if (userId && !(await verifyBusinessOwnership(businessId, userId))) {
      console.warn('User does not own this business')
      return []
    }

    const client = ensureSupabaseClient()
    const { data, error } = await client
      .from('items')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching items:', error)
      return []
    }
    return data || []
  } catch (error: any) {
    console.error('Error fetching items:', error?.message || 'Unknown error')
    return []
  }
}

export async function fetchInvoices(businessId: string, type?: "sales" | "purchase", limit = 50, userId?: string) {
  try {
    if (!businessId) {
      console.warn('BusinessId is required for fetchInvoices')
      return []
    }

    console.log('fetchInvoices called with:', { businessId, type, limit, userId })

    // Verify ownership if userId is provided
    if (userId) {
      const ownershipCheck = await verifyBusinessOwnership(businessId, userId)
      console.log('Business ownership verification:', ownershipCheck)
      if (!ownershipCheck) {
        console.warn('User does not own this business:', { businessId, userId })
        return []
      }
    }

    const client = ensureSupabaseClient()
    let query = client
      .from('invoices')
      .select('*')
      .eq('business_id', businessId)

    if (type) {
      query = query.eq('type', type)
    }

    console.log('Executing query with filters:', { business_id: businessId, type })

    const { data, error } = await query
      .order('date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Supabase error fetching invoices:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }
    
    console.log('Query result:', data?.length || 0, 'records found')
    return data || []
  } catch (error: any) {
    console.error('Error fetching invoices:', {
      message: error?.message || 'Unknown error',
      businessId,
      type,
      stack: error?.stack
    })
    return []
  }
}

// Sales queries for backwards compatibility
export const salesQueries = {
  getSalesData: async (businessId: string, options: any = {}) => {
    try {
      if (!businessId) {
        console.warn('BusinessId is required for getSalesData')
        return []
      }
      return await fetchInvoices(businessId, 'sales', options.limit)
    } catch (error: any) {
      console.error('Error in getSalesData:', {
        message: error?.message || 'Unknown error',
        businessId,
        options
      })
      return []
    }
  },
  
  getInvoiceById: async (invoiceId: string) => {
    try {
      if (!invoiceId) {
        console.warn('InvoiceId is required for getInvoiceById')
        return null
      }
      
      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()
        
      if (error) {
        console.error('Error fetching invoice by ID:', error)
        return null
      }
      
      return data
    } catch (error: any) {
      console.error('Error in getInvoiceById:', {
        message: error?.message || 'Unknown error',
        invoiceId
      })
      return null
    }
  },
  
  getSalesStats: async (businessId: string) => {
    try {
      if (!businessId) {
        console.warn('BusinessId is required for getSalesStats')
        return { total: 0, count: 0, invoices: [] }
      }

      const invoices = await fetchInvoices(businessId, 'sales')
      const total = invoices.reduce((sum, inv: any) => sum + (inv.net_total || 0), 0)
      const count = invoices.length
      return { total, count, invoices }
    } catch (error: any) {
      console.error('Error getting sales stats:', {
        message: error?.message || 'Unknown error',
        businessId
      })
      return { total: 0, count: 0, invoices: [] }
    }
  },
  
  subscribeSalesUpdates: (businessId: string, callback: (payload: any) => void) => {
    try {
      if (!businessId) {
        console.warn('BusinessId is required for subscribeSalesUpdates')
        return null
      }

      const client = ensureSupabaseClient()
      return client
        .channel('sales-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'invoices',
            filter: `business_id=eq.${businessId} AND type=eq.sales`
          },
          callback
        )
        .subscribe()
    } catch (error: any) {
      console.error('Error subscribing to sales updates:', {
        message: error?.message || 'Unknown error',
        businessId
      })
      return null
    }
  }
}

// Secure queries for backwards compatibility
export const secureQueries = {
  insertSecure: insertData,
  updateSecure: updateData,
  deleteSecure: deleteData,
  querySecure: queryBuilder
}
