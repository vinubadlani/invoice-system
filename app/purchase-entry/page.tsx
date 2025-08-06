"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchParties, fetchItems, insertData, getCurrentUser, updateData, getSupabaseClient } from "@/lib/supabase"
import { Plus, Trash2, Save, Package, Calendar, User, MapPin, FileText, Calculator, DollarSign, Loader2, RefreshCw, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"

interface Party {
  id: string
  name: string
  gstin?: string
  state?: string
  address?: string
  type: string
}

interface Item {
  id: string
  name: string
  hsn_code?: string
  gst_percent?: number
  purchase_price?: number
  unit?: string
}

interface InvoiceItem {
  id: string
  item_name: string
  hsn_code: string
  quantity: number
  rate: number
  gst_percent: number
  gst_amount: number
  total_amount: number
}

export default function PurchaseEntry() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [businessId, setBusinessId] = useState<string>("")
  const [parties, setParties] = useState<Party[]>([])
  const [items, setItems] = useState<Item[]>([])
  
  const [formData, setFormData] = useState({
    invoice_no: `PUR-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split("T")[0],
    party_id: "",
    party_name: "",
    gstin: "",
    state: "",
    address: "",
    payment_mode: "Cash",
  })

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      item_name: "",
      hsn_code: "",
      quantity: 1,
      rate: 0,
      gst_percent: 0,
      gst_amount: 0,
      total_amount: 0,
    },
  ])

  const [totals, setTotals] = useState({
    subtotal: 0,
    total_tax: 0,
    net_total: 0,
    payment_received: 0,
    balance_due: 0,
  })

  // Load initial data
  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadData(business.id)
    } else {
      setLoading(false)
      toast({
        title: "No Business Selected",
        description: "Please select a business to create purchase entries.",
        variant: "destructive",
      })
    }
  }, [])

  // Load existing invoice if editing
  useEffect(() => {
    if (editId && businessId) {
      loadExistingInvoice(editId)
    }
  }, [editId, businessId])

  const loadData = async (businessId: string) => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      if (!user) {
        throw new Error("User not authenticated")
      }

      const [partiesData, itemsData] = await Promise.all([
        fetchParties(businessId, "Creditor", user.id),
        fetchItems(businessId, user.id)
      ])

      setParties(partiesData as unknown as Party[])
      setItems(itemsData as unknown as Item[])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadExistingInvoice = async (invoiceId: string) => {
    try {
      const client = getSupabaseClient()
      if (!client) throw new Error("Database connection not available")

      const { data: invoice, error } = await client
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('type', 'purchase')
        .single()

      if (error) throw error

      if (invoice) {
        // Extract payment mode and items from the items field
        let extractedPaymentMode = "Cash"
        let extractedItems = []
        
        if (invoice.items) {
          if (Array.isArray(invoice.items)) {
            // Old format - items is an array
            extractedItems = invoice.items
          } else if (typeof invoice.items === 'object' && invoice.items.items) {
            // New format - items is an object with payment_mode and items
            extractedPaymentMode = invoice.items.payment_mode || "Cash"
            extractedItems = invoice.items.items || []
          }
        }

        setFormData({
          invoice_no: invoice.invoice_no as string,
          date: invoice.date as string,
          party_id: "", // Don't use party_id from database since it doesn't exist
          party_name: invoice.party_name as string,
          gstin: (invoice.gstin as string) || "",
          state: (invoice.state as string) || "",
          address: (invoice.address as string) || "",
          payment_mode: extractedPaymentMode,
        })

        // Parse items if they exist
        if (extractedItems.length > 0) {
          setInvoiceItems(extractedItems.map((item: any, index: number) => ({
            id: (index + 1).toString(),
            item_name: item.item_name || item.item || "",
            hsn_code: item.hsn_code || item.hsn || "",
            quantity: item.quantity || item.qty || 1,
            rate: item.rate || 0,
            gst_percent: item.gst_percent || item.gstPercent || 0,
            gst_amount: item.gst_amount || item.taxAmount || 0,
            total_amount: item.total_amount || item.total || 0,
          })))
        }

        setTotals({
          subtotal: ((invoice.net_total as number) || 0) - ((invoice.total_tax as number) || 0),
          total_tax: (invoice.total_tax as number) || 0,
          net_total: (invoice.net_total as number) || 0,
          payment_received: (invoice.payment_received as number) || 0,
          balance_due: (invoice.balance_due as number) || 0,
        })
      }
    } catch (error) {
      console.error("Error loading existing invoice:", error)
      toast({
        title: "Error",
        description: "Failed to load invoice for editing.",
        variant: "destructive",
      })
    }
  }

  const handlePartyChange = (partyId: string) => {
    const party = parties.find((p) => p.id === partyId)
    if (party) {
      setFormData({
        ...formData,
        party_id: partyId,
        party_name: party.name,
        gstin: party.gstin || "",
        state: party.state || "",
        address: party.address || "",
      })
    }
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...invoiceItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    // Auto-fill item details when item name is selected
    if (field === "item_name") {
      const item = items.find((i) => i.name === value)
      if (item) {
        updatedItems[index] = {
          ...updatedItems[index],
          hsn_code: item.hsn_code || "",
          rate: item.purchase_price || 0,
          gst_percent: item.gst_percent || 0,
        }
      }
    }

    // Calculate totals for the item
    const item = updatedItems[index]
    const subtotal = item.quantity * item.rate
    item.gst_amount = (subtotal * item.gst_percent) / 100
    item.total_amount = subtotal + item.gst_amount

    setInvoiceItems(updatedItems)
    calculateTotals(updatedItems)
  }

  const calculateTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
    const total_tax = items.reduce((sum, item) => sum + item.gst_amount, 0)
    const net_total = subtotal + total_tax

    setTotals({
      subtotal,
      total_tax,
      net_total,
      payment_received: totals.payment_received,
      balance_due: net_total - totals.payment_received,
    })
  }
  const addNewItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      {
        id: Date.now().toString(),
        item_name: "",
        hsn_code: "",
        quantity: 1,
        rate: 0,
        gst_percent: 0,
        gst_amount: 0,
        total_amount: 0,
      },
    ])
  }

  const removeItem = (index: number) => {
    if (invoiceItems.length > 1) {
      const updatedItems = invoiceItems.filter((_, i) => i !== index)
      setInvoiceItems(updatedItems)
      calculateTotals(updatedItems)
    }
  }

  const handlePaymentChange = (amount: number) => {
    const newTotals = {
      ...totals,
      payment_received: amount,
      balance_due: totals.net_total - amount,
    }
    setTotals(newTotals)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.party_name || !businessId) {
      toast({
        title: "Validation Error",
        description: "Please select a supplier and ensure business is selected.",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const user = await getCurrentUser()
      if (!user) {
        throw new Error("User not authenticated")
      }

      const invoiceData = {
        business_id: businessId,
        invoice_no: formData.invoice_no,
        date: formData.date,
        party_name: formData.party_name,
        gstin: formData.gstin,
        state: formData.state,
        address: formData.address,
        type: 'purchase',
        total_tax: totals.total_tax,
        net_total: totals.net_total,
        payment_received: totals.payment_received,
        balance_due: totals.balance_due,
        items: {
          payment_mode: formData.payment_mode,
          items: invoiceItems.map(item => ({
            item_name: item.item_name,
            hsn_code: item.hsn_code,
            quantity: item.quantity,
            rate: item.rate,
            gst_percent: item.gst_percent,
            gst_amount: item.gst_amount,
            total_amount: item.total_amount,
          }))
        },
      }

      if (editId) {
        // Update existing invoice
        const { error } = await updateData('invoices', editId, invoiceData)
        if (error) throw error
        
        toast({
          title: "Success",
          description: "Purchase invoice updated successfully!",
        })
      } else {
        // Create new invoice
        const { data: invoiceResult, error } = await insertData('invoices', invoiceData)
        if (error) throw error
        
        // Auto-record payment if payment_received > 0
        if (totals.payment_received > 0 && invoiceResult) {
          const paymentData = {
            business_id: businessId,
            party_name: formData.party_name,
            invoice_no: formData.invoice_no,
            type: "Paid", // For purchases, we pay the supplier
            amount: totals.payment_received,
            mode: formData.payment_mode,
            date: formData.date,
            remarks: `Auto-recorded from purchase invoice ${formData.invoice_no}`,
          }
          
          // Insert payment record
          const { error: paymentError } = await insertData('payments', paymentData)
          if (paymentError) {
            console.error("Error recording payment:", paymentError)
            // Don't fail the invoice creation if payment recording fails
          }
        }
        
        toast({
          title: "Success",
          description: totals.payment_received > 0 
            ? "Purchase invoice created and payment recorded successfully!" 
            : "Purchase invoice created successfully!",
        })
      }

      // Reset form if not editing
      if (!editId) {
        setFormData({
          invoice_no: `PUR-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString().split("T")[0],
          party_id: "",
          party_name: "",
          gstin: "",
          state: "",
          address: "",
          payment_mode: "Cash",
        })
        setInvoiceItems([
          {
            id: "1",
            item_name: "",
            hsn_code: "",
            quantity: 1,
            rate: 0,
            gst_percent: 0,
            gst_amount: 0,
            total_amount: 0,
          },
        ])
        setTotals({
          subtotal: 0,
          total_tax: 0,
          net_total: 0,
          payment_received: 0,
          balance_due: 0,
        })
      }

    } catch (error: any) {
      console.error("Error saving purchase:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to save purchase invoice",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading purchase entry...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-6 space-y-8">
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-800 rounded-2xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-green-600/20 backdrop-blur-sm"></div>
            <div className="relative p-8 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
                    {editId ? 'Edit Purchase' : 'Purchase Entry'}
                  </h1>
                  <p className="text-emerald-100 text-lg opacity-90">
                    {editId ? 'Update purchase transaction details' : 'Create and manage purchase transactions with ease'}
                  </p>
                </div>
                <div className="hidden lg:block">
                  <div className="w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center">
                    <Package className="w-16 h-16 text-white/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Purchase Details Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
                <CardTitle className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Purchase Details
                </CardTitle>
                <p className="text-emerald-600 text-sm">Enter the basic purchase information</p>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Purchase No *
                    </Label>
                    <Input
                      required
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      value={formData.invoice_no}
                      onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date *
                    </Label>
                    <Input
                      type="date"
                      required
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Supplier Name *
                    </Label>
                    <Select 
                      value={formData.party_id} 
                      onValueChange={(value) => handlePartyChange(value)}
                    >
                      <SelectTrigger className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500">
                        <SelectValue placeholder="Select Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {parties
                          .filter((p) => p.type === "Creditor")
                          .map((party) => (
                            <SelectItem key={party.id} value={party.id}>
                              {party.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">GSTIN</Label>
                    <Input
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      placeholder="GST Identification Number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">State</Label>
                    <Input
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3 space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </Label>
                    <Input
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Complete address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Mode
                    </Label>
                    <Select 
                      value={formData.payment_mode} 
                      onValueChange={(value) => setFormData({ ...formData, payment_mode: value })}
                    >
                      <SelectTrigger className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500">
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Bank">Bank Transfer</SelectItem>
                        <SelectItem value="Credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Purchase Items
                    </CardTitle>
                    <p className="text-blue-600 text-sm">Add items to your purchase</p>
                  </div>
                  <Button 
                    type="button" 
                    onClick={addNewItem} 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="overflow-x-auto bg-slate-50 rounded-xl border border-slate-200">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-slate-100 to-slate-200">
                      <tr>
                        <th className="text-left py-4 px-4 text-sm font-bold text-slate-700">S.No</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-slate-700">Item Name</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-slate-700">HSN</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-slate-700">Qty</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-slate-700">Rate</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-slate-700">GST %</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-slate-700">Tax Amt</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-slate-700">Total</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-slate-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {invoiceItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-100 transition-colors">
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="bg-slate-100 text-slate-700">
                              {index + 1}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Select
                              value={item.item_name}
                              onValueChange={(value) => handleItemChange(index, "item_name", value)}
                            >
                              <SelectTrigger className="min-w-[200px] border-slate-300">
                                <SelectValue placeholder="Select Item" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((i) => (
                                  <SelectItem key={i.id} value={i.name}>
                                    {i.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-4 px-4">
                            <Input
                              className="w-24 border-slate-300"
                              value={item.hsn_code}
                              onChange={(e) => handleItemChange(index, "hsn_code", e.target.value)}
                              placeholder="HSN"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <Input
                              type="number"
                              className="w-20 border-slate-300"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", Number.parseInt(e.target.value) || 0)}
                              min="1"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-28 border-slate-300"
                              value={item.rate}
                              onChange={(e) => handleItemChange(index, "rate", Number.parseFloat(e.target.value) || 0)}
                              min="0"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <Input
                              type="number"
                              step="0.01"
                              className="w-20 border-slate-300"
                              value={item.gst_percent}
                              onChange={(e) => handleItemChange(index, "gst_percent", Number.parseFloat(e.target.value) || 0)}
                              min="0"
                              max="28"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                              ₹{item.gst_amount.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                              ₹{item.total_amount.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                              disabled={invoiceItems.length === 1}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Totals Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                <CardTitle className="text-xl font-bold text-purple-900 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Purchase Summary
                </CardTitle>
                <p className="text-purple-600 text-sm">Review your purchase totals</p>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Subtotal</Label>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <div className="text-lg font-bold text-blue-700">₹{totals.subtotal.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Total Tax</Label>
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
                      <div className="text-lg font-bold text-amber-700">₹{totals.total_tax.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Net Total</Label>
                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
                      <div className="text-xl font-bold text-emerald-700">₹{totals.net_total.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Payment Received</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="border-slate-300 focus:border-purple-500 focus:ring-purple-500 text-lg font-semibold"
                      value={totals.payment_received}
                      onChange={(e) => handlePaymentChange(Number.parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Balance Due</Label>
                    <div className={`p-3 border rounded-lg ${
                      totals.balance_due > 0 
                        ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200' 
                        : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                    }`}>
                      <div className={`text-xl font-bold ${
                        totals.balance_due > 0 ? 'text-red-700' : 'text-green-700'
                      }`}>
                        ₹{totals.balance_due.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-3 text-lg font-semibold shadow-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {editId ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    {editId ? 'Update Purchase' : 'Save Purchase'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
