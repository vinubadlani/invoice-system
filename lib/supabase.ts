import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// Create Supabase client with proper error handling for build time
let supabaseClient: ReturnType<typeof createClient> | null = null
let rpcCompatClient: any = null
let missingEnvWarningLogged = false

type FilterCondition = { key: string; value: any; op: 'eq' | 'ilike' }
type RpcMutationError = {
  message: string
  details?: string
  code?: string
  hint?: string
}
type RpcMutationResult<T> = {
  data: T | null
  error: RpcMutationError | null
}

function toRpcMutationError(error: unknown): RpcMutationError {
  if (error instanceof Error) {
    return { message: error.message }
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as Record<string, unknown>
    return {
      message: typeof candidate.message === 'string' ? candidate.message : 'Unknown error',
      details: typeof candidate.details === 'string' ? candidate.details : undefined,
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      hint: typeof candidate.hint === 'string' ? candidate.hint : undefined,
    }
  }

  return { message: String(error) }
}

function normalizeMutationRows<T extends Record<string, any>>(rows: T | T[]): T[] {
  return Array.isArray(rows) ? rows : [rows]
}

function normalizeMutationSuccess<T>(data: T): RpcMutationResult<T> {
  return { data, error: null }
}

function normalizeMutationFailure<T>(error: unknown): RpcMutationResult<T> {
  return { data: null, error: toRpcMutationError(error) }
}

function normalizeTable(table: string) {
  if (table === 'sales_invoices') return { table: 'invoices', enforcedType: 'sales' as const }
  if (table === 'purchase_invoices') return { table: 'invoices', enforcedType: 'purchase' as const }
  if (table === 'sales') return { table: 'invoices', enforcedType: 'sales' as const }
  return { table, enforcedType: null as 'sales' | 'purchase' | null }
}

