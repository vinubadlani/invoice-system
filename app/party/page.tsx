"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase, optimizedQuery } from "@/lib/supabase"
import { useOptimizedData } from "@/lib/cache-store"
import { Plus, Edit, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import DataTable from "@/components/DataTable"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"

interface Party {
  id: string
  business_id: string
  name: string
  mobile: string
  email: string
  gstin: string
  pan: string
  type: "Debtor" | "Creditor" | "Expense"
  opening_balance: number
  balance_type: "To Collect" | "To Pay"
  address: string
  city: string
  state: string
  pincode: string
  created_at: string
}

export default function PartyPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")

  // Use optimized data fetching
  const { fetchParties, clearCache } = useOptimizedData()

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadParties(business.id)
    }
  }, [])

  const loadParties = useCallback(async (businessId: string) => {
    try {
      setLoading(true)
      // Use cached data - much faster!
      const data = await fetchParties(businessId)
      setParties(data)
    } catch (error) {
      console.error("Error loading parties:", error)
    } finally {
      setLoading(false)
    }
  }, [fetchParties])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    gstin: "",
    pan: "",
    type: "Debtor" as "Debtor" | "Creditor" | "Expense",
    opening_balance: 0,
    balance_type: "To Collect" as "To Collect" | "To Pay",
    address: "",
    city: "",
    state: "",
    pincode: "",
  })

  // Auto-update balance_type based on party type
  useEffect(() => {
    if (formData.type === "Debtor") {
      setFormData((prev) => ({ ...prev, balance_type: "To Collect" }))
    } else if (formData.type === "Creditor") {
      setFormData((prev) => ({ ...prev, balance_type: "To Pay" }))
    } else if (formData.type === "Expense") {
      setFormData((prev) => ({ ...prev, balance_type: "To Pay" }))
    }
  }, [formData.type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) return

    try {
      if (editingParty) {
        const { error } = await supabase.from("parties").update(formData).eq("id", editingParty.id)

        if (error) throw error

        setParties(parties.map((party) => (party.id === editingParty.id ? { ...party, ...formData } : party)))
        setEditingParty(null)
      } else {
        const { data, error } = await supabase
          .from("parties")
          .insert([{ ...formData, business_id: businessId }])
          .select()
          .single()

        if (error) throw error
        setParties([data, ...parties])
      }
      resetForm()
    } catch (error) {
      console.error("Error saving party:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      mobile: "",
      email: "",
      gstin: "",
      pan: "",
      type: "Debtor",
      opening_balance: 0,
      balance_type: "To Collect",
      address: "",
      city: "",
      state: "",
      pincode: "",
    })
    setIsFormOpen(false)
    setEditingParty(null)
  }

  const handleEdit = (party: Party) => {
    setFormData({
      name: party.name,
      mobile: party.mobile,
      email: party.email,
      gstin: party.gstin,
      pan: party.pan,
      type: party.type,
      opening_balance: party.opening_balance,
      balance_type: party.balance_type,
      address: party.address,
      city: party.city,
      state: party.state,
      pincode: party.pincode,
    })
    setEditingParty(party)
    setIsFormOpen(true)
  }

  // Optimized columns
  const columns = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "mobile", label: "Mobile" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "type", label: "Type" },
      {
        key: "opening_balance",
        label: "Opening Balance",
        render: (value: number) => `₹${(value || 0).toLocaleString()}`,
      },
    ],
    []
  )

  const actions = (party: Party) => (
    <Button variant="ghost" size="sm" onClick={() => handleEdit(party)}>
      <Edit className="h-4 w-4" />
    </Button>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Party Master</h1>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Party
          </Button>
        </div>

        {/* Form */}
        {isFormOpen && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingParty ? "Edit Party" : "Add New Party"}</h2>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Party Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Party Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "Debtor" | "Creditor" | "Expense") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Debtor">Debtor</SelectItem>
                    <SelectItem value="Creditor">Creditor</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_balance">Opening Balance</Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: Number.parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance_type">Balance Type</Label>
                <Select
                  value={formData.balance_type}
                  onValueChange={(value: "To Collect" | "To Pay") => setFormData({ ...formData, balance_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Collect">To Collect</SelectItem>
                    <SelectItem value="To Pay">To Pay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  required
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  required
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingParty ? "Update" : "Save"} Party
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Parties Table */}
        <DataTable
          data={parties}
          columns={columns}
          title="All Parties"
          searchKeys={["name", "mobile", "city", "state"]}
          actions={actions}
        />
      </div>
    </AuthenticatedLayout>
  )
}
