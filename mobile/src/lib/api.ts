/**
 * Data access layer. Mirrors lib/rpc-api.ts on the web app exactly — the web
 * app's `.from(table)` calls are themselves proxied to these same Postgres RPC
 * functions (see db/rpc-hardening-migration.sql), so calling them directly
 * here keeps mobile and web on one identical, RLS + ownership-checked code path.
 * Do not switch these to raw `.from(table).select()` calls without checking
 * that RLS alone reproduces the same behavior — the RPCs add an explicit
 * "business belongs to auth.uid()" check on top of RLS as defense-in-depth.
 */
import { supabase } from './supabase';
import {
  BankAccount,
  BankTransaction,
  Business,
  Expense,
  Invoice,
  InvoiceItemsEntry,
  InvoiceStatus,
  InvoiceType,
  Item,
  Party,
  Payment,
} from './types';

async function call<T>(fn: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw error;
  return data as T;
}

export const api = {
  business: {
    getAll: (userId?: string) => call<Business[]>('rpc_get_businesses', { p_user_id: userId ?? null }),
    getById: (id: string) => call<Business[]>('rpc_get_business_by_id', { p_id: id }),
    create: (b: Omit<Business, 'id' | 'created_at' | 'user_id'>) =>
      call<string>('rpc_create_business', {
        p_name: b.name,
        p_address: b.address,
        p_city: b.city,
        p_state: b.state,
        p_pincode: b.pincode,
        p_phone: b.phone,
        p_email: b.email,
        p_gstin: b.gstin ?? null,
        p_pan: b.pan ?? null,
        p_terms_conditions: b.terms_conditions ?? null,
        p_invoice_template: b.invoice_template ?? 'classic',
      }),
    update: (id: string, b: Partial<Business>) =>
      call<boolean>('rpc_update_business', {
        p_id: id,
        p_name: b.name ?? null,
        p_address: b.address ?? null,
        p_city: b.city ?? null,
        p_state: b.state ?? null,
        p_pincode: b.pincode ?? null,
        p_phone: b.phone ?? null,
        p_email: b.email ?? null,
        p_gstin: b.gstin ?? null,
        p_pan: b.pan ?? null,
        p_terms_conditions: b.terms_conditions ?? null,
        p_invoice_template: b.invoice_template ?? null,
      }),
    delete: (id: string) => call<boolean>('rpc_delete_business', { p_id: id }),
  },

  party: {
    getAll: (businessId: string) => call<Party[]>('rpc_get_parties', { p_business_id: businessId }),
    create: (p: Omit<Party, 'id' | 'created_at'>) =>
      call<string>('rpc_create_party', {
        p_business_id: p.business_id,
        p_name: p.name,
        p_mobile: p.mobile,
        p_address: p.address,
        p_city: p.city,
        p_state: p.state,
        p_pincode: p.pincode,
        p_email: p.email ?? null,
        p_gstin: p.gstin ?? null,
        p_pan: p.pan ?? null,
        p_type: p.type ?? 'Debtor',
        p_opening_balance: p.opening_balance ?? 0,
        p_balance_type: p.balance_type ?? 'To Collect',
      }),
    update: (id: string, p: Partial<Party>) =>
      call<boolean>('rpc_update_party', {
        p_id: id,
        p_name: p.name ?? null,
        p_mobile: p.mobile ?? null,
        p_address: p.address ?? null,
        p_city: p.city ?? null,
        p_state: p.state ?? null,
        p_pincode: p.pincode ?? null,
        p_email: p.email ?? null,
        p_gstin: p.gstin ?? null,
        p_pan: p.pan ?? null,
        p_type: p.type ?? null,
        p_opening_balance: p.opening_balance ?? null,
        p_balance_type: p.balance_type ?? null,
      }),
    delete: (id: string) => call<boolean>('rpc_delete_party', { p_id: id }),
  },

  item: {
    getAll: (businessId: string) => call<Item[]>('rpc_get_items', { p_business_id: businessId }),
    create: (i: Omit<Item, 'id' | 'created_at'>) =>
      call<string>('rpc_create_item', {
        p_business_id: i.business_id,
        p_name: i.name,
        p_code: i.code,
        p_unit: i.unit,
        p_hsn_code: i.hsn_code ?? null,
        p_gst_percent: i.gst_percent ?? 0,
        p_sales_price: i.sales_price ?? 0,
        p_purchase_price: i.purchase_price ?? 0,
        p_opening_stock: i.opening_stock ?? 0,
        p_description: i.description ?? null,
      }),
    update: (id: string, i: Partial<Item>) =>
      call<boolean>('rpc_update_item', {
        p_id: id,
        p_name: i.name ?? null,
        p_code: i.code ?? null,
        p_unit: i.unit ?? null,
        p_hsn_code: i.hsn_code ?? null,
        p_gst_percent: i.gst_percent ?? null,
        p_sales_price: i.sales_price ?? null,
        p_purchase_price: i.purchase_price ?? null,
        p_opening_stock: i.opening_stock ?? null,
        p_description: i.description ?? null,
      }),
    delete: (id: string) => call<boolean>('rpc_delete_item', { p_id: id }),
  },

  invoice: {
    getAll: (businessId: string, type?: InvoiceType) =>
      call<Invoice[]>('rpc_get_invoices', { p_business_id: businessId, p_type: type ?? null }),
    getById: (id: string) => call<Invoice[]>('rpc_get_invoice_by_id', { p_id: id }),
    create: (inv: {
      business_id: string;
      invoice_no: string;
      date: string;
      party_name: string;
      state: string;
      address: string;
      net_total: number;
      type: InvoiceType;
      party_id?: string;
      gstin?: string;
      items?: InvoiceItemsEntry[];
      subtotal?: number;
      discount_amount?: number;
      discount_percent?: number;
      total_tax?: number;
      round_off?: number;
      payment_received?: number;
      balance_due?: number;
      status?: InvoiceStatus;
      due_date?: string;
      payment_method?: string;
    }) =>
      call<string>('rpc_create_invoice', {
        p_business_id: inv.business_id,
        p_invoice_no: inv.invoice_no,
        p_date: inv.date,
        p_party_name: inv.party_name,
        p_state: inv.state,
        p_address: inv.address,
        p_net_total: inv.net_total,
        p_type: inv.type,
        p_party_id: inv.party_id ?? null,
        p_gstin: inv.gstin ?? null,
        p_items: inv.items ?? [],
        p_subtotal: inv.subtotal ?? 0,
        p_discount_amount: inv.discount_amount ?? 0,
        p_discount_percent: inv.discount_percent ?? 0,
        p_total_tax: inv.total_tax ?? 0,
        p_round_off: inv.round_off ?? 0,
        p_payment_received: inv.payment_received ?? 0,
        p_balance_due: inv.balance_due ?? 0,
        p_status: inv.status ?? 'draft',
        p_due_date: inv.due_date ?? null,
        p_payment_method: inv.payment_method ?? 'Cash',
      }),
    update: (id: string, inv: Partial<Invoice>) =>
      call<boolean>('rpc_update_invoice', {
        p_id: id,
        p_invoice_no: inv.invoice_no ?? null,
        p_date: inv.date ?? null,
        p_party_name: inv.party_name ?? null,
        p_state: inv.state ?? null,
        p_address: inv.address ?? null,
        p_net_total: inv.net_total ?? null,
        p_party_id: inv.party_id ?? null,
        p_gstin: inv.gstin ?? null,
        p_items: inv.items ?? null,
        p_subtotal: inv.subtotal ?? null,
        p_discount_amount: inv.discount_amount ?? null,
        p_discount_percent: inv.discount_percent ?? null,
        p_total_tax: inv.total_tax ?? null,
        p_round_off: inv.round_off ?? null,
        p_payment_received: inv.payment_received ?? null,
        p_balance_due: inv.balance_due ?? null,
        p_status: inv.status ?? null,
        p_due_date: inv.due_date ?? null,
        p_payment_method: inv.payment_method ?? null,
      }),
    delete: (id: string) => call<boolean>('rpc_delete_invoice', { p_id: id }),
  },

  payment: {
    getAll: (businessId: string) => call<Payment[]>('rpc_get_payments', { p_business_id: businessId }),
    create: (p: Omit<Payment, 'id' | 'created_at'>) =>
      call<string>('rpc_create_payment', {
        p_business_id: p.business_id,
        p_date: p.date,
        p_party_name: p.party_name,
        p_type: p.type,
        p_amount: p.amount,
        p_invoice_no: p.invoice_no ?? null,
        p_mode: p.mode ?? 'Cash',
        p_remarks: p.remarks ?? null,
      }),
    update: (id: string, p: Partial<Payment>) =>
      call<boolean>('rpc_update_payment', {
        p_id: id,
        p_date: p.date ?? null,
        p_party_name: p.party_name ?? null,
        p_type: p.type ?? null,
        p_amount: p.amount ?? null,
        p_invoice_no: p.invoice_no ?? null,
        p_mode: p.mode ?? null,
        p_remarks: p.remarks ?? null,
      }),
    delete: (id: string) => call<boolean>('rpc_delete_payment', { p_id: id }),
  },

  expense: {
    getAll: (businessId: string) => call<Expense[]>('rpc_get_expenses', { p_business_id: businessId }),
    create: (e: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) =>
      call<string>('rpc_create_expense', {
        p_business_id: e.business_id,
        p_category: e.category,
        p_description: e.description,
        p_amount: e.amount,
        p_date: e.date,
        p_receipt_url: e.receipt_url ?? null,
      }),
    update: (id: string, e: Partial<Expense>) =>
      call<boolean>('rpc_update_expense', {
        p_id: id,
        p_category: e.category ?? null,
        p_description: e.description ?? null,
        p_amount: e.amount ?? null,
        p_date: e.date ?? null,
        p_receipt_url: e.receipt_url ?? null,
      }),
    delete: (id: string) => call<boolean>('rpc_delete_expense', { p_id: id }),
  },

  bankAccount: {
    getAll: (businessId: string) => call<BankAccount[]>('rpc_get_bank_accounts', { p_business_id: businessId }),
    create: (a: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>) =>
      call<string>('rpc_create_bank_account', {
        p_business_id: a.business_id,
        p_bank_name: a.bank_name,
        p_account_number: a.account_number,
        p_ifsc_code: a.ifsc_code,
        p_account_type: a.account_type,
        p_branch_name: a.branch_name,
        p_account_holder_name: a.account_holder_name,
        p_opening_balance: a.opening_balance ?? 0,
        p_current_balance: a.current_balance ?? a.opening_balance ?? 0,
      }),
    update: (id: string, a: Partial<BankAccount>) =>
      call<boolean>('rpc_update_bank_account', {
        p_id: id,
        p_bank_name: a.bank_name ?? null,
        p_account_number: a.account_number ?? null,
        p_ifsc_code: a.ifsc_code ?? null,
        p_account_type: a.account_type ?? null,
        p_branch_name: a.branch_name ?? null,
        p_account_holder_name: a.account_holder_name ?? null,
        p_opening_balance: a.opening_balance ?? null,
        p_current_balance: a.current_balance ?? null,
      }),
    delete: (id: string) => call<boolean>('rpc_delete_bank_account', { p_id: id }),
  },

  bankTransaction: {
    getAll: (businessId: string) =>
      call<BankTransaction[]>('rpc_get_bank_transactions', { p_business_id: businessId }),
    create: (t: Omit<BankTransaction, 'id' | 'created_at'>) =>
      call<string>('rpc_create_bank_transaction', {
        p_business_id: t.business_id,
        p_date: t.date,
        p_bank_name: t.bank_name,
        p_account_no: t.account_no,
        p_type: t.type,
        p_amount: t.amount,
        p_purpose: t.purpose,
      }),
    delete: (id: string) => call<boolean>('rpc_delete_bank_transaction', { p_id: id }),
  },

  profile: {
    sync: (fullName?: string) => call<void>('rpc_sync_user_profile', { p_full_name: fullName ?? null }),
  },
};

export default api;
