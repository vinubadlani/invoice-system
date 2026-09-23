/**
 * Domain types matching the REAL Postgres schema (db/extracted_schema.txt on
 * the web repo), not the legacy/dummy shapes in the web app's AppContext.tsx
 * (confirmed unused by any real feature page — do not resurrect those).
 */

export interface Business {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin?: string;
  pan?: string;
  invoice_template?: string;
  terms_conditions?: string;
  created_at?: string;
  user_id?: string;
}

export type PartyType = 'Debtor' | 'Creditor' | 'Expense';
export type BalanceType = 'To Collect' | 'To Pay';

export interface Party {
  id: string;
  business_id: string;
  name: string;
  mobile: string;
  email?: string;
  gstin?: string;
  pan?: string;
  type: PartyType;
  opening_balance: number;
  balance_type: BalanceType;
  address: string;
  city: string;
  state: string;
  pincode: string;
  created_at?: string;
}

export interface Item {
  id: string;
  business_id: string;
  name: string;
  code: string;
  hsn_code?: string;
  gst_percent: number;
  unit: string;
  sales_price: number;
  purchase_price: number;
  opening_stock: number;
  description?: string;
  created_at?: string;
}

/** Canonical shape for a line item inside invoices.items (jsonb). Web app tolerates
 * qty/quantity, rate/price, tax_amount/gst_amount, total/total_amount inconsistently
 * across pages — this app always writes/reads this normalized shape. */
export interface InvoiceLineItem {
  id?: string;
  item_id?: string;
  item_name: string;
  hsn_code?: string;
  quantity: number;
  unit?: string;
  rate: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
}

/** Non-line-item metadata the web app stashes inside invoices.items as sentinel
 * objects (no real columns exist for these — see rpc research notes). */
export interface InvoiceItemsMeta {
  __meta__: true;
  is_gst?: boolean;
  gst_type?: 'cgst_sgst' | 'cgst_igst';
  other_charges?: number;
  other_charges_label?: string;
  invoice_payment_details?: {
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    upi_id?: string;
    qr_code_url?: string;
  };
  selected_bank_account_id?: string;
  invoice_terms?: string;
  invoice_footer?: string;
}

export type InvoiceItemsEntry = InvoiceLineItem | InvoiceItemsMeta;

export type InvoiceType = 'sales' | 'purchase';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  business_id: string;
  invoice_no: string;
  date: string;
  party_name: string;
  party_id?: string;
  gstin?: string;
  state: string;
  address: string;
  items: InvoiceItemsEntry[];
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  total_tax: number;
  round_off: number;
  net_total: number;
  payment_received: number;
  balance_due: number;
  type: InvoiceType;
  status: InvoiceStatus;
  due_date?: string;
  payment_method: string;
  created_at?: string;
  updated_at?: string;
}

export type PaymentDirection = 'Received' | 'Paid';

export interface Payment {
  id: string;
  business_id: string;
  date: string;
  party_name: string;
  type: PaymentDirection;
  invoice_no?: string;
  amount: number;
  mode: string;
  remarks?: string;
  created_at?: string;
}

export type BankAccountType = 'Savings' | 'Current' | 'CC' | 'OD';

export interface BankAccount {
  id: string;
  business_id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: BankAccountType;
  branch_name: string;
  account_holder_name: string;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type BankTxnType = 'Deposit' | 'Withdrawal' | 'Expense';

export interface BankTransaction {
  id: string;
  business_id: string;
  date: string;
  bank_name: string;
  account_no: string;
  type: BankTxnType;
  amount: number;
  purpose: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  business_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  receipt_url?: string;
  created_at?: string;
  updated_at?: string;
}

/** Ledger entry — computed client-side from invoices + payments, never stored. */
export interface LedgerEntry {
  id: string;
  date: string;
  voucher_type: string;
  voucher_no: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
}