function buildRpcQueryBuilder(tableName: string) {
  const normalized = normalizeTable(tableName)
  const state: {
    mode: 'select' | 'insert' | 'update' | 'delete'
    payload: any
    filters: FilterCondition[]
    selectedFields: string
    limitCount?: number
    orderBy?: string
    ascending?: boolean
    single: boolean
    selectAfterMutation: boolean
  } = {
    mode: 'select',
    payload: null,
    filters: [],
    selectedFields: '*',
    limitCount: undefined,
    orderBy: undefined,
    ascending: true,
    single: false,
    selectAfterMutation: false,
  }

  const builder: any = {
    select(fields = '*') {
      if (state.mode === 'insert' || state.mode === 'update' || state.mode === 'delete') {
        state.selectAfterMutation = true
        state.selectedFields = fields
        return builder
      }
      state.mode = 'select'
      state.selectedFields = fields
      return builder
    },
    insert(payload: any) {
      state.mode = 'insert'
      state.payload = payload
      return builder
    },
    update(payload: any) {
      state.mode = 'update'
      state.payload = payload
      return builder
    },
    delete() {
      state.mode = 'delete'
      return builder
    },
    eq(key: string, value: any) {
      state.filters.push({ key, value, op: 'eq' })
      return builder
    },
    ilike(key: string, value: any) {
      state.filters.push({ key, value, op: 'ilike' })
      return builder
    },
    order(column: string, options?: { ascending?: boolean }) {
      state.orderBy = column
      state.ascending = options?.ascending ?? true
      return builder
    },
    limit(count: number) {
      state.limitCount = count
      return builder
    },
    single() {
      state.single = true
      return builder
    },
    then(resolve: any, reject: any) {
      return builder.execute().then(resolve, reject)
    },
    async execute() {
      const filters = state.filters.reduce((acc: Record<string, any>, item: FilterCondition) => {
        acc[item.key] = item.value
        return acc
      }, {})

      if (normalized.enforcedType && !filters.type) {
        filters.type = normalized.enforcedType
      }

      if (state.mode === 'select') {
        try {
          let data = await queryBuilder(normalized.table, state.selectedFields, filters, {
            limit: state.limitCount,
            orderBy: state.orderBy,
            ascending: state.ascending,
          })

          if (state.single) {
            if (!data || data.length === 0) {
              return { data: null, error: { code: 'PGRST116', message: 'No rows found' } }
            }
            return { data: data[0], error: null }
          }

          return { data, error: null }
        } catch (error) {
          return { data: null, error }
        }
      }

      if (state.mode === 'insert') {
        const values = Array.isArray(state.payload) ? state.payload : [state.payload]
        const insertedIds: string[] = []

        for (const value of values) {
          const payload = { ...value }
          if (normalized.enforcedType && !payload.type) {
            payload.type = normalized.enforcedType
          }

          const result = await insertData(normalized.table, payload)
          if (result.error) {
            return { data: null, error: result.error }
          }
          const insertedId = result.data?.[0]?.id
          if (insertedId) insertedIds.push(insertedId)
        }

        if (state.selectAfterMutation) {
          const selectedRows: any[] = []
          for (const id of insertedIds) {
            const rows = await queryBuilder(normalized.table, state.selectedFields, { id }, { limit: 1 })
            if (rows?.[0]) selectedRows.push(rows[0])
          }
          if (state.single) {
            return { data: selectedRows[0] || null, error: selectedRows[0] ? null : { code: 'PGRST116', message: 'No rows found' } }
          }
          return { data: selectedRows, error: null }
        }

        return { data: insertedIds.map((id) => ({ id })), error: null }
      }

      if (state.mode === 'update') {
        const targetId = filters.id
        if (!targetId) {
          return { data: null, error: new Error('id filter is required for update') }
        }

        const payload = { ...state.payload }
        if (normalized.enforcedType && !payload.type) {
          payload.type = normalized.enforcedType
        }

        const result = await updateData(normalized.table, targetId, payload)
        if (result.error) {
          return { data: null, error: result.error }
        }

        if (state.selectAfterMutation || state.single) {
          const rows = await queryBuilder(normalized.table, state.selectedFields, { id: targetId }, { limit: 1 })
          if (state.single) {
            return { data: rows?.[0] || null, error: rows?.[0] ? null : { code: 'PGRST116', message: 'No rows found' } }
          }
          return { data: rows || [], error: null }
        }

        return { data: true, error: null }
      }

      const targetId = filters.id
      if (!targetId) {
        return { data: null, error: new Error('id filter is required for delete') }
      }
      const result = await deleteData(normalized.table, targetId)
      if (result.error) {
        return { data: null, error: result.error }
      }
      return { data: true, error: null }
    }
  }

  return builder
}

function buildRpcCompatClient(client: any) {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) => buildRpcQueryBuilder(table)
      }
      return Reflect.get(target, prop, receiver)
    }
  })
}

export function getSupabaseClient() {
  // Return null when env vars are missing so the app can render gracefully.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (!missingEnvWarningLogged && typeof window !== 'undefined') {
      console.error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)')
      missingEnvWarningLogged = true
    }
    return null
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

  if (!rpcCompatClient) {
    rpcCompatClient = buildRpcCompatClient(supabaseClient)
  }

  return rpcCompatClient
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

async function rpcExec<T = any>(functionName: string, params: Record<string, any> = {}) {
  const client = ensureSupabaseClient()
  const { data, error } = await client.rpc(functionName, params)
  if (error) {
    throw error
  }
  return data as T
}

function filterRows(rows: any[], filters: Record<string, any>) {
  const activeEntries = Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (activeEntries.length === 0) {
    return rows
  }

  return rows.filter((row) => {
    return activeEntries.every(([key, value]) => {
      const rowValue = row?.[key]
      if (typeof value === 'string' && value.includes('%')) {
        const pattern = value.replaceAll('%', '').toLowerCase()
        return String(rowValue ?? '').toLowerCase().includes(pattern)
      }
      return rowValue === value
    })
  })
}

