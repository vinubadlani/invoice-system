"use client"

import { useState, useEffect } from "react"
import { supabase, getSupabaseClient } from "@/lib/supabase"
import { Plus, Save, X, CreditCard, TrendingUp, TrendingDown, Building2, Trash2, Edit } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"

interface BankAccount {
  id: string
  business_id: string
  bank_name: string
  account_number: string
  account_type: "Savings" | "Current" | "Fixed Deposit" | "Credit Card"
  ifsc_code: string
  branch: string
  opening_balance: number
  current_balance: number
  created_at: string
}

interface BankTransaction {
  id: string
  business_id: string
  account_id: string
  date: string
  type: "Credit" | "Debit"
  amount: number
  description: string
  reference_number?: string
  balance_after: number
  created_at: string
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [businessId, setBusinessId] = useState<string>("")
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false)
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [accountFormData, setAccountFormData] = useState({
    bank_name: "",
    account_number: "",
    account_type: "Savings" as "Savings" | "Current" | "Fixed Deposit" | "Credit Card",
    ifsc_code: "",
    branch: "",
    opening_balance: 0,
  })

  const [transactionFormData, setTransactionFormData] = useState({
    account_id: "",
    date: new Date().toISOString().split("T")[0],
    type: "Credit" as "Credit" | "Debit",
    amount: 0,
    description: "",
    reference_number: "",
  })

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadData(business.id)
    } else {
      setLoading(false)
    }
  }, [])

  const loadData = async (businessId: string) => {
    try {
      setLoading(true)
      
      // Load bank accounts
      const client = getSupabaseClient()
      if (!client) {
        toast({
          title: "Error",
          description: "Service temporarily unavailable. Please try again later.",
          variant: "destructive",
        })
        return
      }
      
      const { data: accountsData, error: accountsError } = await client
        .from("bank_accounts")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })

      if (accountsError) throw accountsError
      setAccounts((accountsData as unknown as BankAccount[]) || [])

      // Load bank transactions
      const { data: transactionsData, error: transactionsError } = await client
        .from("bank_transactions")
        .select(`
          *,
          bank_accounts!inner(bank_name, account_number)
        `)
        .eq("business_id", businessId)
        .order("date", { ascending: false })

      if (transactionsError) throw transactionsError
      setTransactions((transactionsData as unknown as BankTransaction[]) || [])

    } catch (error) {
      console.error("Error loading bank data:", error)
      toast({
        title: "Error",
        description: "Failed to load bank data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const client = getSupabaseClient()
      if (!client) {
        toast({
          title: "Error",
          description: "Service temporarily unavailable. Please try again later.",
          variant: "destructive",
        })
        return
      }
      
      const { data, error } = await client
        .from("bank_accounts")
        .insert([
          {
            ...accountFormData,
            business_id: businessId,
            current_balance: accountFormData.opening_balance,
          }
        ])
        .select()
        .single()

      if (error) throw error

      setAccounts([data as unknown as BankAccount, ...accounts])
      resetAccountForm()
      toast({
        title: "Success",
        description: "Bank account added successfully"
      })

    } catch (error) {
      console.error("Error adding account:", error)
      toast({
        title: "Error",
        description: "Failed to add bank account",
        variant: "destructive"
      })
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const account = accounts.find(acc => acc.id === transactionFormData.account_id)
      if (!account) return

      const newBalance = transactionFormData.type === "Credit" 
        ? account.current_balance + transactionFormData.amount
        : account.current_balance - transactionFormData.amount

      // Add transaction
      const client = getSupabaseClient()
      if (!client) {
        toast({
          title: "Error",
          description: "Service temporarily unavailable. Please try again later.",
          variant: "destructive",
        })
        return
      }
      
      const { data: transactionData, error: transactionError } = await client
        .from("bank_transactions")
        .insert([
          {
            ...transactionFormData,
            business_id: businessId,
            balance_after: newBalance,
          }
        ])
        .select()
        .single()

      if (transactionError) throw transactionError

      // Update account balance
      const { error: updateError } = await client
        .from("bank_accounts")
        .update({ current_balance: newBalance })
        .eq("id", transactionFormData.account_id)

      if (updateError) throw updateError

      // Refresh data
      await loadData(businessId)
      resetTransactionForm()
      toast({
        title: "Success",
        description: "Transaction added successfully"
      })

    } catch (error) {
      console.error("Error adding transaction:", error)
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive"
      })
    }
  }

  const resetAccountForm = () => {
    setAccountFormData({
      bank_name: "",
      account_number: "",
      account_type: "Savings",
      ifsc_code: "",
      branch: "",
      opening_balance: 0,
    })
    setIsAccountFormOpen(false)
  }

  const resetTransactionForm = () => {
    setTransactionFormData({
      account_id: "",
      date: new Date().toISOString().split("T")[0],
      type: "Credit",
      amount: 0,
      description: "",
      reference_number: "",
    })
    setIsTransactionFormOpen(false)
  }

  const totalBalance = accounts.reduce((sum, account) => sum + account.current_balance, 0)
  const totalCredits = transactions
    .filter(t => t.type === "Credit")
    .reduce((sum, t) => sum + t.amount, 0)
  const totalDebits = transactions
    .filter(t => t.type === "Debit")
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        {/* Modern Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 rounded-2xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-purple-600/20 backdrop-blur-sm"></div>
          <div className="relative p-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Bank Accounts
                </h1>
                <p className="text-blue-100 text-lg opacity-90">
                  Manage your business banking and transactions
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-emerald-700">Total Balance</CardTitle>
              <div className="p-2 bg-emerald-500 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className={`text-3xl font-bold mb-1 ${totalBalance >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                ₹{Math.abs(totalBalance).toLocaleString()}
              </div>
              <p className="text-emerald-600 text-sm font-medium">
                {accounts.length} account{accounts.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-700">Total Credits</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-800 mb-1">
                ₹{totalCredits.toLocaleString()}
              </div>
              <p className="text-blue-600 text-sm font-medium">
                Money received
              </p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/10"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-red-700">Total Debits</CardTitle>
              <div className="p-2 bg-red-500 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-red-800 mb-1">
                ₹{totalDebits.toLocaleString()}
              </div>
              <p className="text-red-600 text-sm font-medium">
                Money spent
              </p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/10"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-700">Net Cash Flow</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className={`text-3xl font-bold mb-1 ${(totalCredits - totalDebits) >= 0 ? 'text-purple-800' : 'text-red-700'}`}>
                ₹{Math.abs(totalCredits - totalDebits).toLocaleString()}
              </div>
              <p className="text-purple-600 text-sm font-medium">
                {(totalCredits - totalDebits) >= 0 ? 'Positive' : 'Negative'} flow
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Dialog open={isAccountFormOpen} onOpenChange={setIsAccountFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800">Add Bank Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAccount} className="space-y-4">
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    required
                    value={accountFormData.bank_name}
                    onChange={(e) => setAccountFormData({...accountFormData, bank_name: e.target.value})}
                    placeholder="State Bank of India"
                  />
                </div>
                <div>
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    required
                    value={accountFormData.account_number}
                    onChange={(e) => setAccountFormData({...accountFormData, account_number: e.target.value})}
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="account_type">Account Type</Label>
                  <Select
                    value={accountFormData.account_type}
                    onValueChange={(value: "Savings" | "Current" | "Fixed Deposit" | "Credit Card") => 
                      setAccountFormData({...accountFormData, account_type: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Current">Current</SelectItem>
                      <SelectItem value="Fixed Deposit">Fixed Deposit</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ifsc_code">IFSC Code</Label>
                  <Input
                    id="ifsc_code"
                    required
                    value={accountFormData.ifsc_code}
                    onChange={(e) => setAccountFormData({...accountFormData, ifsc_code: e.target.value})}
                    placeholder="SBIN0001234"
                  />
                </div>
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    required
                    value={accountFormData.branch}
                    onChange={(e) => setAccountFormData({...accountFormData, branch: e.target.value})}
                    placeholder="Main Branch"
                  />
                </div>
                <div>
                  <Label htmlFor="opening_balance">Opening Balance</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    step="0.01"
                    value={accountFormData.opening_balance}
                    onChange={(e) => setAccountFormData({...accountFormData, opening_balance: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetAccountForm}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save Account
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTransactionFormOpen} onOpenChange={setIsTransactionFormOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={accounts.length === 0} className="border-blue-200 hover:bg-blue-50">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800">Add Bank Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div>
                  <Label htmlFor="account_id">Bank Account</Label>
                  <Select
                    value={transactionFormData.account_id}
                    onValueChange={(value) => setTransactionFormData({...transactionFormData, account_id: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={transactionFormData.date}
                    onChange={(e) => setTransactionFormData({...transactionFormData, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select
                    value={transactionFormData.type}
                    onValueChange={(value: "Credit" | "Debit") => 
                      setTransactionFormData({...transactionFormData, type: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit">Credit (Money In)</SelectItem>
                      <SelectItem value="Debit">Debit (Money Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    required
                    value={transactionFormData.amount}
                    onChange={(e) => setTransactionFormData({...transactionFormData, amount: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    required
                    value={transactionFormData.description}
                    onChange={(e) => setTransactionFormData({...transactionFormData, description: e.target.value})}
                    placeholder="Transaction description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="reference_number">Reference Number (Optional)</Label>
                  <Input
                    id="reference_number"
                    value={transactionFormData.reference_number}
                    onChange={(e) => setTransactionFormData({...transactionFormData, reference_number: e.target.value})}
                    placeholder="TXN123456"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetTransactionForm}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save Transaction
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bank Accounts List */}
        {accounts.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <CardTitle className="text-xl font-bold text-slate-800">Bank Accounts</CardTitle>
              <p className="text-slate-600 text-sm">Manage your business bank accounts</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4">
                {accounts.map((account) => (
                  <div key={account.id} className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-800">{account.bank_name}</h3>
                        <p className="text-slate-600">Account: {account.account_number}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>IFSC: {account.ifsc_code}</span>
                          <span>Branch: {account.branch}</span>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {account.account_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${account.current_balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ₹{Math.abs(account.current_balance).toLocaleString()}
                        </div>
                        <p className="text-sm text-slate-500">Current Balance</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        {transactions.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <CardTitle className="text-xl font-bold text-blue-900">Transaction History</CardTitle>
              <p className="text-blue-600 text-sm">Recent banking transactions</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-4 font-semibold text-slate-700">Date</th>
                      <th className="text-left p-4 font-semibold text-slate-700">Account</th>
                      <th className="text-left p-4 font-semibold text-slate-700">Type</th>
                      <th className="text-left p-4 font-semibold text-slate-700">Amount</th>
                      <th className="text-left p-4 font-semibold text-slate-700">Description</th>
                      <th className="text-left p-4 font-semibold text-slate-700">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-600">
                          {new Date(transaction.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="p-4 text-slate-800">
                          {accounts.find(acc => acc.id === transaction.account_id)?.bank_name}
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant={transaction.type === 'Credit' ? 'default' : 'secondary'}
                            className={transaction.type === 'Credit' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}
                          >
                            {transaction.type}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className={`font-semibold ${transaction.type === 'Credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {transaction.type === 'Credit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 max-w-xs truncate">
                          {transaction.description}
                        </td>
                        <td className="p-4">
                          <span className={`font-semibold ${transaction.balance_after >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ₹{Math.abs(transaction.balance_after).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {accounts.length === 0 && (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No Bank Accounts</h3>
              <p className="text-slate-500 mb-6">Add your first bank account to start tracking transactions</p>
              <Button 
                onClick={() => setIsAccountFormOpen(true)}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
