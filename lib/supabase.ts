import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Optimized Supabase client with performance settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Input validation helpers
export const validators = {
  // Sanitize string input to prevent XSS
  sanitizeString: (input: string): string => {
    if (typeof input !== 'string') return ''
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  },

  // Validate email format
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 255
  },

  // Validate UUID format
  isValidUUID: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  },

  // Validate phone number
  isValidPhone: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,15}$/
    return phoneRegex.test(phone)
  },

  // Validate numeric input
  isValidNumber: (value: any): boolean => {
    return !isNaN(value) && isFinite(value) && value >= 0
  },

  // Validate GSTIN format (Indian tax number)
  isValidGSTIN: (gstin: string): boolean => {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    return gstin === '' || gstinRegex.test(gstin)
  },

  // Validate PAN format (Indian tax number)
  isValidPAN: (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    return pan === '' || panRegex.test(pan)
  }
}

// Secure query helpers with input validation
export const secureQueries = {
  // Secure select with validation
  selectSecure: async (table: string, fields: string, filters?: Record<string, any>) => {
    // Validate table name (whitelist approach)
    const allowedTables = ['businesses', 'parties', 'items', 'invoices', 'payments', 'users']
    if (!allowedTables.includes(table)) {
      throw new Error('Invalid table name')
    }

    // Validate fields parameter
    if (typeof fields !== 'string' || fields.includes(';') || fields.includes('--')) {
      throw new Error('Invalid fields parameter')
    }

    let query = supabase.from(table).select(fields)
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        // Validate filter keys to prevent injection
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          throw new Error(`Invalid filter key: ${key}`)
        }
        
        // Validate UUIDs for ID fields
        if (key.includes('_id') || key === 'id') {
          if (!validators.isValidUUID(value)) {
            throw new Error(`Invalid UUID format for ${key}`)
          }
        }
        
        query = query.eq(key, value)
      })
    }
    
    return query
  },

  // Secure insert with validation
  insertSecure: async (table: string, data: Record<string, any>) => {
    // Validate table name
    const allowedTables = ['businesses', 'parties', 'items', 'invoices', 'payments', 'users']
    if (!allowedTables.includes(table)) {
      throw new Error('Invalid table name')
    }

    // Validate and sanitize data based on table
    const validatedData = validateTableData(table, data)
    
    return supabase.from(table).insert(validatedData)
  },

  // Secure update with validation
  updateSecure: async (table: string, data: Record<string, any>, id: string) => {
    // Validate table name
    const allowedTables = ['businesses', 'parties', 'items', 'invoices', 'payments', 'users']
    if (!allowedTables.includes(table)) {
      throw new Error('Invalid table name')
    }

    // Validate ID
    if (!validators.isValidUUID(id)) {
      throw new Error('Invalid ID format')
    }

    // Validate and sanitize data
    const validatedData = validateTableData(table, data)
    
    return supabase.from(table).update(validatedData).eq('id', id)
  },

  // Secure delete with validation
  deleteSecure: async (table: string, id: string) => {
    // Validate table name
    const allowedTables = ['businesses', 'parties', 'items', 'invoices', 'payments']
    if (!allowedTables.includes(table)) {
      throw new Error('Invalid table name')
    }

    // Validate ID
    if (!validators.isValidUUID(id)) {
      throw new Error('Invalid ID format')
    }
    
    return supabase.from(table).delete().eq('id', id)
  }
}

