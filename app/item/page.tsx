"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import DataTable from "@/components/DataTable"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"

interface Item {
  id: string
  business_id: string
  name: string
  code: string
  hsn_code: string
  gst_percent: number
  unit: string
  sales_price: number
  purchase_price: number
  opening_stock: number
  description: string
  created_at: string
}

export default function ItemMaster() {
  const [items, setItems] = useState<Item[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")

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

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      fetchItems(business.id)
    }
  }, [])

  const fetchItems = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error("Error fetching items:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) return

    try {
      if (editingItem) {
        const { error } = await supabase.from("items").update(formData).eq("id", editingItem.id)

        if (error) throw error

        setItems(items.map((item) => (item.id === editingItem.id ? { ...item, ...formData } : item)))
        setEditingItem(null)
      } else {
        const { data, error } = await supabase
          .from("items")
          .insert([{ ...formData, business_id: businessId }])
          .select()
          .single()

        if (error) throw error
        setItems([data, ...items])
      }
      resetForm()
    } catch (error) {
      console.error("Error saving item:", error)
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
    setFormData({
      name: item.name,
      code: item.code,
      hsn_code: item.hsn_code,
      gst_percent: item.gst_percent,
      unit: item.unit,
      sales_price: item.sales_price,
      purchase_price: item.purchase_price,
      opening_stock: item.opening_stock,
      description: item.description,
    })
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const columns = [
    { key: "name", label: "Item Name", render: (value: string) => <span className="font-medium">{value}</span> },
    { key: "code", label: "Code" },
    { key: "hsn_code", label: "HSN" },
    { key: "unit", label: "Unit" },
    { key: "sales_price", label: "Sales Price", render: (value: number) => `₹${value.toLocaleString()}` },
    { key: "purchase_price", label: "Purchase Price", render: (value: number) => `₹${value.toLocaleString()}` },
    {
      key: "opening_stock",
      label: "Stock",
      render: (value: number, row: Item) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            value > 10
              ? "bg-green-100 text-green-800"
              : value > 0
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {value} {row.unit}
        </span>
      ),
    },
    { key: "gst_percent", label: "GST %", render: (value: number) => `${value}%` },
  ]

  const actions = (item: Item) => (
    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
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
          <h1 className="text-2xl font-bold text-gray-900">Item Master</h1>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Item Code *</Label>
                <Input
                  id="code"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hsn_code">HSN Code</Label>
                <Input
                  id="hsn_code"
                  value={formData.hsn_code}
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_percent">GST %</Label>
                <Input
                  id="gst_percent"
                  type="number"
                  step="0.01"
                  value={formData.gst_percent}
                  onChange={(e) => setFormData({ ...formData, gst_percent: Number.parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
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
                  value={formData.sales_price}
                  onChange={(e) => setFormData({ ...formData, sales_price: Number.parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase_price">Purchase Price (excl. tax)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: Number.parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_stock">Opening Stock</Label>
                <Input
                  id="opening_stock"
                  type="number"
                  value={formData.opening_stock}
                  onChange={(e) => setFormData({ ...formData, opening_stock: Number.parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingItem ? "Update" : "Save"} Item
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Items Table */}
        <DataTable
          data={items}
          columns={columns}
          title="All Items"
          searchKeys={["name", "code", "hsn_code"]}
          actions={actions}
        />
      </div>
    </AuthenticatedLayout>
  )
}
