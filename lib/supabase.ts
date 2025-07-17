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

// Optimized query helper for better performance
export const optimizedQuery = {
  // Cached select with minimal fields
  selectMinimal: (table: string, fields: string, filters?: Record<string, any>) => {
    let query = supabase.from(table).select(fields)
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    
    return query
  },
  
  // Paginated queries for large datasets
  selectPaginated: (table: string, fields: string, page: number = 1, pageSize: number = 25) => {
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
    return supabase
      .from(table)
      .select(fields)
      .ilike(searchField, `%${searchTerm}%`)
      .limit(20)
  },
}

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