// Enhanced query builder with error handling
export async function queryBuilder(
  table: string, 
  fields = '*', 
  filters: Record<string, any> = {},
  options: { limit?: number; orderBy?: string; ascending?: boolean } = {}
) {
  try {
    let rows: any[] = []

    switch (table) {
      case 'businesses':
        if (filters.id) {
          rows = await rpcExec<any[]>('rpc_get_business_by_id', { p_id: filters.id }) || []
        } else {
          rows = await rpcExec<any[]>('rpc_get_businesses', { p_user_id: filters.user_id || null }) || []
        }
        break
      case 'parties':
        if (!filters.business_id) throw new Error('business_id is required for parties query')
        rows = await rpcExec<any[]>('rpc_get_parties', { p_business_id: filters.business_id }) || []
        break
      case 'items':
        if (!filters.business_id) throw new Error('business_id is required for items query')
        rows = await rpcExec<any[]>('rpc_get_items', { p_business_id: filters.business_id }) || []
        break
      case 'invoices':
        if (filters.id) {
          rows = await rpcExec<any[]>('rpc_get_invoice_by_id', { p_id: filters.id }) || []
        } else {
          if (!filters.business_id) throw new Error('business_id is required for invoices query')
          rows = await rpcExec<any[]>('rpc_get_invoices', { p_business_id: filters.business_id, p_type: filters.type || null }) || []
        }
        break
      case 'payments':
        if (!filters.business_id) throw new Error('business_id is required for payments query')
        rows = await rpcExec<any[]>('rpc_get_payments', { p_business_id: filters.business_id }) || []
        break
      case 'expenses':
        if (!filters.business_id) throw new Error('business_id is required for expenses query')
        rows = await rpcExec<any[]>('rpc_get_expenses', { p_business_id: filters.business_id }) || []
        break
      case 'bank_accounts':
        if (!filters.business_id) throw new Error('business_id is required for bank_accounts query')
        rows = await rpcExec<any[]>('rpc_get_bank_accounts', { p_business_id: filters.business_id }) || []
        break
      case 'bank_transactions':
        if (!filters.business_id) throw new Error('business_id is required for bank_transactions query')
        rows = await rpcExec<any[]>('rpc_get_bank_transactions', { p_business_id: filters.business_id }) || []
        break
      case 'sales_items':
        if (!filters.invoice_id) throw new Error('invoice_id is required for sales_items query')
        rows = await rpcExec<any[]>('rpc_get_sales_items_by_invoice', { p_invoice_id: filters.invoice_id }) || []
        break
      default:
        throw new Error(`Table ${table} is not allowed for direct queryBuilder access. Use RPC mappings only.`)
    }

    let filteredRows = filterRows(rows, filters)

    if (options.orderBy) {
      const ascending = options.ascending ?? true
      filteredRows = [...filteredRows].sort((a, b) => {
        const av = a?.[options.orderBy!]
        const bv = b?.[options.orderBy!]
        if (av === bv) return 0
        if (av === undefined || av === null) return ascending ? 1 : -1
        if (bv === undefined || bv === null) return ascending ? -1 : 1
        return ascending ? (av > bv ? 1 : -1) : (av > bv ? -1 : 1)
      })
    }

    if (options.limit) {
      filteredRows = filteredRows.slice(0, options.limit)
    }

    if (fields !== '*') {
      const keys = fields.split(',').map((f) => f.trim())
      return filteredRows.map((row) => {
        const selected: Record<string, any> = {}
        keys.forEach((key) => {
          selected[key] = row?.[key]
        })
        return selected
      })
    }

    return filteredRows
  } catch (error) {
    console.error('Query error:', error)
    throw error
  }
}

