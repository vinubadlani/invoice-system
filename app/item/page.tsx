"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase, getSupabaseClient } from "@/lib/supabase"
import { useOptimizedData } from "@/lib/cache-store"
import { Plus, Edit, Save, X, Package, TrendingUp, TrendingDown, AlertTriangle, Trash2 } from "lucide-react"
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

interface Item {
  id: string
  business_id: string
  name: string
  code: string
  hsn_code?: string
  gst_percent?: number
  unit?: string
  sales_price?: number
  purchase_price?: number
  opening_stock?: number
  description?: string
  created_at: string
}

export default function ItemMaster() {
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const { toast } = useToast()

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "name",
      label: "Item Name",
      type: "text",
      placeholder: "Search by item name"
    },
    {
      id: "code",
      label: "Item Code",
      type: "text",
      placeholder: "Search by item code"
    },
    {
      id: "hsn_code",
      label: "HSN Code",
      type: "text",
      placeholder: "Filter by HSN code"
    },
    {
      id: "unit",
      label: "Unit",
      type: "text",
      placeholder: "Filter by unit (Kg, Pcs, Ltr)"
    },
    {
      id: "gst_percent",
      label: "GST Rate",
      type: "select",
      options: [
        { value: "0", label: "0%" },
        { value: "5", label: "5%" },
        { value: "12", label: "12%" },
        { value: "18", label: "18%" },
        { value: "28", label: "28%" }
      ]
    },
    {
      id: "stock_status",
      label: "Stock Status",
      type: "select",
      options: [
        { value: "in_stock", label: "In Stock (>10)" },
        { value: "low_stock", label: "Low Stock (1-10)" },
        { value: "out_of_stock", label: "Out of Stock (0)" }
      ]
    }
  ]

  // Use optimized data fetching
  const { fetchItems, clearCache } = useOptimizedData()

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadItems(business.id)
    }
  }, [])

  const loadItems = useCallback(async (businessId: string) => {
    try {
      setLoading(true)
      const data = await fetchItems(businessId)
      setItems(data)
      setFilteredItems(data)
    } catch (error) {
      console.error("Error loading items:", error)
    } finally {
      setLoading(false)
    }
  }, [fetchItems])

  const handleFilterChange = (filters: FilterValues) => {
    let filtered = [...items]

    // Apply text filters
    if (filters.name) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(filters.name.toLowerCase())
      )
    }

    if (filters.code) {
      filtered = filtered.filter(item =>
        item.code.toLowerCase().includes(filters.code.toLowerCase())
      )
    }

    if (filters.hsn_code) {
      filtered = filtered.filter(item =>
        (item.hsn_code || "").toLowerCase().includes(filters.hsn_code.toLowerCase())
      )
    }

    if (filters.unit) {
      filtered = filtered.filter(item =>
        (item.unit || "").toLowerCase().includes(filters.unit.toLowerCase())
      )
    }

    // Apply select filters
    if (filters.gst_percent) {
      filtered = filtered.filter(item => (item.gst_percent || 0) === Number(filters.gst_percent))
    }

    if (filters.stock_status) {
      filtered = filtered.filter(item => {
        const stock = item.opening_stock || 0
        switch (filters.stock_status) {
          case 'in_stock':
            return stock > 10
          case 'low_stock':
            return stock > 0 && stock <= 10
          case 'out_of_stock':
            return stock === 0
          default:
            return true
        }
      })
    }

    setFilteredItems(filtered)
  }

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Code', 'HSN Code', 'Unit', 'Sales Price', 'Purchase Price', 'Opening Stock', 'GST %', 'Description'],
      ...filteredItems.map(item => [
        item.name,
        item.code,
        item.hsn_code || '',
        item.unit,
        item.sales_price || 0,
        item.purchase_price || 0,
        item.opening_stock || 0,
        item.gst_percent || 0,
        item.description || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `items_data.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    hsn_code: "",
    gst_percent: 0,
    unit: "",
    sales_price: 0,
    purchase_price: 0,
    opening_stock: 0,
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.name?.trim() || !formData.code?.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Item Name and Code).",
        variant: "destructive"
      })
      return
    }
    
    if (!businessId) {
      toast({
        title: "Error", 
        description: "No business selected. Please select a business first.",
        variant: "destructive"
      })
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
      
      // Prepare clean form data
      const cleanFormData = {
        name: (formData.name || "").trim(),
        code: (formData.code || "").trim(),
        hsn_code: (formData.hsn_code || "").trim(),
        gst_percent: Number(formData.gst_percent) || 0,
        unit: (formData.unit || "").trim(),
        sales_price: Number(formData.sales_price) || 0,
        purchase_price: Number(formData.purchase_price) || 0,
        opening_stock: Number(formData.opening_stock) || 0,
        description: (formData.description || "").trim(),
      }

      // Check for duplicate item code when creating new item
      if (!editingItem) {
        const { data: existingItems, error: checkError } = await client
          .from("items")
          .select("id, name, code")
          .eq("business_id", businessId)
          .eq("code", cleanFormData.code)
          .limit(1)

        // If there's an error that's not "no rows returned", handle it
        if (checkError && checkError.code !== 'PGRST116') {
          console.error("Error checking for duplicate item:", checkError)
          throw checkError
        }

        // If we found existing items, it's a duplicate
        if (existingItems && existingItems.length > 0) {
          toast({
            title: "Error",
            description: `Item code "${cleanFormData.code}" already exists. Please use a different code.`,
            variant: "destructive"
          })
          return
        }
      }
      
      if (editingItem) {
        const { error } = await client
          .from("items")
          .update(cleanFormData)
          .eq("id", editingItem.id)
          .eq("business_id", businessId)

        if (error) {
          console.error("Update error details:", error)
          throw error
        }

        const updatedItems = items.map((item) => 
          item.id === editingItem.id ? { ...item, ...cleanFormData } : item
        )
        setItems(updatedItems)
        setFilteredItems(updatedItems)
        setEditingItem(null)
        
        toast({
          title: "Success",
          description: "Item updated successfully!"
        })
      } else {
        const { data, error } = await client
          .from("items")
          .insert([{ ...cleanFormData, business_id: businessId }])
          .select()
          .single()

        if (error) {
          console.error("Insert error details:", error)
          throw error
        }
        
        const newItems = [data as unknown as Item, ...items]
        setItems(newItems)
        setFilteredItems(newItems)
        
        toast({
          title: "Success",
          description: "Item created successfully!"
        })
      }
      resetForm()
      clearCache()
    } catch (error) {
      console.error("Error saving item - Full error object:", JSON.stringify(error, null, 2))
      
      let errorMessage = "Failed to save item. Please try again."
      
      // Handle specific Supabase errors
      if (error && typeof error === 'object') {
        // Handle duplicate key constraint violation
        if ('code' in error && error.code === '23505') {
          const errorDetails = 'details' in error ? error.details as string : ''
          if (errorDetails && errorDetails.includes('items_business_id_code_key')) {
            const itemCode = editingItem ? editingItem.code : (formData.code || "").trim()
            errorMessage = `Item code "${itemCode}" already exists. Please use a different code.`
          } else {
            errorMessage = "This item already exists. Please check your data."
          }
        } else if ('message' in error) {
          errorMessage = error.message as string
        } else if ('error_description' in error) {
          errorMessage = error.error_description as string
        } else if ('details' in error) {
          errorMessage = error.details as string
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      hsn_code: "",
      gst_percent: 0,
      unit: "",
      sales_price: 0,
      purchase_price: 0,
      opening_stock: 0,
      description: "",
    })
    setIsFormOpen(false)
    setEditingItem(null)
  }

  const handleEdit = (item: Item) => {
    try {
      setFormData({
        name: item.name || "",
        code: item.code || "",
        hsn_code: item.hsn_code || "",
        gst_percent: item.gst_percent || 0,
        unit: item.unit || "",
        sales_price: item.sales_price || 0,
        purchase_price: item.purchase_price || 0,
        opening_stock: item.opening_stock || 0,
        description: item.description || "",
      })
      setEditingItem(item)
      setIsFormOpen(true)
    } catch (error) {
      console.error("Error editing item:", error)
      toast({
        title: "Error",
        description: "Failed to load item for editing. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (item: Item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
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
        .from("items")
        .delete()
        .eq("id", item.id)
        .eq("business_id", businessId)

      if (error) throw error

      // Update local state
      const updatedItems = items.filter(i => i.id !== item.id)
      setItems(updatedItems)
      setFilteredItems(updatedItems)
      
      // Clear cache to ensure fresh data
      clearCache()
      
      // Close the form if we're in edit mode
      setIsFormOpen(false)
      setEditingItem(null)
      
      toast({
        title: "Success",
        description: "Item deleted successfully!"
      })
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive"
      })
    }
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
        label: "Item Name",
        render: (value: string) => <span className="font-medium text-blue-600">{value}</span>
      },
      { 
        key: "code", 
        label: "Code",
        render: (value: string) => <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{value}</span>
      },
      { 
        key: "hsn_code", 
        label: "HSN",
        render: (value: string) => value || "-"
      },
      { 
        key: "unit", 
        label: "Unit",
        render: (value: string) => <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{value || "-"}</span>
      },
      { 
        key: "sales_price", 
        label: "Sales Price",
        render: (value: any) => (
          <span className="text-green-600 font-medium">{formatCurrency(value)}</span>
        )
      },
      { 
        key: "purchase_price", 
        label: "Purchase Price",
        render: (value: any) => (
          <span className="text-orange-600 font-medium">{formatCurrency(value)}</span>
        )
      },
      {
        key: "opening_stock",
        label: "Stock",
        render: (value: any, row: Item) => {
          const stock = Number(value) || 0
          const unit = row.unit || ""
          return (
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                stock > 10
                  ? "bg-green-100 text-green-800"
                  : stock > 0
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {stock} {unit}
            </span>
          )
        }
      },
      { 
        key: "gst_percent", 
        label: "GST %",
        render: (value: any) => {
          const gst = Number(value) || 0
          return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{gst}%</span>
        }
      }
    ],
    []
  )

  const actions = (item: Item) => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  )

  const calculateSummary = () => {
    const totalItems = filteredItems.length
    const inStock = filteredItems.filter(item => (item.opening_stock || 0) > 10).length
    const lowStock = filteredItems.filter(item => {
      const stock = item.opening_stock || 0
      return stock > 0 && stock <= 10
    }).length
    const outOfStock = filteredItems.filter(item => (item.opening_stock || 0) === 0).length
    const totalValue = filteredItems.reduce((sum, item) => {
      return sum + ((item.sales_price || 0) * (item.opening_stock || 0))
    }, 0)

    return { totalItems, inStock, lowStock, outOfStock, totalValue }
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
      <div className="space-y-6" style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Item Master</h1>
            <p className="text-gray-600 mt-1">Manage your product inventory and pricing</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Items</p>
                  <p className="text-2xl font-bold">{summary.totalItems}</p>
                </div>
                <Package className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">In Stock</p>
                  <p className="text-2xl font-bold">{summary.inStock}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Low Stock</p>
                  <p className="text-2xl font-bold">{summary.lowStock}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Out of Stock</p>
                  <p className="text-2xl font-bold">{summary.outOfStock}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-purple-100 text-sm font-medium">Inventory Value</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalValue)}</p>
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
              <h2 className="text-lg font-semibold text-gray-900">{editingItem ? "Edit Item" : "Add New Item"}</h2>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Item Code *</Label>
                <Input
                  id="code"
                  required
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hsn_code">HSN Code</Label>
                <Input
                  id="hsn_code"
                  value={formData.hsn_code || ""}
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_percent">GST %</Label>
                <Select
                  value={(formData.gst_percent || 0).toString()}
                  onValueChange={(value) => setFormData({ ...formData, gst_percent: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit || ""}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Kg, Pcs, Ltr, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sales_price">Sales Price (incl. tax)</Label>
                <Input
                  id="sales_price"
                  type="number"
                  step="0.01"
                  value={formData.sales_price || 0}
                  onChange={(e) => setFormData({ ...formData, sales_price: Number.parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase_price">Purchase Price (excl. tax)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price || 0}
                  onChange={(e) => setFormData({ ...formData, purchase_price: Number.parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_stock">Opening Stock</Label>
                <Input
                  id="opening_stock"
                  type="number"
                  value={formData.opening_stock || 0}
                  onChange={(e) => setFormData({ ...formData, opening_stock: Number.parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-between items-center">
                {editingItem && (
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => handleDelete(editingItem)}
                    className="mr-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Item
                  </Button>
                )}
                
                <div className="flex space-x-3 ml-auto">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingItem ? "Update" : "Save"} Item
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Items Table */}
        <DataTable
          data={filteredItems}
          columns={columns}
          title={`Items (${filteredItems.length} of ${items.length})`}
          searchKeys={["name", "code", "hsn_code"]}
          actions={actions}
        />
      </div>
    </AuthenticatedLayout>
  )
}
