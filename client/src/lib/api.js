import { rpcCall } from './supabaseClient'

// =====================================================
// BUSINESS OPERATIONS
// =====================================================

export const businessAPI = {
  getAll: async (userId = null) => {
    return await rpcCall('rpc_get_businesses', userId ? { p_user_id: userId } : {})
  },

  getById: async (id) => {
    return await rpcCall('rpc_get_business_by_id', { p_id: id })
  },

  create: async (businessData) => {
    return await rpcCall('rpc_create_business', {
      p_name: businessData.name,
      p_address: businessData.address,
      p_city: businessData.city,
      p_state: businessData.state,
      p_pincode: businessData.pincode,
      p_phone: businessData.phone,
      p_email: businessData.email,
      p_gstin: businessData.gstin || null,
      p_pan: businessData.pan || null,
      p_terms_conditions: businessData.terms_conditions || null,
      p_invoice_template: businessData.invoice_template || 'classic'
    })
  },

  update: async (id, businessData) => {
    return await rpcCall('rpc_update_business', {
      p_id: id,
      p_name: businessData.name || null,
      p_address: businessData.address || null,
      p_city: businessData.city || null,
      p_state: businessData.state || null,
      p_pincode: businessData.pincode || null,
      p_phone: businessData.phone || null,
      p_email: businessData.email || null,
      p_gstin: businessData.gstin || null,
      p_pan: businessData.pan || null,
      p_terms_conditions: businessData.terms_conditions || null,
      p_invoice_template: businessData.invoice_template || null
    })
  },

  delete: async (id) => {
    return await rpcCall('rpc_delete_business', { p_id: id })
  }
}

// =====================================================
// BANK ACCOUNT OPERATIONS
// =====================================================

export const bankAccountAPI = {
  getAll: async (businessId) => {
    return await rpcCall('rpc_get_bank_accounts', { p_business_id: businessId })
  },

  create: async (accountData) => {
    return await rpcCall('rpc_create_bank_account', {
      p_business_id: accountData.business_id,
      p_bank_name: accountData.bank_name,
      p_account_number: accountData.account_number,
      p_ifsc_code: accountData.ifsc_code,
      p_account_type: accountData.account_type,
      p_branch_name: accountData.branch_name,
      p_account_holder_name: accountData.account_holder_name,
      p_opening_balance: accountData.opening_balance || 0,
      p_current_balance: accountData.current_balance || 0
    })
  },

  update: async (id, accountData) => {
    return await rpcCall('rpc_update_bank_account', {
      p_id: id,
      p_bank_name: accountData.bank_name || null,
      p_account_number: accountData.account_number || null,
      p_ifsc_code: accountData.ifsc_code || null,
      p_account_type: accountData.account_type || null,
      p_branch_name: accountData.branch_name || null,
      p_account_holder_name: accountData.account_holder_name || null,
      p_current_balance: accountData.current_balance || null,
      p_is_active: accountData.is_active !== undefined ? accountData.is_active : null
    })
  },

  delete: async (id) => {
    return await rpcCall('rpc_delete_bank_account', { p_id: id })
  }
}

// =====================================================
// BANK TRANSACTION OPERATIONS
// =====================================================

export const bankTransactionAPI = {
  getAll: async (businessId) => {
    return await rpcCall('rpc_get_bank_transactions', { p_business_id: businessId })
  },

  create: async (transactionData) => {
    return await rpcCall('rpc_create_bank_transaction', {
      p_business_id: transactionData.business_id,
      p_date: transactionData.date,
      p_bank_name: transactionData.bank_name,
      p_account_no: transactionData.account_no,
      p_type: transactionData.type,
      p_amount: transactionData.amount,
      p_purpose: transactionData.purpose
    })
  },

  delete: async (id) => {
    return await rpcCall('rpc_delete_bank_transaction', { p_id: id })
  }
}

// =====================================================
// PARTY OPERATIONS
// =====================================================

