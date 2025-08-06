"use client"

import { useState, useEffect } from "react"
import { fetchParties, fetchInvoices, queryBuilder, getCurrentUser } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Download, Search, Filter, FileText } from "lucide-react"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"

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
}

export default function Ledger() {
  const [parties, setParties] = useState<Party[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [selectedPartyId, setSelectedPartyId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")

  const { toast } = useToast()

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadParties(business.id)
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPartyId && businessId) {
      loadLedgerEntries(selectedPartyId)
    }
  }, [selectedPartyId, businessId, dateFrom, dateTo])

  const loadParties = async (businessId: string) => {
    try {
      const user = await getCurrentUser()
      const partiesData = await fetchParties(businessId, undefined, user?.id)
      setParties((partiesData as unknown as Party[]) || [])
      if (partiesData && partiesData.length > 0) {
        setSelectedPartyId((partiesData[0] as unknown as Party).id)
      }
    } catch (error) {
      console.error("Error fetching parties:", error)
      toast({
        title: "Error",
        description: "Failed to load parties",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadLedgerEntries = async (partyId: string) => {
    try {
      setLoading(true)
      const party = parties.find(p => p.id === partyId)
      if (!party) return

      const user = await getCurrentUser()
      const entries: LedgerEntry[] = []
      let runningBalance = party.balance_type === "To Collect" ? party.opening_balance : -party.opening_balance

      // Add opening balance entry if exists
      if (party.opening_balance > 0) {
        entries.push({
          id: "opening",
          date: "2025-01-01",
          voucher_type: "Opening Balance",
          voucher_no: "OB-001",
          particulars: "Opening Balance",
          debit: party.balance_type === "To Collect" ? party.opening_balance : 0,
          credit: party.balance_type === "To Pay" ? party.opening_balance : 0,
          balance: runningBalance
        })
      }

      // Fetch invoices for this party
      const invoicesData = await fetchInvoices(businessId, undefined, 1000, user?.id)
      const partyInvoices = invoicesData.filter((invoice: any) => 
        invoice.party_name === party.name || invoice.party_id === partyId
      )

      // Fetch payments for this party
      const paymentsData = await queryBuilder(
        'payments',
        '*',
        { 
          business_id: businessId,
          party_name: party.name
        },
        { orderBy: 'date', ascending: true }
      )

      // Combine and sort all transactions by date
      const allTransactions: any[] = [
        ...partyInvoices.map((inv: any) => ({ ...inv, transaction_type: 'invoice' })),
        ...(Array.isArray(paymentsData) ? paymentsData.map((pay: any) => ({ ...pay, transaction_type: 'payment' })) : [])
      ]

      // Filter by date range if specified
      const filteredTransactions = allTransactions.filter((transaction: any) => {
        const transactionDate = new Date(transaction.date)
        const fromDate = dateFrom ? new Date(dateFrom) : new Date('1900-01-01')
        const toDate = dateTo ? new Date(dateTo) : new Date('2100-12-31')
        return transactionDate >= fromDate && transactionDate <= toDate
      })

      // Sort by date
      filteredTransactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Process transactions and calculate running balance
      filteredTransactions.forEach((transaction: any) => {
        if (transaction.transaction_type === 'invoice') {
          const isDebit = transaction.type === "sales"
          const amount = transaction.net_total || transaction.total_amount || 0

          if (isDebit) {
            runningBalance += amount
          } else {
            runningBalance -= amount
          }

          entries.push({
            id: transaction.id,
            date: transaction.date,
            voucher_type: transaction.type === "sales" ? "Sales Invoice" : "Purchase Invoice",
            voucher_no: transaction.invoice_no || transaction.invoice_number || 'N/A',
            particulars: `${transaction.type === "sales" ? "Sales to" : "Purchase from"} ${party.name}`,
            debit: isDebit ? amount : 0,
            credit: isDebit ? 0 : amount,
            balance: runningBalance
          })
        } else if (transaction.transaction_type === 'payment') {
          const isCredit = transaction.type === "Received"
          const amount = transaction.amount || 0

          if (isCredit) {
            runningBalance -= amount
          } else {
            runningBalance += amount
          }

          entries.push({
            id: transaction.id,
            date: transaction.date,
            voucher_type: transaction.type === "Received" ? "Payment Received" : "Payment Made",
            voucher_no: transaction.invoice_no || `PAY-${transaction.id.slice(-4)}`,
            particulars: transaction.remarks || `Payment ${transaction.type.toLowerCase()} - ${transaction.mode}`,
            debit: !isCredit ? amount : 0,
            credit: isCredit ? amount : 0,
            balance: runningBalance
          })
        }
      })

      setLedgerEntries(entries)
    } catch (error) {
      console.error("Error fetching ledger entries:", error)
      toast({
        title: "Error",
        description: "Failed to load ledger entries",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedParty = parties.find(p => p.id === selectedPartyId)
  const totalDebits = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0)
  const totalCredits = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0)
  const currentBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0

  // Filter entries based on search term
  const filteredEntries = ledgerEntries.filter(entry =>
    entry.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.voucher_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.voucher_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const exportLedger = () => {
    if (!selectedParty) return
    
    const csvContent = [
      ['Date', 'Voucher Type', 'Voucher No', 'Particulars', 'Debit', 'Credit', 'Balance'],
      ...filteredEntries.map(entry => [
        new Date(entry.date).toLocaleDateString('en-IN'),
        entry.voucher_type,
        entry.voucher_no,
        entry.particulars,
        entry.debit || 0,
        entry.credit || 0,
        entry.balance
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-${selectedParty.name}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Party Ledger</h1>
              <p className="text-slate-600 dark:text-slate-400">View detailed transaction history for parties</p>
            </div>
            {selectedParty && (
              <Button onClick={exportLedger} className="bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Export Ledger
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Party Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Select Party</label>
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
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">To Date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Summary */}
          {selectedParty && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-700">Total Debits</CardTitle>
                  <FileText className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800">₹{totalDebits.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-green-700">Total Credits</CardTitle>
                  <FileText className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-800">₹{totalCredits.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${currentBalance >= 0 ? 'from-indigo-50 to-indigo-100' : 'from-red-50 to-red-100'} border-0 shadow-lg`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={`text-sm font-semibold ${currentBalance >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                    Current Balance
                  </CardTitle>
                  <FileText className={`h-4 w-4 ${currentBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-indigo-800' : 'text-red-800'}`}>
                    ₹{Math.abs(currentBalance).toLocaleString()} {currentBalance >= 0 ? 'Dr' : 'Cr'}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-purple-700">Opening Balance</CardTitle>
                  <FileText className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-800">
                    ₹{selectedParty.opening_balance.toLocaleString()} {selectedParty.balance_type === "To Collect" ? 'Dr' : 'Cr'}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ledger Table */}
          {selectedParty && (
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Ledger for {selectedParty.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredEntries.length > 0 ? (
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
                        {filteredEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{new Date(entry.date).toLocaleDateString('en-IN')}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  entry.voucher_type === "Opening Balance"
                                    ? "bg-gray-100 text-gray-800"
                                    : entry.voucher_type === "Sales Invoice"
                                      ? "bg-blue-100 text-blue-800"
                                      : entry.voucher_type === "Payment Received"
                                        ? "bg-green-100 text-green-800"
                                        : entry.voucher_type === "Payment Made"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-purple-100 text-purple-800"
                                }
                              >
                                {entry.voucher_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">{entry.voucher_no}</TableCell>
                            <TableCell className="max-w-md truncate">{entry.particulars}</TableCell>
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
                              <span className={`font-medium ${entry.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                                ₹{Math.abs(entry.balance).toLocaleString()}
                                {entry.balance >= 0 ? " Dr" : " Cr"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Found</h3>
                    <p className="text-gray-500">No transactions found for the selected criteria</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedParty && !loading && (
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Party Selected</h3>
                <p className="text-gray-500">Select a party to view their ledger</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