// Data validation by table
function validateTableData(table: string, data: Record<string, any>): Record<string, any> {
  const validatedData: Record<string, any> = {}

  switch (table) {
    case 'businesses':
      if (data.name) validatedData.name = validators.sanitizeString(data.name).substring(0, 255)
      if (data.email) {
        if (!validators.isValidEmail(data.email)) throw new Error('Invalid email format')
        validatedData.email = data.email.toLowerCase()
      }
      if (data.phone) {
        if (!validators.isValidPhone(data.phone)) throw new Error('Invalid phone format')
        validatedData.phone = validators.sanitizeString(data.phone)
      }
      if (data.address) validatedData.address = validators.sanitizeString(data.address).substring(0, 500)
      if (data.city) validatedData.city = validators.sanitizeString(data.city).substring(0, 100)
      if (data.state) validatedData.state = validators.sanitizeString(data.state).substring(0, 100)
      if (data.pincode) validatedData.pincode = validators.sanitizeString(data.pincode).substring(0, 10)
      if (data.gstin) {
        if (!validators.isValidGSTIN(data.gstin)) throw new Error('Invalid GSTIN format')
        validatedData.gstin = data.gstin.toUpperCase()
      }
      if (data.pan) {
        if (!validators.isValidPAN(data.pan)) throw new Error('Invalid PAN format')
        validatedData.pan = data.pan.toUpperCase()
      }
      if (data.terms_conditions) validatedData.terms_conditions = validators.sanitizeString(data.terms_conditions).substring(0, 2000)
      if (data.invoice_template) validatedData.invoice_template = validators.sanitizeString(data.invoice_template).substring(0, 50)
      if (data.user_id) {
        if (!validators.isValidUUID(data.user_id)) throw new Error('Invalid user_id format')
        validatedData.user_id = data.user_id
      }
      break

    case 'parties':
      if (data.business_id) {
        if (!validators.isValidUUID(data.business_id)) throw new Error('Invalid business_id format')
        validatedData.business_id = data.business_id
      }
      if (data.name) validatedData.name = validators.sanitizeString(data.name).substring(0, 255)
      if (data.mobile) {
        if (!validators.isValidPhone(data.mobile)) throw new Error('Invalid mobile format')
        validatedData.mobile = validators.sanitizeString(data.mobile)
      }
      if (data.email) {
        if (data.email && !validators.isValidEmail(data.email)) throw new Error('Invalid email format')
        validatedData.email = data.email ? data.email.toLowerCase() : ''
      }
      if (data.type) {
        const validTypes = ['Debtor', 'Creditor', 'Expense']
        if (!validTypes.includes(data.type)) throw new Error('Invalid party type')
        validatedData.type = data.type
      }
      if (data.balance_type) {
        const validBalanceTypes = ['To Collect', 'To Pay']
        if (!validBalanceTypes.includes(data.balance_type)) throw new Error('Invalid balance type')
        validatedData.balance_type = data.balance_type
      }
      if (data.opening_balance !== undefined) {
        if (!validators.isValidNumber(data.opening_balance)) throw new Error('Invalid opening balance')
        validatedData.opening_balance = Number(data.opening_balance)
      }
      if (data.address) validatedData.address = validators.sanitizeString(data.address).substring(0, 500)
      if (data.city) validatedData.city = validators.sanitizeString(data.city).substring(0, 100)
      if (data.state) validatedData.state = validators.sanitizeString(data.state).substring(0, 100)
      if (data.pincode) validatedData.pincode = validators.sanitizeString(data.pincode).substring(0, 10)
      if (data.gstin) {
        if (!validators.isValidGSTIN(data.gstin)) throw new Error('Invalid GSTIN format')
        validatedData.gstin = data.gstin.toUpperCase()
      }
      if (data.pan) {
        if (!validators.isValidPAN(data.pan)) throw new Error('Invalid PAN format')
        validatedData.pan = data.pan.toUpperCase()
      }
      break

    case 'items':
      if (data.business_id) {
        if (!validators.isValidUUID(data.business_id)) throw new Error('Invalid business_id format')
        validatedData.business_id = data.business_id
      }
      if (data.name) validatedData.name = validators.sanitizeString(data.name).substring(0, 255)
      if (data.code) validatedData.code = validators.sanitizeString(data.code).substring(0, 50)
      if (data.hsn_code) validatedData.hsn_code = validators.sanitizeString(data.hsn_code).substring(0, 20)
      if (data.unit) validatedData.unit = validators.sanitizeString(data.unit).substring(0, 20)
      if (data.description) validatedData.description = validators.sanitizeString(data.description).substring(0, 1000)
      if (data.gst_percent !== undefined) {
        if (!validators.isValidNumber(data.gst_percent) || data.gst_percent < 0 || data.gst_percent > 100) {
          throw new Error('Invalid GST percentage')
        }
        validatedData.gst_percent = Number(data.gst_percent)
      }
      if (data.sales_price !== undefined) {
        if (!validators.isValidNumber(data.sales_price)) throw new Error('Invalid sales price')
        validatedData.sales_price = Number(data.sales_price)
      }
      if (data.purchase_price !== undefined) {
        if (!validators.isValidNumber(data.purchase_price)) throw new Error('Invalid purchase price')
        validatedData.purchase_price = Number(data.purchase_price)
      }
      if (data.opening_stock !== undefined) {
        if (!validators.isValidNumber(data.opening_stock)) throw new Error('Invalid opening stock')
        validatedData.opening_stock = Number(data.opening_stock)
      }
      break

    case 'invoices':
      if (data.business_id) {
        if (!validators.isValidUUID(data.business_id)) throw new Error('Invalid business_id format')
        validatedData.business_id = data.business_id
      }
      if (data.party_id) {
        if (!validators.isValidUUID(data.party_id)) throw new Error('Invalid party_id format')
        validatedData.party_id = data.party_id
      }
      if (data.invoice_no) validatedData.invoice_no = validators.sanitizeString(data.invoice_no).substring(0, 50)
      if (data.party_name) validatedData.party_name = validators.sanitizeString(data.party_name).substring(0, 255)
      if (data.gstin) {
        if (!validators.isValidGSTIN(data.gstin)) throw new Error('Invalid GSTIN format')
        validatedData.gstin = data.gstin.toUpperCase()
      }
      if (data.state) validatedData.state = validators.sanitizeString(data.state).substring(0, 100)
      if (data.address) validatedData.address = validators.sanitizeString(data.address).substring(0, 500)
      if (data.date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(data.date)) throw new Error('Invalid date format')
        validatedData.date = data.date
      }
      if (data.type) {
        const validTypes = ['sales', 'purchase']
        if (!validTypes.includes(data.type)) throw new Error('Invalid invoice type')
        validatedData.type = data.type
      }
      if (data.items) {
        if (!Array.isArray(data.items)) throw new Error('Items must be an array')
        validatedData.items = data.items.map(item => validateInvoiceItem(item))
      }
      if (data.total_tax !== undefined) {
        if (!validators.isValidNumber(data.total_tax)) throw new Error('Invalid total tax')
        validatedData.total_tax = Number(data.total_tax)
      }
      if (data.round_off !== undefined) {
        if (!validators.isValidNumber(data.round_off)) throw new Error('Invalid round off')
        validatedData.round_off = Number(data.round_off)
      }
      if (data.net_total !== undefined) {
        if (!validators.isValidNumber(data.net_total)) throw new Error('Invalid net total')
        validatedData.net_total = Number(data.net_total)
      }
      if (data.payment_received !== undefined) {
        if (!validators.isValidNumber(data.payment_received)) throw new Error('Invalid payment received')
        validatedData.payment_received = Number(data.payment_received)
      }
      if (data.balance_due !== undefined) {
        if (!validators.isValidNumber(data.balance_due)) throw new Error('Invalid balance due')
        validatedData.balance_due = Number(data.balance_due)
      }
      break

    default:
      // For other tables, just sanitize string fields
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          validatedData[key] = validators.sanitizeString(value)
        } else if (typeof value === 'number' && validators.isValidNumber(value)) {
          validatedData[key] = value
        } else if (key.includes('_id') && validators.isValidUUID(value)) {
          validatedData[key] = value
        }
      })
  }

  return validatedData
}