export const partyAPI = {
  getAll: async (businessId) => {
    return await rpcCall('rpc_get_parties', { p_business_id: businessId })
  },

  create: async (partyData) => {
    return await rpcCall('rpc_create_party', {
      p_business_id: partyData.business_id,
      p_name: partyData.name,
      p_mobile: partyData.mobile,
      p_address: partyData.address,
      p_city: partyData.city,
      p_state: partyData.state,
      p_pincode: partyData.pincode,
      p_email: partyData.email || null,
      p_gstin: partyData.gstin || null,
      p_pan: partyData.pan || null,
      p_type: partyData.type || 'Debtor',
      p_opening_balance: partyData.opening_balance || 0,
      p_balance_type: partyData.balance_type || 'To Collect'
    })
  },

  update: async (id, partyData) => {
    return await rpcCall('rpc_update_party', {
      p_id: id,
      p_name: partyData.name || null,
      p_mobile: partyData.mobile || null,
      p_email: partyData.email || null,
      p_gstin: partyData.gstin || null,
      p_pan: partyData.pan || null,
      p_type: partyData.type || null,
      p_opening_balance: partyData.opening_balance || null,
      p_balance_type: partyData.balance_type || null,
      p_address: partyData.address || null,
      p_city: partyData.city || null,
      p_state: partyData.state || null,
      p_pincode: partyData.pincode || null
    })
  },

  delete: async (id) => {
    return await rpcCall('rpc_delete_party', { p_id: id })
  }
}

// =====================================================
// ITEM OPERATIONS
// =====================================================

export const itemAPI = {
  getAll: async (businessId) => {
    return await rpcCall('rpc_get_items', { p_business_id: businessId })
  },

  create: async (itemData) => {
    return await rpcCall('rpc_create_item', {
      p_business_id: itemData.business_id,
      p_name: itemData.name,
      p_code: itemData.code,
      p_unit: itemData.unit,
      p_hsn_code: itemData.hsn_code || null,
      p_gst_percent: itemData.gst_percent || 0,
      p_sales_price: itemData.sales_price || 0,
      p_purchase_price: itemData.purchase_price || 0,
      p_opening_stock: itemData.opening_stock || 0,
      p_description: itemData.description || null
    })
  },

  update: async (id, itemData) => {
    return await rpcCall('rpc_update_item', {
      p_id: id,
      p_name: itemData.name || null,
      p_code: itemData.code || null,
      p_hsn_code: itemData.hsn_code || null,
      p_gst_percent: itemData.gst_percent || null,
      p_unit: itemData.unit || null,
      p_sales_price: itemData.sales_price || null,
      p_purchase_price: itemData.purchase_price || null,
      p_opening_stock: itemData.opening_stock || null,
      p_description: itemData.description || null
    })
  },

  delete: async (id) => {
    return await rpcCall('rpc_delete_item', { p_id: id })
  }
}

// =====================================================
// INVOICE OPERATIONS
// =====================================================

