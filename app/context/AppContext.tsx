"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

// Types
export interface Party {
  id: string
  name: string
  mobile: string
  email: string
  gstin: string
  pan: string
  type: "Debtor" | "Creditor" | "Expense"
  openingBalance: number
  balanceType: "To Collect" | "To Pay"
  state: string
  address: string
}

export interface Item {
  id: string
  name: string
  code: string
  hsnCode: string
  gstPercent: number
  unit: string
  salesPrice: number
  purchasePrice: number
  openingStock: number
  description: string
}

export interface InvoiceItem {
  id: string
  itemName: string
  hsn: string
  qty: number
  rate: number
  gstPercent: number
  taxAmount: number
  total: number
}

export interface Invoice {
  id: string
  invoiceNo: string
  date: string
  partyName: string
  gstin: string
  state: string
  address: string
  items: InvoiceItem[]
  totalTax: number
  roundOff: number
  netTotal: number
  paymentReceived: number
  balanceDue: number
  type: "sales" | "purchase"
}

export interface Payment {
  id: string
  date: string
  partyName: string
  type: "Received" | "Paid"
  invoiceNo: string
  amount: number
  mode: string
  remarks: string
}

export interface LedgerEntry {
  id: string
  date: string
  voucherType: string
  voucherNo: string
  particulars: string
  debit: number
  credit: number
  balance: number
}

export interface BankTransaction {
  id: string
  date: string
  bankName: string
  accountNo: string
  type: "Deposit" | "Withdrawal" | "Expense"
  amount: number
  purpose: string
}

interface AppContextType {
  parties: Party[]
  items: Item[]
  invoices: Invoice[]
  payments: Payment[]
  ledgerEntries: LedgerEntry[]
  bankTransactions: BankTransaction[]
  addParty: (party: Omit<Party, "id">) => void
  updateParty: (id: string, party: Partial<Party>) => void
  deleteParty: (id: string) => void
  addItem: (item: Omit<Item, "id">) => void
  updateItem: (id: string, item: Partial<Item>) => void
  deleteItem: (id: string) => void
  addInvoice: (invoice: Omit<Invoice, "id">) => void
  addPayment: (payment: Omit<Payment, "id">) => void
  addBankTransaction: (transaction: Omit<BankTransaction, "id">) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Dummy Data
const initialParties: Party[] = [
  {
    id: "1",
    name: "Shree Enterprises",
    mobile: "9876543210",
    email: "shree@example.com",
    gstin: "27ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    type: "Debtor",
    openingBalance: 15000,
    balanceType: "To Collect",
    state: "Maharashtra",
    address: "123 Business Street, Mumbai, Maharashtra - 400001",
  },
  {
    id: "2",
    name: "Global Suppliers Ltd",
    mobile: "9876543211",
    email: "global@example.com",
    gstin: "27FGHIJ5678K2L6",
    pan: "FGHIJ5678K",
    type: "Creditor",
    openingBalance: 8500,
    balanceType: "To Pay",
    state: "Gujarat",
    address: "456 Supply Chain Road, Ahmedabad, Gujarat - 380001",
  },
]

const initialItems: Item[] = [
  {
    id: "1",
    name: "Herbal Tea Blend",
    code: "HTB001",
    hsnCode: "0902",
    gstPercent: 5,
    unit: "Kg",
    salesPrice: 450,
    purchasePrice: 300,
    openingStock: 100,
    description: "Premium herbal tea blend with natural ingredients",
  },
  {
    id: "2",
    name: "Ayurvedic Capsules",
    code: "AYC002",
    hsnCode: "3004",
    gstPercent: 12,
    unit: "Bottle",
    salesPrice: 280,
    purchasePrice: 180,
    openingStock: 50,
    description: "Natural ayurvedic health capsules",
  },
]

const initialInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNo: "INV-001",
    date: "2025-01-15",
    partyName: "Shree Enterprises",
    gstin: "27ABCDE1234F1Z5",
    state: "Maharashtra",
    address: "123 Business Street, Mumbai, Maharashtra - 400001",
    items: [
      {
        id: "1",
        itemName: "Herbal Tea Blend",
        hsn: "0902",
        qty: 10,
        rate: 450,
        gstPercent: 5,
        taxAmount: 225,
        total: 4725,
      },
    ],
    totalTax: 225,
    roundOff: 0,
    netTotal: 4725,
    paymentReceived: 2000,
    balanceDue: 2725,
    type: "sales",
  },
]

export function AppProvider({ children }: { children: ReactNode }) {
  const [parties, setParties] = useState<Party[]>(initialParties)
  const [items, setItems] = useState<Item[]>(initialItems)
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [payments, setPayments] = useState<Payment[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([
    {
      id: "1",
      date: "2025-01-01",
      voucherType: "Opening Balance",
      voucherNo: "OB-001",
      particulars: "Opening Balance",
      debit: 15000,
      credit: 0,
      balance: 15000,
    },
    {
      id: "2",
      date: "2025-01-15",
      voucherType: "Sales",
      voucherNo: "INV-001",
      particulars: "Sales Invoice",
      debit: 4725,
      credit: 0,
      balance: 19725,
    },
    {
      id: "3",
      date: "2025-01-16",
      voucherType: "Receipt",
      voucherNo: "RCP-001",
      particulars: "Payment Received",
      debit: 0,
      credit: 2000,
      balance: 17725,
    },
  ])
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([
    {
      id: "1",
      date: "2025-01-16",
      bankName: "State Bank of India",
      accountNo: "1234567890",
      type: "Deposit",
      amount: 2000,
      purpose: "Payment from Shree Enterprises",
    },
    {
      id: "2",
      date: "2025-01-17",
      bankName: "State Bank of India",
      accountNo: "1234567890",
      type: "Expense",
      amount: 500,
      purpose: "Office supplies",
    },
  ])

  const addParty = (party: Omit<Party, "id">) => {
    const newParty = { ...party, id: Date.now().toString() }
    setParties((prev) => [...prev, newParty])
  }

  const updateParty = (id: string, updatedParty: Partial<Party>) => {
    setParties((prev) => prev.map((party) => (party.id === id ? { ...party, ...updatedParty } : party)))
  }

  const deleteParty = (id: string) => {
    setParties((prev) => prev.filter((party) => party.id !== id))
  }

  const addItem = (item: Omit<Item, "id">) => {
    const newItem = { ...item, id: Date.now().toString() }
    setItems((prev) => [...prev, newItem])
  }

  const updateItem = (id: string, updatedItem: Partial<Item>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updatedItem } : item)))
  }

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const addInvoice = (invoice: Omit<Invoice, "id">) => {
    const newInvoice = { ...invoice, id: Date.now().toString() }
    setInvoices((prev) => [...prev, newInvoice])
  }

  const addPayment = (payment: Omit<Payment, "id">) => {
    const newPayment = { ...payment, id: Date.now().toString() }
    setPayments((prev) => [...prev, newPayment])
  }

  const addBankTransaction = (transaction: Omit<BankTransaction, "id">) => {
    const newTransaction = { ...transaction, id: Date.now().toString() }
    setBankTransactions((prev) => [...prev, newTransaction])
  }

  return (
    <AppContext.Provider
      value={{
        parties,
        items,
        invoices,
        payments,
        ledgerEntries,
        bankTransactions,
        addParty,
        updateParty,
        deleteParty,
        addItem,
        updateItem,
        deleteItem,
        addInvoice,
        addPayment,
        addBankTransaction,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
