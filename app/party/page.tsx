"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase, optimizedQuery } from "@/lib/supabase"
import { useOptimizedData } from "@/lib/cache-store"
import { Plus, Edit, Save, X, Users, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import DataTable from "@/components/DataTable"
import DataTableFilters, { FilterConfig, FilterValues } from "@/components/DataTableFilters"
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
  const [filteredParties, setFilteredParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")

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
      // Use cached data - much faster!
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

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Mobile', 'Email', 'Type', 'City', 'State', 'GSTIN', 'PAN', 'Opening Balance', 'Balance Type', 'Address'],
      ...filteredParties.map(party => [
        party.name,
        party.mobile,
        party.email || '',
        party.type,
        party.city,
        party.state,
        party.gstin || '',
        party.pan || '',
        party.opening_balance || 0,
        party.balance_type,
        party.address
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `parties_data.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

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

        const updatedParties = parties.map((party) => (party.id === editingParty.id ? { ...party, ...formData } : party))
        setParties(updatedParties)
        setFilteredParties(updatedParties)
        setEditingParty(null)
      } else {
        const { data, error } = await supabase
          .from("parties")
          .insert([{ ...formData, business_id: businessId }])
          .select()
          .single()

        if (error) throw error
        const newParties = [data, ...parties]
        setParties(newParties)
        setFilteredParties(newParties)
      }
      resetForm()
      clearCache()
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

  // Safe number formatting function
  const formatCurrency = (value: any) => {
    const num = Number(value) || 0
    return `₹${num.toLocaleString('en-IN')}`
  }

  // Optimized columns with safe formatting
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
      {
        key: "balance_type",
        label: "Balance Type",
        render: (value: string) => (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            value === 'To Collect' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value}
          </span>
        )
      }
    ],
    []
  )

  const actions = (party: Party) => (
    <Button variant="ghost" size="sm" onClick={() => handleEdit(party)}>
      <Edit className="h-4 w-4" />
    </Button>
  )

  const calculateSummary = () => {
    const debtors = filteredParties.filter(p => p.type === 'Debtor').length
    const creditors = filteredParties.filter(p => p.type === 'Creditor').length
    const expenses = filteredParties.filter(p => p.type === 'Expense').length
    const totalToCollect = filteredParties
      .filter(p => p.balance_type === 'To Collect')
      .reduce((sum, p) => sum + (Number(p.opening_balance) || 0), 0)
    const totalToPay = filteredParties
      .filter(p => p.balance_type === 'To Pay')
      .reduce((sum, p) => sum + (Number(p.opening_balance) || 0), 0)

    return { debtors, creditors, expenses, totalToCollect, totalToPay }
  }

  const summary = calculateSummary()

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
            <h1 className="text-3xl font-bold text-gray-900">Party Management</h1>
            <p className="text-gray-600 mt-1">Manage your customers, suppliers, and expense accounts</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Party
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Parties</p>
                  <p className="text-2xl font-bold">{filteredParties.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-green-100 text-sm font-medium">Debtors</p>
                <p className="text-2xl font-bold">{summary.debtors}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-purple-100 text-sm font-medium">Creditors</p>
                <p className="text-2xl font-bold">{summary.creditors}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-orange-100 text-sm font-medium">To Collect</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalToCollect)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-red-100 text-sm font-medium">To Pay</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalToPay)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Filters */}
        <DataTableFilters
          filters={filterConfigs}
          onFilterChange={handleFilterChange}
          onExport={handleExport}
          showFinancialYear={false}
        />

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
          data={filteredParties}
          columns={columns}
          title={`Parties (${filteredParties.length} of ${parties.length})`}
          searchKeys={["name", "mobile", "city", "state"]}
          actions={actions}
        />
      </div>
    </AuthenticatedLayout>
  )
}
