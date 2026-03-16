import { getSupabaseClient } from "@/lib/supabase"

export type RpcResult<T = any> = {
  data: T | null
  error: any
}

export async function rpcCall<T = any>(functionName: string, params: Record<string, any> = {}): Promise<RpcResult<T>> {
  try {
    const client = getSupabaseClient()
    if (!client) {
      return { data: null, error: new Error("Supabase client not available") }
    }

    const { data, error } = await client.rpc(functionName, params)
    if (error) {
      return { data: null, error }
    }

    return { data: data as T, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const rpcApi = {
  business: {
    getAll: (userId?: string | null) => rpcCall<any[]>("rpc_get_businesses", userId ? { p_user_id: userId } : {}),
    getById: (id: string) => rpcCall<any[]>("rpc_get_business_by_id", { p_id: id }),
    create: (payload: any) => rpcCall<string>("rpc_create_business", {
      p_name: payload.name,
      p_address: payload.address,
      p_city: payload.city,
      p_state: payload.state,
      p_pincode: payload.pincode,
      p_phone: payload.phone,
      p_email: payload.email,
      p_gstin: payload.gstin || null,
      p_pan: payload.pan || null,
      p_terms_conditions: payload.terms_conditions || null,
      p_invoice_template: payload.invoice_template || "classic",
    }),
    update: (id: string, payload: any) => rpcCall<boolean>("rpc_update_business", {
      p_id: id,
      p_name: payload.name ?? null,
      p_address: payload.address ?? null,
      p_city: payload.city ?? null,
      p_state: payload.state ?? null,
      p_pincode: payload.pincode ?? null,
      p_phone: payload.phone ?? null,
      p_email: payload.email ?? null,
      p_gstin: payload.gstin ?? null,
      p_pan: payload.pan ?? null,
      p_terms_conditions: payload.terms_conditions ?? null,
      p_invoice_template: payload.invoice_template ?? null,
    }),
    delete: (id: string) => rpcCall<boolean>("rpc_delete_business", { p_id: id }),
  },

  party: {
    getAll: (businessId: string) => rpcCall<any[]>("rpc_get_parties", { p_business_id: businessId }),
    create: (payload: any) => rpcCall<string>("rpc_create_party", {
      p_business_id: payload.business_id,
      p_name: payload.name,
      p_mobile: payload.mobile,
      p_address: payload.address,
      p_city: payload.city,
      p_state: payload.state,
      p_pincode: payload.pincode,
      p_email: payload.email || null,
      p_gstin: payload.gstin || null,
      p_pan: payload.pan || null,
      p_type: payload.type || "Debtor",
      p_opening_balance: payload.opening_balance || 0,
      p_balance_type: payload.balance_type || "To Collect",
    }),
    update: (id: string, payload: any) => rpcCall<boolean>("rpc_update_party", {
      p_id: id,
      p_name: payload.name ?? null,
      p_mobile: payload.mobile ?? null,
      p_email: payload.email ?? null,
      p_gstin: payload.gstin ?? null,
      p_pan: payload.pan ?? null,
      p_type: payload.type ?? null,
      p_opening_balance: payload.opening_balance ?? null,
      p_balance_type: payload.balance_type ?? null,
      p_address: payload.address ?? null,
      p_city: payload.city ?? null,
      p_state: payload.state ?? null,
      p_pincode: payload.pincode ?? null,
    }),
    delete: (id: string) => rpcCall<boolean>("rpc_delete_party", { p_id: id }),
  },

  item: {
    getAll: (businessId: string) => rpcCall<any[]>("rpc_get_items", { p_business_id: businessId }),
    create: (payload: any) => rpcCall<string>("rpc_create_item", {
      p_business_id: payload.business_id,
      p_name: payload.name,
      p_code: payload.code,
      p_unit: payload.unit,
      p_hsn_code: payload.hsn_code || null,
      p_gst_percent: payload.gst_percent || 0,
      p_sales_price: payload.sales_price || 0,
      p_purchase_price: payload.purchase_price || 0,
      p_opening_stock: payload.opening_stock || 0,
      p_description: payload.description || null,
    }),
    update: (id: string, payload: any) => rpcCall<boolean>("rpc_update_item", {
      p_id: id,
      p_name: payload.name ?? null,
      p_code: payload.code ?? null,
      p_hsn_code: payload.hsn_code ?? null,
      p_gst_percent: payload.gst_percent ?? null,
      p_unit: payload.unit ?? null,
      p_sales_price: payload.sales_price ?? null,
      p_purchase_price: payload.purchase_price ?? null,
      p_opening_stock: payload.opening_stock ?? null,
      p_description: payload.description ?? null,
    }),
    delete: (id: string) => rpcCall<boolean>("rpc_delete_item", { p_id: id }),
  },

  invoice: {
    getAll: (businessId: string, type?: string | null) => rpcCall<any[]>("rpc_get_invoices", {
      p_business_id: businessId,
      p_type: type || null,
    }),
    getById: (id: string) => rpcCall<any[]>("rpc_get_invoice_by_id", { p_id: id }),
    create: (payload: any) => rpcCall<string>("rpc_create_invoice", {
      p_business_id: payload.business_id,
      p_invoice_no: payload.invoice_no,
      p_date: payload.date,
      p_party_name: payload.party_name,
      p_state: payload.state,
      p_address: payload.address,
      p_net_total: payload.net_total,
      p_type: payload.type,
      p_party_id: payload.party_id || null,
      p_gstin: payload.gstin || null,
      p_items: payload.items || [],
      p_subtotal: payload.subtotal || 0,
      p_discount_amount: payload.discount_amount || 0,
      p_discount_percent: payload.discount_percent || 0,
      p_total_tax: payload.total_tax || 0,
      p_round_off: payload.round_off || 0,
      p_payment_received: payload.payment_received || 0,
      p_balance_due: payload.balance_due || 0,
      p_status: payload.status || "draft",
      p_due_date: payload.due_date || null,
      p_payment_method: payload.payment_method || "Cash",
    }),
    update: (id: string, payload: any) => rpcCall<boolean>("rpc_update_invoice", {
      p_id: id,
      p_invoice_no: payload.invoice_no ?? null,
      p_date: payload.date ?? null,
      p_party_name: payload.party_name ?? null,
      p_party_id: payload.party_id ?? null,
      p_gstin: payload.gstin ?? null,
      p_state: payload.state ?? null,
      p_address: payload.address ?? null,
      p_items: payload.items ?? null,
      p_subtotal: payload.subtotal ?? null,
      p_discount_amount: payload.discount_amount ?? null,
      p_discount_percent: payload.discount_percent ?? null,
      p_total_tax: payload.total_tax ?? null,
      p_round_off: payload.round_off ?? null,
      p_net_total: payload.net_total ?? null,
      p_payment_received: payload.payment_received ?? null,
      p_balance_due: payload.balance_due ?? null,
      p_status: payload.status ?? null,
      p_due_date: payload.due_date ?? null,
      p_payment_method: payload.payment_method ?? null,
    }),
    delete: (id: string) => rpcCall<boolean>("rpc_delete_invoice", { p_id: id }),
    getSalesItemsByInvoice: (invoiceId: string) => rpcCall<any[]>("rpc_get_sales_items_by_invoice", { p_invoice_id: invoiceId }),
  },

  payment: {
    getAll: (businessId: string) => rpcCall<any[]>("rpc_get_payments", { p_business_id: businessId }),
    create: (payload: any) => rpcCall<string>("rpc_create_payment", {
      p_business_id: payload.business_id,
      p_date: payload.date,
      p_party_name: payload.party_name,
      p_type: payload.type,
      p_amount: payload.amount,
      p_invoice_no: payload.invoice_no || null,
      p_mode: payload.mode || "Cash",
      p_remarks: payload.remarks || null,
    }),
    update: (id: string, payload: any) => rpcCall<boolean>("rpc_update_payment", {
      p_id: id,
      p_date: payload.date ?? null,
      p_party_name: payload.party_name ?? null,
      p_type: payload.type ?? null,
      p_invoice_no: payload.invoice_no ?? null,
      p_amount: payload.amount ?? null,
      p_mode: payload.mode ?? null,
      p_remarks: payload.remarks ?? null,
    }),
    delete: (id: string) => rpcCall<boolean>("rpc_delete_payment", { p_id: id }),
  },

  expense: {
    getAll: (businessId: string) => rpcCall<any[]>("rpc_get_expenses", { p_business_id: businessId }),
    create: (payload: any) => rpcCall<string>("rpc_create_expense", {
      p_business_id: payload.business_id,
      p_category: payload.category,
      p_description: payload.description,
      p_amount: payload.amount,
      p_date: payload.date,
      p_receipt_url: payload.receipt_url || null,
    }),
    update: (id: string, payload: any) => rpcCall<boolean>("rpc_update_expense", {
      p_id: id,
      p_category: payload.category ?? null,
      p_description: payload.description ?? null,
      p_amount: payload.amount ?? null,
      p_date: payload.date ?? null,
      p_receipt_url: payload.receipt_url ?? null,
    }),
    delete: (id: string) => rpcCall<boolean>("rpc_delete_expense", { p_id: id }),
  },

  bankAccount: {
    getAll: (businessId: string) => rpcCall<any[]>("rpc_get_bank_accounts", { p_business_id: businessId }),
    create: (payload: any) => rpcCall<string>("rpc_create_bank_account", {
      p_business_id: payload.business_id,
      p_bank_name: payload.bank_name,
      p_account_number: payload.account_number,
      p_ifsc_code: payload.ifsc_code,
      p_account_type: payload.account_type,
      p_branch_name: payload.branch_name,
      p_account_holder_name: payload.account_holder_name,
      p_opening_balance: payload.opening_balance || 0,
      p_current_balance: payload.current_balance || 0,
    }),
    update: (id: string, payload: any) => rpcCall<boolean>("rpc_update_bank_account", {
      p_id: id,
      p_bank_name: payload.bank_name ?? null,
      p_account_number: payload.account_number ?? null,
      p_ifsc_code: payload.ifsc_code ?? null,
      p_account_type: payload.account_type ?? null,
      p_branch_name: payload.branch_name ?? null,
      p_account_holder_name: payload.account_holder_name ?? null,
      p_current_balance: payload.current_balance ?? null,
      p_is_active: payload.is_active ?? null,
    }),
    delete: (id: string) => rpcCall<boolean>("rpc_delete_bank_account", { p_id: id }),
  },

  bankTransaction: {
    getAll: (businessId: string) => rpcCall<any[]>("rpc_get_bank_transactions", { p_business_id: businessId }),
    create: (payload: any) => rpcCall<string>("rpc_create_bank_transaction", {
      p_business_id: payload.business_id,
      p_date: payload.date,
      p_bank_name: payload.bank_name,
      p_account_no: payload.account_no,
      p_type: payload.type,
      p_amount: payload.amount,
      p_purpose: payload.purpose,
    }),
    delete: (id: string) => rpcCall<boolean>("rpc_delete_bank_transaction", { p_id: id }),
  },

  profile: {
    sync: (fullName?: string | null) => rpcCall<boolean>("rpc_sync_user_profile", { p_full_name: fullName || null }),
  },
}
