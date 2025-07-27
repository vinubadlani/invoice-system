"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase, getSupabaseClient } from "@/lib/supabase"
import { useOptimizedData } from "@/lib/cache-store"
import { Plus, Edit, Trash2, Save, X, Loader2, Search, Calculator, Receipt, FileText, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import DataTable from "@/components/DataTable"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Business {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  gstin: string
  pan: string
  terms_conditions: string
}

interface Party {
  id: string
  name: string
  gstin: string
  address: string
  city: string
  state: string
}

interface Item {
  id: string
  name: string
  code: string
  hsn_code: string
  gst_percent: number
  sales_price: number
  unit: string
}

interface InvoiceItem {
  id: string
  item_id: string
  item_name: string
  item_code: string
  hsn: string
  qty: number
  rate: number
  unit: string
  gst_percent: number
  tax_amount: number
  total: number
}

interface Invoice {
  id: string
  invoice_no: string
  date: string
  party_id: string
  party_name: string
  gstin: string
  state: string
  address: string
  items: InvoiceItem[]
  total_tax: number
  round_off: number
  net_total: number
  payment_received: number
  balance_due: number
  type: "sales" | "purchase"
}

export default function SalesEntry() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [businessId, setBusinessId] = useState<string>("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [itemSearchOpen, setItemSearchOpen] = useState(false)
  const [itemSearchValue, setItemSearchValue] = useState("")
  const { toast } = useToast()

  // Use optimized data fetching
  const { fetchParties, fetchItems, fetchBusiness } = useOptimizedData()
  const [parties, setParties] = useState<Party[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [business, setBusiness] = useState<Business | null>(null)

  const [formData, setFormData] = useState({
    invoice_no: "",
    date: new Date().toISOString().split('T')[0],
    party_id: "",
    payment_received: "",
    round_off: "",
  })

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [currentItem, setCurrentItem] = useState({
    item_id: "",
    qty: "1",
    rate: "",
  })

  // Generate invoice number
  const generateInvoiceNo = useCallback(() => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    return `INV-${year}${month}${day}-${timestamp}`
  }, [])

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const businessData = JSON.parse(storedBusiness)
      setBusinessId(businessData.id)
      fetchData(businessData.id)
    }
  }, [])

  const fetchData = useCallback(async (businessId: string) => {
    try {
      setLoading(true)
      
      const client = getSupabaseClient()
      if (!client) {
        console.error("Supabase client not available")
        return
      }
      
      // Use cached data fetching - much faster!
      const [partiesData, itemsData, businessData, invoicesResult] = await Promise.all([
        fetchParties(businessId),
        fetchItems(businessId),
        fetchBusiness(businessId),
        client
          .from("invoices")
          .select("*")
          .eq("business_id", businessId)
          .eq("type", "sales")
          .order("created_at", { ascending: false })
          .limit(25) // Reduced from 50 for faster loading
      ])

      if (invoicesResult.error) throw invoicesResult.error

      setParties(partiesData)
      setItems(itemsData)
      setBusiness(businessData)
      setInvoices((invoicesResult.data as unknown as Invoice[]) || [])
      
      if (!editingInvoice) {
        setFormData(prev => ({ ...prev, invoice_no: generateInvoiceNo() }))
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [fetchParties, fetchItems, fetchBusiness, generateInvoiceNo, editingInvoice, toast])

  // Optimized filtered items with debouncing
  const filteredItems = useMemo(() => {
    if (!itemSearchValue) return items.slice(0, 20) // Limit initial results
    return items.filter(item => 
      item.name.toLowerCase().includes(itemSearchValue.toLowerCase()) ||
      item.code.toLowerCase().includes(itemSearchValue.toLowerCase())
    ).slice(0, 20) // Limit search results
  }, [items, itemSearchValue])

  // Optimized add item function
  const addItemToInvoice = useCallback(() => {
    const selectedItem = items.find(item => item.id === currentItem.item_id)
    if (!selectedItem) return

    const qty = parseFloat(currentItem.qty) || 1
    const rate = parseFloat(currentItem.rate) || selectedItem.sales_price
    const taxAmount = (rate * qty * selectedItem.gst_percent) / 100
    const total = (rate * qty) + taxAmount

    const newItem: InvoiceItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      item_code: selectedItem.code,
      hsn: selectedItem.hsn_code,
      qty: qty,
      rate: rate,
      unit: selectedItem.unit,
      gst_percent: selectedItem.gst_percent,
      tax_amount: taxAmount,
      total: total,
    }

    setInvoiceItems(prev => [...prev, newItem])
    setCurrentItem({ item_id: "", qty: "1", rate: "" })
    setItemSearchValue("")
    setItemSearchOpen(false)
  }, [items, currentItem])

  const removeItemFromInvoice = useCallback((itemId: string) => {
    setInvoiceItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  const updateItemQuantity = useCallback((itemId: string, qty: string) => {
    const qtyNum = parseFloat(qty) || 0
    setInvoiceItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const taxAmount = (item.rate * qtyNum * item.gst_percent) / 100
        const total = (item.rate * qtyNum) + taxAmount
        return { ...item, qty: qtyNum, tax_amount: taxAmount, total }
      }
      return item
    }))
  }, [])

  const updateItemRate = useCallback((itemId: string, rate: string) => {
    const rateNum = parseFloat(rate) || 0
    setInvoiceItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const taxAmount = (rateNum * item.qty * item.gst_percent) / 100
        const total = (rateNum * item.qty) + taxAmount
        return { ...item, rate: rateNum, tax_amount: taxAmount, total }
      }
      return item
    }))
  }, [])

  const totals = useMemo(() => {
    const totalTax = invoiceItems.reduce((sum, item) => sum + item.tax_amount, 0)
    const subTotal = invoiceItems.reduce((sum, item) => sum + (item.qty * item.rate), 0)
    const roundOff = parseFloat(formData.round_off) || 0
    const paymentReceived = parseFloat(formData.payment_received) || 0
    const netTotal = subTotal + totalTax + roundOff
    const balanceDue = netTotal - paymentReceived
    return { totalTax, subTotal, netTotal, balanceDue, roundOff, paymentReceived }
  }, [invoiceItems, formData.round_off, formData.payment_received])

  const resetForm = useCallback(() => {
    setFormData({
      invoice_no: generateInvoiceNo(),
      date: new Date().toISOString().split('T')[0],
      party_id: "",
      payment_received: "",
      round_off: "",
    })
    setInvoiceItems([])
    setCurrentItem({ item_id: "", qty: "1", rate: "" })
    setIsFormOpen(false)
    setEditingInvoice(null)
    setItemSearchValue("")
  }, [generateInvoiceNo])

  // Optimized form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || invoiceItems.length === 0 || !formData.party_id) {
      toast({
        title: "Error",
        description: "Please fill all required fields and add at least one item.",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
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
      
      const selectedParty = parties.find(p => p.id === formData.party_id)
      if (!selectedParty) {
        throw new Error("Selected party not found")
      }

      const invoiceData = {
        business_id: businessId,
        invoice_no: formData.invoice_no,
        date: formData.date,
        party_id: formData.party_id,
        party_name: selectedParty.name,
        gstin: selectedParty.gstin || "",
        state: selectedParty.state,
        address: selectedParty.address,
        items: invoiceItems,
        total_tax: totals.totalTax,
        round_off: totals.roundOff,
        net_total: totals.netTotal,
        payment_received: totals.paymentReceived,
        balance_due: totals.balanceDue,
        type: "sales" as const,
      }

      let result
      if (editingInvoice) {
        result = await client
          .from("invoices")
          .update(invoiceData)
          .eq("id", editingInvoice.id)
          .select()
          .single()
      } else {
        result = await client
          .from("invoices")
          .insert([invoiceData])
          .select()
          .single()
      }

      if (result.error) {
        throw result.error
      }

      // Optimistically update the UI
      if (editingInvoice) {
        setInvoices(prev => prev.map(inv => 
          inv.id === editingInvoice.id ? { ...inv, ...invoiceData } : inv
        ))
      } else {
        setInvoices(prev => [result.data as unknown as Invoice, ...prev.slice(0, 24)]) // Keep only 25 recent invoices
      }

      toast({
        title: "Success",
        description: `Invoice ${editingInvoice ? "updated" : "created"} successfully!`
      })

      resetForm()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }, [businessId, invoiceItems, formData, parties, totals, editingInvoice, toast, resetForm])

  const handleEdit = useCallback((invoice: Invoice) => {
    setFormData({
      invoice_no: invoice.invoice_no,
      date: invoice.date,
      party_id: invoice.party_id,
      payment_received: invoice.payment_received.toString(),
      round_off: invoice.round_off.toString(),
    })
    setInvoiceItems(invoice.items)
    setEditingInvoice(invoice)
    setIsFormOpen(true)
  }, [])

  const selectedParty = parties.find(p => p.id === formData.party_id)

  // Memoized columns for better performance
  const columns = useMemo(() => [
    { key: "invoice_no", label: "Invoice No", render: (value: string) => <span className="font-medium">{value}</span> },
    { key: "date", label: "Date", render: (value: string) => new Date(value).toLocaleDateString() },
    { key: "party_name", label: "Party Name" },
    { key: "net_total", label: "Net Total", render: (value: number) => `₹${value.toLocaleString()}` },
    { key: "balance_due", label: "Balance Due", render: (value: number) => `₹${value.toLocaleString()}` },
    { 
      key: "status", 
      label: "Status", 
      render: (value: any, row: Invoice) => (
        <Badge variant={row.balance_due <= 0 ? "default" : "secondary"}>
          {row.balance_due <= 0 ? "Paid" : "Pending"}
        </Badge>
      )
    },
  ], [])

  const actions = useCallback((invoice: Invoice) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={() => handleEdit(invoice)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => window.open(`/print?id=${invoice.id}`, '_blank')}>
        <FileText className="h-4 w-4" />
      </Button>
    </div>
  ), [handleEdit])

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="h-8 w-8 text-blue-600" />
              Sales Entry
            </h1>
            <p className="text-gray-600 mt-1">Create and manage sales invoices</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} disabled={saving} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            New Invoice
          </Button>
        </div>

        {/* Form */}
        {isFormOpen && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {editingInvoice ? "Edit Sales Invoice" : "Create New Invoice"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Business Header */}
                {business && (
                  <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-8 w-8" />
                          <div>
                            <h2 className="text-2xl font-bold">{business.name}</h2>
                            <p className="text-blue-100 mt-1">
                              {business.address}, {business.city}, {business.state} - {business.pincode}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-blue-100">
                          <p>Phone: {business.phone}</p>
                          <p>Email: {business.email}</p>
                          {business.gstin && <p>GSTIN: {business.gstin}</p>}
                          {business.pan && <p>PAN: {business.pan}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Invoice Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="invoice_no" className="text-sm font-medium">Invoice Number *</Label>
                    <Input
                      id="invoice_no"
                      required
                      value={formData.invoice_no}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date" className="text-sm font-medium">Invoice Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="party_id" className="text-sm font-medium">Customer *</Label>
                    <Select
                      value={formData.party_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, party_id: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {parties.map((party) => (
                          <SelectItem key={party.id} value={party.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{party.name}</span>
                              <span className="text-xs text-gray-500">{party.city}, {party.state}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Customer Details */}
                {selectedParty && (
                  <Card className="bg-gray-50 border-dashed">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-gray-700">Bill To:</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{selectedParty.name}</p>
                          <p className="text-gray-600 mt-1">{selectedParty.address}</p>
                          <p className="text-gray-600">{selectedParty.city}, {selectedParty.state}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">GSTIN:</span>
                          <p className="text-gray-600">{selectedParty.gstin || "Not provided"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                {/* Add Items Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add Items
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">Item *</Label>
                      <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={itemSearchOpen}
                            className="w-full justify-between mt-1"
                          >
                            {currentItem.item_id
                              ? items.find(item => item.id === currentItem.item_id)?.name
                              : "Select item..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Search items..." 
                              value={itemSearchValue}
                              onValueChange={setItemSearchValue}
                            />
                            <CommandList>
                              <CommandEmpty>No item found.</CommandEmpty>
                              <CommandGroup>
                                {filteredItems.map((item) => (
                                  <CommandItem
                                    key={item.id}
                                    value={item.id}
                                    onSelect={() => {
                                      setCurrentItem(prev => ({ 
                                        ...prev, 
                                        item_id: item.id, 
                                        rate: item.sales_price.toString()
                                      }))
                                      setItemSearchOpen(false)
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{item.name}</span>
                                      <span className="text-xs text-gray-500">
                                        {item.code} | ₹{item.sales_price} | {item.unit}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Quantity *</Label>
                      <Input
                        type="text"
                        placeholder="1"
                        value={currentItem.qty}
                        onChange={(e) => setCurrentItem(prev => ({ ...prev, qty: e.target.value }))
                        }
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Rate *</Label>
                      <Input
                        type="text"
                        placeholder="0.00"
                        value={currentItem.rate}
                        onChange={(e) => setCurrentItem(prev => ({ ...prev, rate: e.target.value }))
                        }
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        onClick={addItemToInvoice} 
                        disabled={!currentItem.item_id || saving}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                {invoiceItems.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Invoice Items</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead className="w-[300px]">Item Details</TableHead>
                            <TableHead>HSN</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>GST</TableHead>
                            <TableHead>Tax Amount</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead className="w-[100px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{item.item_name}</span>
                                  <span className="text-xs text-gray-500">{item.item_code}</span>
                                </div>
                              </TableCell>
                              <TableCell>{item.hsn}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="text"
                                    value={item.qty}
                                    onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                                    className="w-16 text-center"
                                  />
                                  <span className="text-xs text-gray-500">{item.unit}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  value={item.rate}
                                  onChange={(e) => updateItemRate(item.id, e.target.value)}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.gst_percent}%</Badge>
                              </TableCell>
                              <TableCell>₹{item.tax_amount.toFixed(2)}</TableCell>
                              <TableCell>
                                <span className="font-medium">₹{item.total.toFixed(2)}</span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItemFromInvoice(item.id)}
                                  disabled={saving}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Invoice Summary */}
                    <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex justify-between">
                              <span className="font-medium">Subtotal:</span>
                              <span>₹{totals.subTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Total Tax:</span>
                              <span>₹{totals.totalTax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <Label htmlFor="round_off" className="font-medium">Round Off:</Label>
                              <Input
                                id="round_off"
                                type="text"
                                placeholder="0.00"
                                value={formData.round_off}
                                onChange={(e) => setFormData(prev => ({ ...prev, round_off: e.target.value }))}
                                className="w-24 text-right"
                              />
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                              <span>Net Total:</span>
                              <span>₹{totals.netTotal.toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="payment_received" className="font-medium">Payment Received:</Label>
                              <Input
                                id="payment_received"
                                type="text"
                                placeholder="0.00"
                                value={formData.payment_received}
                                onChange={(e) => setFormData(prev => ({ ...prev, payment_received: e.target.value }))}
                                className="w-32 text-right"
                              />
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                              <span>Balance Due:</span>
                              <span className={totals.balanceDue > 0 ? "text-red-600" : "text-green-600"}>
                                ₹{totals.balanceDue.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Terms and Conditions */}
                        {business?.terms_conditions && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <h4 className="font-medium text-gray-700 mb-2">Terms & Conditions:</h4>
                            <p className="text-sm text-gray-600 whitespace-pre-line">
                              {business.terms_conditions}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={invoiceItems.length === 0 || saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingInvoice ? "Update" : "Create"} Invoice
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={invoices}
              columns={columns}
              title=""
              searchKeys={["invoice_no", "party_name"]}
              actions={actions}
            />
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}