// Validate invoice item
function validateInvoiceItem(item: any): any {
  return {
    id: item.id ? validators.sanitizeString(item.id) : '',
    item_id: validators.isValidUUID(item.item_id) ? item.item_id : '',
    item_name: validators.sanitizeString(item.item_name).substring(0, 255),
    item_code: validators.sanitizeString(item.item_code).substring(0, 50),
    hsn: validators.sanitizeString(item.hsn).substring(0, 20),
    qty: validators.isValidNumber(item.qty) ? Number(item.qty) : 0,
    rate: validators.isValidNumber(item.rate) ? Number(item.rate) : 0,
    unit: validators.sanitizeString(item.unit).substring(0, 20),
    gst_percent: validators.isValidNumber(item.gst_percent) ? Number(item.gst_percent) : 0,
    tax_amount: validators.isValidNumber(item.tax_amount) ? Number(item.tax_amount) : 0,
    total: validators.isValidNumber(item.total) ? Number(item.total) : 0
  }
}

// Legacy optimized query helper (kept for backward compatibility)
export const optimizedQuery = {
  // Cached select with minimal fields
  selectMinimal: (table: string, fields: string, filters?: Record<string, any>) => {
    return secureQueries.selectSecure(table, fields, filters)
  },
  
  // Paginated queries for large datasets
  selectPaginated: (table: string, fields: string, page: number = 1, pageSize: number = 25) => {
    const allowedTables = ['businesses', 'parties', 'items', 'invoices', 'payments', 'users']
    if (!allowedTables.includes(table)) {
      throw new Error('Invalid table name')
    }

    if (typeof fields !== 'string' || fields.includes(';') || fields.includes('--')) {
      throw new Error('Invalid fields parameter')
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    return supabase
      .from(table)
      .select(fields)
      .range(from, to)
      .order('created_at', { ascending: false })
  },
  
  // Optimized search queries
  searchQuery: (table: string, fields: string, searchField: string, searchTerm: string) => {
    const allowedTables = ['businesses', 'parties', 'items', 'invoices', 'payments', 'users']
    if (!allowedTables.includes(table)) {
      throw new Error('Invalid table name')
    }

    if (typeof fields !== 'string' || fields.includes(';') || fields.includes('--')) {
      throw new Error('Invalid fields parameter')
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(searchField)) {
      throw new Error('Invalid search field')
    }

    const sanitizedSearchTerm = validators.sanitizeString(searchTerm).substring(0, 100)
    
    return supabase
      .from(table)
      .select(fields)
      .ilike(searchField, `%${sanitizedSearchTerm}%`)
      .limit(20)
  },
}

// Sales-specific functions
export const salesQueries = {
  // Get sales statistics for a business
  getSalesStats: async (businessId: string) => {
    if (!validators.isValidUUID(businessId)) {
      throw new Error('Invalid business ID format')
    }

    const { data, error } = await supabase
      .rpc('get_sales_stats', { business_uuid: businessId })

    if (error) {
      console.error('Error fetching sales stats:', error)
      throw error
    }

    return data?.[0] || {
      total_sales: 0,
      total_invoices: 0,
      average_order_value: 0,
      pending_amount: 0,
      paid_amount: 0,
      this_month_sales: 0,
      last_month_sales: 0,
      growth_percentage: 0
    }
  },

  // Get sales data with real-time updates
  getSalesData: async (businessId: string, options?: {
    startDate?: string
    endDate?: string
    status?: string
    limit?: number
  }) => {
    if (!validators.isValidUUID(businessId)) {
      throw new Error('Invalid business ID format')
    }

    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_no,
        date,
        party_name,
        gstin,
        state,
        address,
        subtotal,
        total_tax,
        net_total,
        payment_received,
        balance_due,
        status,
        payment_method,
        items,
        created_at,
        updated_at
      `)
      .eq('business_id', businessId)
      .eq('type', 'sales')
      .order('date', { ascending: false })

    if (options?.startDate) {
      query = query.gte('date', options.startDate)
    }

    if (options?.endDate) {
      query = query.lte('date', options.endDate)
    }

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching sales data:', error)
      throw error
    }

    return data || []
  },

  // Get sales analytics for charts
  getSalesAnalytics: async (businessId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    if (!validators.isValidUUID(businessId)) {
      throw new Error('Invalid business ID format')
    }

    const { data, error } = await supabase
      .from('sales_analytics')
      .select('*')
      .eq('business_id', businessId)
      .order(`sale_${period === 'daily' ? 'date' : period === 'weekly' ? 'week' : 'month'}`, { ascending: true })

    if (error) {
      console.error('Error fetching sales analytics:', error)
      throw error
    }

    return data || []
  },

  // Subscribe to real-time sales updates
  subscribeSalesUpdates: (businessId: string, callback: (data: any) => void) => {
    if (!validators.isValidUUID(businessId)) {
      throw new Error('Invalid business ID format')
    }

    return supabase
      .channel('sales_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `business_id=eq.${businessId}`,
        },
        callback
      )
      .subscribe()
  },

  // Create new sales invoice
  createSalesInvoice: async (invoiceData: {
    business_id: string
    invoice_no: string
    date: string
    party_name: string
    gstin?: string
    state: string
    address: string
    items: any[]
    subtotal: number
    total_tax: number
    net_total: number
    payment_received?: number
    status?: string
    payment_method?: string
    due_date?: string
  }) => {
    const validatedData = {
      ...invoiceData,
      type: 'sales',
      balance_due: invoiceData.net_total - (invoiceData.payment_received || 0),
      payment_received: invoiceData.payment_received || 0,
      status: invoiceData.status || 'draft',
      payment_method: invoiceData.payment_method || 'Cash'
    }

    const { data, error } = await secureQueries.insertSecure('invoices', validatedData)

    if (error) {
      console.error('Error creating sales invoice:', error)
      throw error
    }

    return data
  },

  // Update sales invoice
  updateSalesInvoice: async (invoiceId: string, updateData: any) => {
    if (!validators.isValidUUID(invoiceId)) {
      throw new Error('Invalid invoice ID format')
    }

    const { data, error } = await secureQueries.updateSecure('invoices', updateData, invoiceId)

    if (error) {
      console.error('Error updating sales invoice:', error)
      throw error
    }

    return data
  },

  // Get invoice by ID
  getInvoiceById: async (invoiceId: string) => {
    if (!validators.isValidUUID(invoiceId)) {
      throw new Error('Invalid invoice ID format')
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (error) {
      console.error('Error fetching invoice:', error)
      throw error
    }

    return data
  },

  // Get sales summary for dashboard
  getSalesSummary: async (businessId: string, days: number = 30) => {
    if (!validators.isValidUUID(businessId)) {
      throw new Error('Invalid business ID format')
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        date,
        net_total,
        status,
        payment_received,
        balance_due
      `)
      .eq('business_id', businessId)
      .eq('type', 'sales')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching sales summary:', error)
      throw error
    }

    return data || []
  }
}

