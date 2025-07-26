"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"

interface Party {
  id: string
  name: string
  type: string
  opening_balance: number
  balance_type: string
}

interface LedgerEntry {
  id: string
  date: string
  voucher_type: string
  voucher_no: string
  particulars: string
  debit: number
  credit: number
  balance: number
  party_id: string
}

export default function Ledger() {
  const [parties, setParties] = useState<Party[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [selectedPartyId, setSelectedPartyId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      fetchParties(business.id)
    }
  }, [])

  useEffect(() => {
    if (selectedPartyId && businessId) {
      fetchLedgerEntries(selectedPartyId)
    }
  }, [selectedPartyId, businessId])

  const fetchParties = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("parties")
        .select("id, name, type, opening_balance, balance_type")
        .eq("business_id", businessId)
        .order("name")

      if (error) throw error
      setParties(data || [])
      if (data && data.length > 0) {
        setSelectedPartyId(data[0].id)
      }
    } catch (error) {
      console.error("Error fetching parties:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLedgerEntries = async (partyId: string) => {
    try {
      // Get the party's opening balance
      const party = parties.find(p => p.id === partyId)
      if (!party) return

      const entries: LedgerEntry[] = []
      let runningBalance = party.balance_type === "To Collect" ? party.opening_balance : -party.opening_balance

      // Add opening balance entry
      if (party.opening_balance > 0) {
        entries.push({
          id: "opening",
          date: "2025-01-01",
          voucher_type: "Opening Balance",
          voucher_no: "OB-001",
          particulars: "Opening Balance",
          debit: party.balance_type === "To Collect" ? party.opening_balance : 0,
          credit: party.balance_type === "To Pay" ? party.opening_balance : 0,
          balance: runningBalance,
          party_id: partyId
        })
      }

      // Fetch invoices for this party
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("business_id", businessId)
        .eq("party_id", partyId)
        .order("date")

      if (invoicesError) throw invoicesError

      // Add invoice entries
      invoices?.forEach((invoice) => {
        const isDebit = invoice.type === "sales"
        const amount = invoice.net_total

        if (isDebit) {
          runningBalance += amount
        } else {
          runningBalance -= amount
        }

        entries.push({
          id: invoice.id,
          date: invoice.date,
          voucher_type: invoice.type === "sales" ? "Sales Invoice" : "Purchase Invoice",
          voucher_no: invoice.invoice_no,
          particulars: `${invoice.type === "sales" ? "Sales to" : "Purchase from"} ${invoice.party_name}`,
          debit: isDebit ? amount : 0,
          credit: isDebit ? 0 : amount,
          balance: runningBalance,
          party_id: partyId
        })
      })

      // Fetch payments for this party
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("business_id", businessId)
        .eq("party_id", partyId)
        .order("date")

      if (paymentsError) throw paymentsError

      // Add payment entries
      payments?.forEach((payment) => {
        const isCredit = payment.type === "Received"
        const amount = payment.amount

        if (isCredit) {
          runningBalance -= amount
        } else {
          runningBalance += amount
        }

        entries.push({
          id: payment.id,
          date: payment.date,
          voucher_type: payment.type === "Received" ? "Payment Received" : "Payment Made",
          voucher_no: payment.reference_no || `PAY-${payment.id.slice(-4)}`,
          particulars: payment.remarks || `Payment ${payment.type.toLowerCase()}`,
          debit: isCredit ? 0 : amount,
          credit: isCredit ? amount : 0,
          balance: runningBalance,
          party_id: partyId
        })
      })

      // Sort all entries by date
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Recalculate running balance
      let balance = party.balance_type === "To Collect" ? party.opening_balance : -party.opening_balance
      entries.forEach((entry, index) => {
        if (index === 0 && entry.voucher_type === "Opening Balance") {
          entry.balance = balance
        } else {
          balance += entry.debit - entry.credit
          entry.balance = balance
        }
      })

      setLedgerEntries(entries)
    } catch (error) {
      console.error("Error fetching ledger entries:", error)
    }
  }

  const selectedParty = parties.find(p => p.id === selectedPartyId)
  const totalDebits = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0)
  const totalCredits = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0)
  const currentBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>

        {/* Party Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Party</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a party" />
                  </SelectTrigger>
                  <SelectContent>
                    {parties.map((party) => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.name} ({party.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Table */}
        {selectedParty && (
          <Card>
            <CardHeader>
              <CardTitle>Ledger for {selectedParty.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Voucher Type</TableHead>
                      <TableHead>Voucher No</TableHead>
                      <TableHead>Particulars</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              entry.voucher_type === "Opening Balance"
                                ? "bg-gray-100 text-gray-800"
                                : entry.voucher_type === "Sales Invoice"
                                  ? "bg-blue-100 text-blue-800"
                                  : entry.voucher_type === "Payment Received"
                                    ? "bg-green-100 text-green-800"
                                    : entry.voucher_type === "Payment Made"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {entry.voucher_type}
                          </span>
                        </TableCell>
                        <TableCell>{entry.voucher_no}</TableCell>
                        <TableCell>{entry.particulars}</TableCell>
                        <TableCell>
                          {entry.debit > 0 && (
                            <span className="text-red-600 font-medium">₹{entry.debit.toLocaleString()}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.credit > 0 && (
                            <span className="text-green-600 font-medium">₹{entry.credit.toLocaleString()}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${entry.balance > 0 ? "text-blue-600" : "text-red-600"}`}>
                            ₹{Math.abs(entry.balance).toLocaleString()}
                            {entry.balance > 0 ? " Dr" : " Cr"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {selectedParty && (
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800">Total Debits</h3>
                  <p className="text-2xl font-bold text-blue-900">
                    ₹{totalDebits.toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-800">Total Credits</h3>
                  <p className="text-2xl font-bold text-green-900">
                    ₹{totalCredits.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-800">Current Balance</h3>
                  <p className={`text-2xl font-bold ${currentBalance > 0 ? "text-blue-900" : "text-red-900"}`}>
                    ₹{Math.abs(currentBalance).toLocaleString()} {currentBalance > 0 ? "Dr" : "Cr"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