// Enhanced insert with validation
export async function insertData(table: string, data: Record<string, any>): Promise<RpcMutationResult<Array<{ id: string }>>> {
  try {
    const validatedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? validators.sanitizeString(value) : value
      ])
    )

    switch (table) {
      case 'businesses': {
        const id = await rpcExec<string>('rpc_create_business', {
          p_name: validatedData.name,
          p_address: validatedData.address,
          p_city: validatedData.city,
          p_state: validatedData.state,
          p_pincode: validatedData.pincode,
          p_phone: validatedData.phone,
          p_email: validatedData.email,
          p_gstin: validatedData.gstin || null,
          p_pan: validatedData.pan || null,
          p_terms_conditions: validatedData.terms_conditions || null,
          p_invoice_template: validatedData.invoice_template || 'classic',
        })
        return normalizeMutationSuccess([{ id }])
      }
      case 'parties': {
        const partyParams = {
          p_business_id: validatedData.business_id,
          p_name: validatedData.name,
          p_mobile: validatedData.mobile || '',
          p_address: validatedData.address || '',
          p_city: validatedData.city || '',
          p_state: validatedData.state || '',
          p_pincode: validatedData.pincode || '',
          p_email: validatedData.email || null,
          p_gstin: validatedData.gstin || null,
          p_pan: validatedData.pan || null,
          p_type: validatedData.type || 'Debtor',
          p_opening_balance: validatedData.opening_balance || 0,
          p_balance_type: validatedData.balance_type || 'To Collect',
        }
        const id = await rpcExec<string>('rpc_create_party', partyParams)
        return normalizeMutationSuccess([{ id }])
      }
      case 'items': {
        const id = await rpcExec<string>('rpc_create_item', {
          p_business_id: validatedData.business_id,
          p_name: validatedData.name,
          p_code: validatedData.code,
          p_unit: validatedData.unit,
          p_hsn_code: validatedData.hsn_code || null,
          p_gst_percent: validatedData.gst_percent || 0,
          p_sales_price: validatedData.sales_price || 0,
          p_purchase_price: validatedData.purchase_price || 0,
          p_opening_stock: validatedData.opening_stock || 0,
          p_description: validatedData.description || null,
        })
        return normalizeMutationSuccess([{ id }])
      }
      case 'invoices': {
        const id = await rpcExec<string>('rpc_create_invoice', {
          p_business_id: validatedData.business_id,
          p_invoice_no: validatedData.invoice_no,
          p_date: validatedData.date,
          p_party_name: validatedData.party_name,
          p_state: validatedData.state,
          p_address: validatedData.address,
          p_net_total: validatedData.net_total,
          p_type: validatedData.type,
          p_party_id: validatedData.party_id || null,
          p_gstin: validatedData.gstin || null,
          p_items: validatedData.items || [],
          p_subtotal: validatedData.subtotal || 0,
          p_discount_amount: validatedData.discount_amount || 0,
          p_discount_percent: validatedData.discount_percent || 0,
          p_total_tax: validatedData.total_tax || 0,
          p_round_off: validatedData.round_off || 0,
          p_payment_received: validatedData.payment_received || 0,
          p_balance_due: validatedData.balance_due || 0,
          p_status: validatedData.status || 'draft',
          p_due_date: validatedData.due_date || null,
          p_payment_method: validatedData.payment_method || 'Cash',
        })
        return normalizeMutationSuccess([{ id }])
      }
      case 'payments': {
        const id = await rpcExec<string>('rpc_create_payment', {
          p_business_id: validatedData.business_id,
          p_date: validatedData.date,
          p_party_name: validatedData.party_name,
          p_type: validatedData.type,
          p_amount: validatedData.amount,
          p_invoice_no: validatedData.invoice_no || null,
          p_mode: validatedData.mode || 'Cash',
          p_remarks: validatedData.remarks || null,
        })
        return normalizeMutationSuccess([{ id }])
      }
      case 'expenses': {
        const id = await rpcExec<string>('rpc_create_expense', {
          p_business_id: validatedData.business_id,
          p_category: validatedData.category,
          p_description: validatedData.description,
          p_amount: validatedData.amount,
          p_date: validatedData.date,
          p_receipt_url: validatedData.receipt_url || null,
        })
        return normalizeMutationSuccess([{ id }])
      }
      case 'bank_accounts': {
        const id = await rpcExec<string>('rpc_create_bank_account', {
          p_business_id: validatedData.business_id,
          p_bank_name: validatedData.bank_name,
          p_account_number: validatedData.account_number,
          p_account_type: validatedData.account_type,
          p_ifsc_code: validatedData.ifsc_code,
          p_branch_name: validatedData.branch_name || 'Main Branch',
          p_account_holder_name: validatedData.account_holder_name || 'Account Holder',
          p_opening_balance: validatedData.opening_balance || 0,
          p_current_balance: validatedData.current_balance ?? validatedData.opening_balance ?? 0,
        })
        return normalizeMutationSuccess([{ id }])
      }
      case 'bank_transactions': {
        const id = await rpcExec<string>('rpc_create_bank_transaction', {
          p_business_id: validatedData.business_id,
          p_date: validatedData.date,
          p_bank_name: validatedData.bank_name,
          p_account_no: validatedData.account_number || validatedData.account_no,
          p_type: validatedData.type,
          p_amount: validatedData.amount,
          p_purpose: validatedData.purpose || validatedData.description,
        })
        return normalizeMutationSuccess([{ id }])
      }
      default:
        throw new Error(`Table ${table} is not allowed for direct insertData access. Use RPC mappings only.`)
    }
  } catch (error) {
    console.error('Insert error:', error)
    return normalizeMutationFailure(error)
  }
}

