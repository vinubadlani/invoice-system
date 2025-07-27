"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase, getSupabaseClient } from "@/lib/supabase"
import { useOptimizedData } from "@/lib/cache-store"
import { Plus, Edit, Save, X, Users, Phone, MapPin, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import DataTable from "@/components/DataTable"
import DataTableFilters, { FilterConfig, FilterValues } from "@/components/DataTableFilters"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"

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
  const [filteredParties, setFilteredParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const { toast } = useToast()

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "name",
      label: "Party Name",
      type: "text",
      placeholder: "Search by party name"
    },
    {
      id: "mobile",
      label: "Mobile",
      type: "text",
      placeholder: "Search by mobile number"
    },
    {
      id: "type",
      label: "Party Type",
      type: "select",
      options: [
        { value: "Debtor", label: "Debtor" },
        { value: "Creditor", label: "Creditor" },
        { value: "Expense", label: "Expense" }
      ]
    },
    {
      id: "balance_type",
      label: "Balance Type",
      type: "select",
      options: [
        { value: "To Collect", label: "To Collect" },
        { value: "To Pay", label: "To Pay" }
      ]
    },
    {
      id: "city",
      label: "City",
      type: "text",
      placeholder: "Filter by city"
    },
    {
      id: "state",
      label: "State",
      type: "text",
      placeholder: "Filter by state"
    },
    {
      id: "gstin",
      label: "GSTIN",
      type: "text",
      placeholder: "Filter by GSTIN"
    }
  ]

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
      const data = await fetchParties(businessId)
      setParties(data)
      setFilteredParties(data)
    } catch (error) {
      console.error("Error loading parties:", error)
    } finally {
      setLoading(false)
    }
  }, [fetchParties])

  const handleFilterChange = (filters: FilterValues) => {
    let filtered = [...parties]

    // Apply text filters
    if (filters.name) {
      filtered = filtered.filter(party => 
        party.name.toLowerCase().includes(filters.name.toLowerCase())
      )
    }

    if (filters.mobile) {
      filtered = filtered.filter(party =>
        party.mobile.includes(filters.mobile)
      )
    }

    if (filters.city) {
      filtered = filtered.filter(party =>
        party.city.toLowerCase().includes(filters.city.toLowerCase())
      )
    }

    if (filters.state) {
      filtered = filtered.filter(party =>
        party.state.toLowerCase().includes(filters.state.toLowerCase())
      )
    }

    if (filters.gstin) {
      filtered = filtered.filter(party =>
        party.gstin?.toLowerCase().includes(filters.gstin.toLowerCase())
      )
    }

    // Apply select filters
    if (filters.type) {
      filtered = filtered.filter(party => party.type === filters.type)
    }

    if (filters.balance_type) {
      filtered = filtered.filter(party => party.balance_type === filters.balance_type)
    }

    setFilteredParties(filtered)
  }

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)

  const [formData, setFormData] = useState<{
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
  }>({
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

  const handleEdit = (party: Party) => {
    setFormData({
      name: party.name,
      mobile: party.mobile,
      email: party.email || "",
      gstin: party.gstin || "",
      pan: party.pan || "",
      type: party.type,
      opening_balance: party.opening_balance || 0,
      balance_type: party.balance_type,
      address: party.address,
      city: party.city,
      state: party.state,
      pincode: party.pincode || "",
    })
    setEditingParty(party)
    setIsFormOpen(true)
  }

  const handleDelete = async (party: Party) => {
    if (!confirm(`Are you sure you want to delete "${party.name}"? This action cannot be undone.`)) {
      return
    }

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
      
      const { error } = await client
        .from("parties")
        .delete()
        .eq("id", party.id)
        .eq("business_id", businessId)

      if (error) throw error

      // Update local state
      const updatedParties = parties.filter(p => p.id !== party.id)
      setParties(updatedParties)
      setFilteredParties(updatedParties)
      
      // Clear cache to ensure fresh data
      clearCache()
      
      alert("Party deleted successfully!")
    } catch (error) {
      console.error("Error deleting party:", error)
      alert("Failed to delete party. Please try again.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
      
      if (editingParty) {
        // Update existing party
        const { error } = await client
          .from("parties")
          .update({
            ...formData,
            business_id: businessId,
          })
          .eq("id", editingParty.id)
          .eq("business_id", businessId)

        if (error) throw error
      } else {
        // Create new party
        const { error } = await client
          .from("parties")
          .insert([{
            ...formData,
            business_id: businessId,
          }])

        if (error) throw error
      }

      // Refresh data
      await loadParties(businessId)
      clearCache()
      setIsFormOpen(false)
      setEditingParty(null)
      
      // Reset form
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

      alert(editingParty ? "Party updated successfully!" : "Party created successfully!")
    } catch (error) {
      console.error("Error saving party:", error)
      alert("Failed to save party. Please try again.")
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const columns = useMemo(
    () => [
      { 
        key: "name", 
        label: "Name",
        render: (value: string) => <span className="font-medium text-blue-600">{value}</span>
      },
      { 
        key: "mobile", 
        label: "Mobile",
        render: (value: string) => (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-gray-400" />
            {value}
          </div>
        )
      },
      { 
        key: "type", 
        label: "Type",
        render: (value: string) => (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            value === 'Debtor' ? 'bg-blue-100 text-blue-800' :
            value === 'Creditor' ? 'bg-green-100 text-green-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {value}
          </span>
        )
      },
      { 
        key: "city", 
        label: "City",
        render: (value: string) => (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-gray-400" />
            {value}
          </div>
        )
      },
      { key: "state", label: "State" },
      {
        key: "opening_balance",
        label: "Opening Balance",
        render: (value: any) => (
          <span className={Number(value) > 0 ? "text-green-600 font-medium" : "text-gray-500"}>
            {formatCurrency(value)}
          </span>
        )
      },
    ],
    []
  )

  const actions = (party: Party) => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => handleEdit(party)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleDelete(party)} className="text-red-600 hover:text-red-800 hover:bg-red-50">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Party Master</h1>
            <p className="text-gray-600 mt-1">Manage your customers, suppliers, and expense accounts</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Party
          </Button>
        </div>

        {/* Filters */}
        <DataTableFilters 
          filters={filterConfigs} 
          onFilterChange={handleFilterChange}
        />

        {/* Party Table */}
        <DataTable
          data={filteredParties}
          columns={columns}
          title={`Parties (${filteredParties.length} of ${parties.length})`}
          searchKeys={["name", "mobile", "city", "state"]}
          actions={actions}
        />

        {/* Add/Edit Form Dialog */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingParty ? "Edit Party" : "Add New Party"}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Party Name *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="mobile">Mobile *</Label>
                    <Input
                      id="mobile"
                      required
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Party Type *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Debtor">Debtor (Customer)</SelectItem>
                        <SelectItem value="Creditor">Creditor (Supplier)</SelectItem>
                        <SelectItem value="Expense">Expense Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input
                      id="gstin"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pan">PAN</Label>
                    <Input
                      id="pan"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="opening_balance">Opening Balance</Label>
                    <Input
                      id="opening_balance"
                      type="number"
                      step="0.01"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: Number.parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="balance_type">Balance Type</Label>
                    <Select 
                      value={formData.balance_type} 
                      onValueChange={(value: any) => setFormData({ ...formData, balance_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="To Collect">To Collect (Receivable)</SelectItem>
                        <SelectItem value="To Pay">To Pay (Payable)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsFormOpen(false)
                      setEditingParty(null)
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingParty ? "Update" : "Save"} Party
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
