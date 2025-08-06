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

// Fetch operations
export async function fetchBusinesses(userId: string) {
  try {
    const client = ensureSupabaseClient()
    const { data, error } = await client
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching businesses:', error)
    return []
  }
}

export async function fetchParties(businessId: string, type?: "Debtor" | "Creditor" | "Expense") {
  try {
    const client = ensureSupabaseClient()
    let query = client
      .from('parties')
      .select('*')
      .eq('business_id', businessId)

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching parties:', error)
    return []
  }
}

export async function fetchItems(businessId: string) {
  try {
    const client = ensureSupabaseClient()
    const { data, error } = await client
      .from('items')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching items:', error)
    return []
  }
}

export async function fetchInvoices(businessId: string, type?: "sales" | "purchase", limit = 50) {
  try {
    const client = ensureSupabaseClient()
    let query = client
      .from('invoices')
      .select(`
        *,
        party:parties(name, mobile, type),
        invoice_items(*)
      `)
      .eq('business_id', businessId)

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return []
  }
}