// Enhanced update with validation
export async function updateData(table: string, id: string, data: Record<string, any>): Promise<RpcMutationResult<boolean>> {
  try {
    const validatedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? validators.sanitizeString(value) : value
      ])
    )

    switch (table) {
      case 'businesses':
        await rpcExec<boolean>('rpc_update_business', { p_id: id, ...Object.fromEntries(Object.entries(validatedData).map(([k, v]) => [`p_${k}`, v ?? null])) })
        return normalizeMutationSuccess(true)
      case 'parties':
        await rpcExec<boolean>('rpc_update_party', { p_id: id, ...Object.fromEntries(Object.entries(validatedData).map(([k, v]) => [`p_${k}`, v ?? null])) })
        return normalizeMutationSuccess(true)
      case 'items':
        await rpcExec<boolean>('rpc_update_item', { p_id: id, ...Object.fromEntries(Object.entries(validatedData).map(([k, v]) => [`p_${k}`, v ?? null])) })
        return normalizeMutationSuccess(true)
      case 'invoices': {
        // Only pass params the DB function accepts — extra fields (type, business_id, etc.) break RPC lookup
        const allowed = ['invoice_no','date','party_name','party_id','gstin','state','address','items',
          'subtotal','discount_amount','discount_percent','total_tax','round_off','net_total',
          'payment_received','balance_due','status','due_date','payment_method']
        const invoiceParams: Record<string, any> = { p_id: id }
        for (const key of allowed) {
          if (key in validatedData) invoiceParams[`p_${key}`] = validatedData[key] ?? null
        }
        await rpcExec<boolean>('rpc_update_invoice', invoiceParams)
        return normalizeMutationSuccess(true)
      }
      case 'payments':
        await rpcExec<boolean>('rpc_update_payment', { p_id: id, ...Object.fromEntries(Object.entries(validatedData).map(([k, v]) => [`p_${k}`, v ?? null])) })
        return normalizeMutationSuccess(true)
      case 'expenses':
        await rpcExec<boolean>('rpc_update_expense', { p_id: id, ...Object.fromEntries(Object.entries(validatedData).map(([k, v]) => [`p_${k}`, v ?? null])) })
        return normalizeMutationSuccess(true)
      case 'bank_accounts':
        await rpcExec<boolean>('rpc_update_bank_account', { p_id: id, ...Object.fromEntries(Object.entries(validatedData).map(([k, v]) => [`p_${k}`, v ?? null])) })
        return normalizeMutationSuccess(true)
      default:
        throw new Error(`Table ${table} is not allowed for direct updateData access. Use RPC mappings only.`)
    }
  } catch (error) {
    console.error('Update error:', error)
    return normalizeMutationFailure(error)
  }
}

