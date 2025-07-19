"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Save, X, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import DataTable from "@/components/DataTable"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"

interface BankAccount {
  id: string
  business_id: string
  bank_name: string
  account_number: string
  ifsc_code: string
  account_type: "Savings" | "Current" | "CC" | "OD"
  branch_name: string
  account_holder_name: string
  opening_balance: number
  current_balance: number
  is_active: boolean
  created_at: string
}

export default function BankPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    account_type: "Savings" as "Savings" | "Current" | "CC" | "OD",
    branch_name: "",
    account_holder_name: "",
    opening_balance: 0,
    is_active: true,
  })

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadBankAccounts(business.id)
    }
  }, [])

  const loadBankAccounts = useCallback(async (businessId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })

      if (error) {
        // Handle table not found error gracefully
        if (error.code === 'PGRST116' || error.message.includes('relation "public.bank_accounts" does not exist')) {
          console.warn("Bank accounts table not found. Please create the table first.")
          toast({
            title: "Database Setup Required",
            description: "Bank accounts table not found. Please run the database setup script.",
            variant: "destructive",
          })
          setBankAccounts([])
          return
        }
        throw error
      }
      setBankAccounts(data || [])
    } catch (error) {
      console.error("Error loading bank accounts:", error)
      toast({
        title: "Error",
        description: "Failed to load bank accounts. Please check your database setup.",
        variant: "destructive",
      })
      setBankAccounts([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) return

    try {
      if (editingAccount) {
        const { error } = await supabase
          .from("bank_accounts")
          .update({
            ...formData,
            current_balance: formData.opening_balance, // Update current balance when editing
          })
          .eq("id", editingAccount.id)

        if (error) throw error

        setBankAccounts(bankAccounts.map((account) => 
          account.id === editingAccount.id 
            ? { ...account, ...formData, current_balance: formData.opening_balance }
            : account
        ))
        
        toast({
          title: "Success",
          description: "Bank account updated successfully",
        })
        setEditingAccount(null)
      } else {
        const { data, error } = await supabase
          .from("bank_accounts")
          .insert([{ 
            ...formData, 
            business_id: businessId,
            current_balance: formData.opening_balance,
          }])
          .select()
          .single()

        if (error) throw error
        setBankAccounts([data, ...bankAccounts])
        
        toast({
          title: "Success",
          description: "Bank account added successfully",
        })
      }
      resetForm()
    } catch (error) {
      console.error("Error saving bank account:", error)
      toast({
        title: "Error",
        description: "Failed to save bank account",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      bank_name: "",
      account_number: "",
      ifsc_code: "",
      account_type: "Savings",
      branch_name: "",
      account_holder_name: "",
      opening_balance: 0,
      is_active: true,
    })
    setIsFormOpen(false)
    setEditingAccount(null)
  }

  const handleEdit = (account: BankAccount) => {
    setFormData({
      bank_name: account.bank_name,
      account_number: account.account_number,
      ifsc_code: account.ifsc_code,
      account_type: account.account_type,
      branch_name: account.branch_name,
      account_holder_name: account.account_holder_name,
      opening_balance: account.opening_balance,
      is_active: account.is_active,
    })
    setEditingAccount(account)
    setIsFormOpen(true)
  }

  const columns = useMemo(
    () => [
      { key: "bank_name", label: "Bank Name" },
      { key: "account_number", label: "Account Number" },
      { key: "account_type", label: "Type" },
      { key: "branch_name", label: "Branch" },
      { key: "account_holder_name", label: "Account Holder" },
      {
        key: "current_balance",
        label: "Current Balance",
        render: (value: number) => `₹${(value || 0).toLocaleString()}`,
      },
      {
        key: "is_active",
        label: "Status",
        render: (value: boolean) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {value ? "Active" : "Inactive"}
          </span>
        ),
      },
    ],
    []
  )

  const actions = (account: BankAccount) => (
    <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
      <Edit className="h-4 w-4" />
    </Button>
  )

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bank Account
          </Button>
        </div>

        {/* Form */}
        {isFormOpen && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAccount ? "Edit Bank Account" : "Add New Bank Account"}
              </h2>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name *</Label>
                <Input
                  id="bank_name"
                  required
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="e.g. State Bank of India"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  required
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Enter account number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code *</Label>
                <Input
                  id="ifsc_code"
                  required
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SBIN0001234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_type">Account Type *</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value: "Savings" | "Current" | "CC" | "OD") => 
                    setFormData({ ...formData, account_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Savings">Savings</SelectItem>
                    <SelectItem value="Current">Current</SelectItem>
                    <SelectItem value="CC">Credit Card</SelectItem>
                    <SelectItem value="OD">Overdraft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_name">Branch Name *</Label>
                <Input
                  id="branch_name"
                  required
                  value={formData.branch_name}
                  onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  placeholder="Enter branch name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                <Input
                  id="account_holder_name"
                  required
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  placeholder="Enter account holder name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_balance">Opening Balance</Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">Status</Label>
                <Select
                  value={formData.is_active ? "active" : "inactive"}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingAccount ? "Update" : "Save"} Account
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Bank Accounts Table */}
        <DataTable
          data={bankAccounts}
          columns={columns}
          title="All Bank Accounts"
          searchKeys={["bank_name", "account_number", "branch_name", "account_holder_name"]}
          actions={actions}
        />
      </div>
    </AuthenticatedLayout>
  )
}