// Export types (unchanged)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          created_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string
          city: string
          state: string
          pincode: string
          phone: string
          email: string
          gstin: string
          pan: string
          terms_conditions: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address: string
          city: string
          state: string
          pincode: string
          phone: string
          email: string
          gstin: string
          pan: string
          terms_conditions?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string
          city?: string
          state?: string
          pincode?: string
          phone?: string
          email?: string
          gstin?: string
          pan?: string
          terms_conditions?: string
          created_at?: string
        }
      }
      parties: {
        Row: {
          id: string
          business_id: string
          name: string
          mobile: string
          email: string
          gstin: string
          pan: string
          type: "Debtor" | "Creditor" | "Expense"
          opening_balance: number
          balance_type: "To Collect" | "To Pay"
          address: string
          city: string
          state: string
          pincode: string
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          mobile: string
          email?: string
          gstin?: string
          pan?: string
          type: "Debtor" | "Creditor" | "Expense"
          opening_balance?: number
          balance_type: "To Collect" | "To Pay"
          address: string
          city: string
          state: string
          pincode: string
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          mobile?: string
          email?: string
          gstin?: string
          pan?: string
          type?: "Debtor" | "Creditor" | "Expense"
          opening_balance?: number
          balance_type?: "To Collect" | "To Pay"
          address?: string
          city?: string
          state?: string
          pincode?: string
          created_at?: string
        }
      }
      items: {
        Row: {
          id: string
          business_id: string
          name: string
          code: string
          hsn_code: string
          gst_percent: number
          unit: string
          sales_price: number
          purchase_price: number
          opening_stock: number
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          code: string
          hsn_code?: string
          gst_percent?: number
          unit: string
          sales_price: number
          purchase_price: number
          opening_stock?: number
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          code?: string
          hsn_code?: string
          gst_percent?: number
          unit?: string
          sales_price?: number
          purchase_price?: number
          opening_stock?: number
          description?: string
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          business_id: string
          invoice_no: string
          date: string
          party_id: string
          party_name: string
          gstin: string
          state: string
          address: string
          items: any[]
          total_tax: number
          round_off: number
          net_total: number
          payment_received: number
          balance_due: number
          type: "sales" | "purchase"
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          invoice_no: string
          date: string
          party_id: string
          party_name: string
          gstin?: string
          state: string
          address: string
          items: any[]
          total_tax: number
          round_off: number
          net_total: number
          payment_received?: number
          balance_due: number
          type: "sales" | "purchase"
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          invoice_no?: string
          date?: string
          party_id?: string
          party_name?: string
          gstin?: string
          state?: string
          address?: string
          items?: any[]
          total_tax?: number
          round_off?: number
          net_total?: number
          payment_received?: number
          balance_due?: number
          type?: "sales" | "purchase"
          created_at?: string
        }
      }
    }
  }
}