// Enhanced delete
export async function deleteData(table: string, id: string): Promise<RpcMutationResult<boolean>> {
  try {
    switch (table) {
      case 'businesses':
        await rpcExec<boolean>('rpc_delete_business', { p_id: id })
        return normalizeMutationSuccess(true)
      case 'parties':
        await rpcExec<boolean>('rpc_delete_party', { p_id: id })
        return normalizeMutationSuccess(true)
      case 'items':
        await rpcExec<boolean>('rpc_delete_item', { p_id: id })
        return normalizeMutationSuccess(true)
      case 'invoices':
        await rpcExec<boolean>('rpc_delete_invoice', { p_id: id })
        return normalizeMutationSuccess(true)
      case 'payments':
        await rpcExec<boolean>('rpc_delete_payment', { p_id: id })
        return normalizeMutationSuccess(true)
      case 'expenses':
        await rpcExec<boolean>('rpc_delete_expense', { p_id: id })
        return normalizeMutationSuccess(true)
      case 'bank_accounts':
        await rpcExec<boolean>('rpc_delete_bank_account', { p_id: id })
        return normalizeMutationSuccess(true)
      case 'bank_transactions':
        await rpcExec<boolean>('rpc_delete_bank_transaction', { p_id: id })
        return normalizeMutationSuccess(true)
      default:
        throw new Error(`Table ${table} is not allowed for direct deleteData access. Use RPC mappings only.`)
    }
  } catch (error) {
    console.error('Delete error:', error)
    return normalizeMutationFailure(error)
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

    const client = ensureSupabaseClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user || user.id !== userId) {
      console.error('Authentication issue in verifyBusinessOwnership:', {
        authError: authError?.message || 'No auth error',
        userExists: !!user,
        userIdMatch: user?.id === userId
      })
      return false
    }

    const businesses = await rpcExec<any[]>('rpc_get_business_by_id', { p_id: businessId })
    const data = businesses?.[0]
    const error: { code?: string; message?: string; details?: string; hint?: string } | null = data
      ? null
      : { code: 'PGRST116', message: 'No rows found' }

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
          const userBusinesses = await rpcExec<any[]>('rpc_get_businesses', { p_user_id: userId })
          console.log('User businesses:', userBusinesses)
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

    const data = await rpcExec<any[]>('rpc_get_businesses', { p_user_id: userId })
    return data || []
  } catch (error: any) {
    console.error('Error fetching businesses:', error?.message || 'Unknown error')
    return []
  }
}

export async function fetchParties(businessId: string, type?: "Debtor" | "Creditor" | "Expense", _userId?: string) {
  try {
    if (!businessId) return []

    const data = await rpcExec<any[]>('rpc_get_parties', { p_business_id: businessId })
    const rows = data || []
    return type ? rows.filter((row) => row.type === type) : rows
  } catch (error: any) {
    console.error('Error fetching parties:', error?.message || 'Unknown error')
    return []
  }
}

export async function fetchItems(businessId: string, _userId?: string) {
  try {
    if (!businessId) return []

    const data = await rpcExec<any[]>('rpc_get_items', { p_business_id: businessId })
    return data || []
  } catch (error: any) {
    console.error('Error fetching items:', error?.message || 'Unknown error')
    return []
  }
}

export async function fetchInvoices(businessId: string, type?: "sales" | "purchase", limit = 50, _userId?: string) {
  try {
    if (!businessId) return []

    const data = await rpcExec<any[]>('rpc_get_invoices', {
      p_business_id: businessId,
      p_type: type || null,
    })
    const rows = data || []
    return rows.slice(0, limit)
  } catch (error: any) {
    console.error('Error fetching invoices:', error?.message || 'Unknown error')
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
      
      const data = await rpcExec<any[]>('rpc_get_invoice_by_id', { p_id: invoiceId })
      return data?.[0] || null
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