export const invoiceAPI = {
  getAll: async (businessId, type = null) => {
    return await rpcCall('rpc_get_invoices', { 
      p_business_id: businessId,
      p_type: type
    })
  },

  getById: async (id) => {
    return await rpcCall('rpc_get_invoice_by_id', { p_id: id })
  },

  create: async (invoiceData) => {
    return await rpcCall('rpc_create_invoice', {
      p_business_id: invoiceData.business_id,
      p_invoice_no: invoiceData.invoice_no,
      p_date: invoiceData.date,
      p_party_name: invoiceData.party_name,
      p_state: invoiceData.state,
      p_address: invoiceData.address,
      p_net_total: invoiceData.net_total,
      p_type: invoiceData.type,
      p_party_id: invoiceData.party_id || null,
      p_gstin: invoiceData.gstin || null,
      p_items: invoiceData.items || '[]',
      p_subtotal: invoiceData.subtotal || 0,
      p_discount_amount: invoiceData.discount_amount || 0,
      p_discount_percent: invoiceData.discount_percent || 0,
      p_total_tax: invoiceData.total_tax || 0,
      p_round_off: invoiceData.round_off || 0,
      p_payment_received: invoiceData.payment_received || 0,
      p_balance_due: invoiceData.balance_due || 0,
      p_status: invoiceData.status || 'draft',
      p_due_date: invoiceData.due_date || null,
      p_payment_method: invoiceData.payment_method || 'Cash'
    })
  },

  update: async (id, invoiceData) => {
    return await rpcCall('rpc_update_invoice', {
      p_id: id,
      p_invoice_no: invoiceData.invoice_no || null,
      p_date: invoiceData.date || null,
      p_party_name: invoiceData.party_name || null,
      p_party_id: invoiceData.party_id || null,
      p_gstin: invoiceData.gstin || null,
      p_state: invoiceData.state || null,
      p_address: invoiceData.address || null,
      p_items: invoiceData.items || null,
      p_subtotal: invoiceData.subtotal || null,
      p_discount_amount: invoiceData.discount_amount || null,
      p_discount_percent: invoiceData.discount_percent || null,
      p_total_tax: invoiceData.total_tax || null,
      p_round_off: invoiceData.round_off || null,
      p_net_total: invoiceData.net_total || null,
      p_payment_received: invoiceData.payment_received || null,
      p_balance_due: invoiceData.balance_due || null,
      p_status: invoiceData.status || null,
      p_due_date: invoiceData.due_date || null,
      p_payment_method: invoiceData.payment_method || null
    })
  },

  delete: async (id) => {
    return await rpcCall('rpc_delete_invoice', { p_id: id })
  }
}

// =====================================================
// PAYMENT OPERATIONS
// =====================================================

export const paymentAPI = {
  getAll: async (businessId) => {
    return await rpcCall('rpc_get_payments', { p_business_id: businessId })
  },

  create: async (paymentData) => {
    return await rpcCall('rpc_create_payment', {
      p_business_id: paymentData.business_id,
      p_date: paymentData.date,
      p_party_name: paymentData.party_name,
      p_type: paymentData.type,
      p_amount: paymentData.amount,
      p_invoice_no: paymentData.invoice_no || null,
      p_mode: paymentData.mode || 'Cash',
      p_remarks: paymentData.remarks || null
    })
  },

  update: async (id, paymentData) => {
    return await rpcCall('rpc_update_payment', {
      p_id: id,
      p_date: paymentData.date || null,
      p_party_name: paymentData.party_name || null,
      p_type: paymentData.type || null,
      p_invoice_no: paymentData.invoice_no || null,
      p_amount: paymentData.amount || null,
      p_mode: paymentData.mode || null,
      p_remarks: paymentData.remarks || null
    })
  },

  delete: async (id) => {
    return await rpcCall('rpc_delete_payment', { p_id: id })
  }
}

// =====================================================
// EXPENSE OPERATIONS
// =====================================================

export const expenseAPI = {
  getAll: async (businessId) => {
    return await rpcCall('rpc_get_expenses', { p_business_id: businessId })
  },

  create: async (expenseData) => {
    return await rpcCall('rpc_create_expense', {
      p_business_id: expenseData.business_id,
      p_category: expenseData.category,
      p_description: expenseData.description,
      p_amount: expenseData.amount,
      p_date: expenseData.date,
      p_receipt_url: expenseData.receipt_url || null
    })
  },

  update: async (id, expenseData) => {
    return await rpcCall('rpc_update_expense', {
      p_id: id,
      p_category: expenseData.category || null,
      p_description: expenseData.description || null,
      p_amount: expenseData.amount || null,
      p_date: expenseData.date || null,
      p_receipt_url: expenseData.receipt_url || null
    })
  },

  delete: async (id) => {
    return await rpcCall('rpc_delete_expense', { p_id: id })
  }
}

// Combined export
export const api = {
  business: businessAPI,
  bankAccount: bankAccountAPI,
  bankTransaction: bankTransactionAPI,
  party: partyAPI,
  item: itemAPI,
  invoice: invoiceAPI,
  payment: paymentAPI,
  expense: expenseAPI
}

export default api
