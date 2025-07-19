"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useOptimizedData } from "@/lib/cache-store"
import { Plus, Edit, Trash2, Save, X, Loader2, Search, Calculator, Receipt, FileText, Building2, Printer, Eye, Copy, Share2, Download, Users, Package2, Calendar, MapPin, Phone, Mail, CreditCard, Percent, Hash, AlignLeft } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
      
      // Use cached data fetching - much faster!
      const [partiesData, itemsData, businessData, invoicesResult] = await Promise.all([
        fetchParties(businessId),
        fetchItems(businessId),
        fetchBusiness(businessId),
        supabase
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
      setInvoices(invoicesResult.data || [])
      
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
        result = await supabase
          .from("invoices")
          .update(invoiceData)
          .eq("id", editingInvoice.id)
          .select()
          .single()
      } else {
        result = await supabase
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
        setInvoices(prev => [result.data, ...prev.slice(0, 24)]) // Keep only 25 recent invoices
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
        <Printer className="h-4 w-4" />
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
      <div className="space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg">
                <Receipt className="h-8 w-8 text-white" />
              </div>
              Invoice Maker
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Create professional invoices in seconds</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </Button>
            <Button onClick={() => setIsFormOpen(true)} disabled={saving} size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2">
              <Plus className="h-5 w-5" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Sales</p>
                  <p className="text-2xl font-bold">₹2,45,000</p>
                </div>
                <Receipt className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">This Month</p>
                  <p className="text-2xl font-bold">₹45,000</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Pending</p>
                  <p className="text-2xl font-bold">₹15,000</p>
                </div>
                <CreditCard className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Invoices</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
                <FileText className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Creation Form */}
        {isFormOpen && (
          <div className="max-w-7xl mx-auto">
            <Card className="shadow-2xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <FileText className="h-6 w-6" />
                    {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-0">
                  {/* Invoice Header Section */}
                  <div className="bg-white dark:bg-gray-800 p-8 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Business Info */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-600 p-3 rounded-xl">
                            <Building2 className="h-8 w-8 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                              {business?.name || "Your Business Name"}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">Professional Invoice</p>
                          </div>
                        </div>
                        
                        {business && (
                          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <MapPin className="h-4 w-4" />
                              <span>{business.address}, {business.city}, {business.state} - {business.pincode}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Phone className="h-4 w-4" />
                              <span>{business.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Mail className="h-4 w-4" />
                              <span>{business.email}</span>
                            </div>
                            {business.gstin && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Hash className="h-4 w-4" />
                                <span>GSTIN: {business.gstin}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Invoice Details */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Invoice Details</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Number</Label>
                            <Input
                              value={formData.invoice_no}
                              onChange={(e) => setFormData(prev => ({ ...prev, invoice_no: e.target.value }))}
                              className="mt-1 bg-white dark:bg-gray-800"
                              placeholder="INV-001"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Date</Label>
                            <Input
                              type="date"
                              value={formData.date}
                              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                              className="mt-1 bg-white dark:bg-gray-800"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</Label>
                          <Input
                            type="date"
                            value={new Date(new Date(formData.date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                            className="mt-1 bg-white dark:bg-gray-800"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Selection */}
                  <div className="bg-white dark:bg-gray-800 p-8 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                      <Users className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bill To</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Customer</Label>
                        <Select
                          value={formData.party_id}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, party_id: value }))}
                        >
                          <SelectTrigger className="mt-1 h-12 bg-white dark:bg-gray-800">
                            <SelectValue placeholder="Choose a customer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {parties.map((party) => (
                              <SelectItem key={party.id} value={party.id}>
                                <div className="flex flex-col py-1">
                                  <span className="font-medium">{party.name}</span>
                                  <span className="text-xs text-gray-500">{party.city}, {party.state}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedParty && (
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{selectedParty.name}</h4>
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <p>{selectedParty.address}</p>
                            <p>{selectedParty.city}, {selectedParty.state}</p>
                            {selectedParty.gstin && <p>GSTIN: {selectedParty.gstin}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="bg-white dark:bg-gray-800 p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Package2 className="h-6 w-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Invoice Items</h3>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        {invoiceItems.length} items
                      </Badge>
                    </div>

                    {/* Add Item Row */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-6 rounded-xl mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item</Label>
                          <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between mt-1 h-10 bg-white dark:bg-gray-800"
                              >
                                {currentItem.item_id
                                  ? items.find(item => item.id === currentItem.item_id)?.name
                                  : "Search items..."}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0">
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
                                        className="cursor-pointer"
                                      >
                                        <div className="flex flex-col w-full">
                                          <span className="font-medium">{item.name}</span>
                                          <span className="text-xs text-gray-500">
                                            {item.code} • ₹{item.sales_price} • {item.unit}
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
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</Label>
                          <Input
                            type="number"
                            placeholder="1"
                            value={currentItem.qty}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, qty: e.target.value }))}
                            className="mt-1 bg-white dark:bg-gray-800"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rate</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={currentItem.rate}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, rate: e.target.value }))}
                            className="mt-1 bg-white dark:bg-gray-800"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount</Label>
                          <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded border text-sm font-medium">
                            ₹{((parseFloat(currentItem.qty) || 0) * (parseFloat(currentItem.rate) || 0)).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="flex items-end">
                          <Button 
                            type="button" 
                            onClick={addItemToInvoice} 
                            disabled={!currentItem.item_id || saving}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    {invoiceItems.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gray-50 dark:bg-gray-800">
                            <TableRow>
                              <TableHead className="w-[40%] font-semibold">Item Description</TableHead>
                              <TableHead className="text-center font-semibold">HSN</TableHead>
                              <TableHead className="text-center font-semibold">Qty</TableHead>
                              <TableHead className="text-right font-semibold">Rate</TableHead>
                              <TableHead className="text-center font-semibold">Tax %</TableHead>
                              <TableHead className="text-right font-semibold">Tax Amount</TableHead>
                              <TableHead className="text-right font-semibold">Total</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoiceItems.map((item, index) => (
                              <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{item.item_name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Code: {item.item_code}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">{item.hsn}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Input
                                      type="number"
                                      value={item.qty}
                                      onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                                      className="w-16 text-center text-xs"
                                    />
                                    <span className="text-xs text-gray-500">{item.unit}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.rate}
                                    onChange={(e) => updateItemRate(item.id, e.target.value)}
                                    className="w-20 text-right text-xs"
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                    {item.gst_percent}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">₹{item.tax_amount.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                                  ₹{item.total.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItemFromInvoice(item.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Invoice Summary */}
                    {invoiceItems.length > 0 && (
                      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <AlignLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Additional Information</h4>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</Label>
                            <Textarea
                              placeholder="Add any additional notes or terms..."
                              className="mt-1 bg-white dark:bg-gray-800"
                              rows={3}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Send Email Invoice</Label>
                            <Switch />
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            Invoice Summary
                          </h4>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                              <span className="font-medium">₹{totals.subTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Tax Total:</span>
                              <span className="font-medium">₹{totals.totalTax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Round Off:</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.round_off}
                                onChange={(e) => setFormData(prev => ({ ...prev, round_off: e.target.value }))}
                                className="w-20 text-right text-xs"
                              />
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold text-blue-600 dark:text-blue-400">
                              <span>Total Amount:</span>
                              <span>₹{totals.netTotal.toFixed(2)}</span>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                              <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">Payment Received:</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={formData.payment_received}
                                  onChange={(e) => setFormData(prev => ({ ...prev, payment_received: e.target.value }))}
                                  className="w-24 text-right text-xs"
                                />
                              </div>
                              <div className="flex justify-between font-bold">
                                <span className="text-gray-700 dark:text-gray-300">Balance Due:</span>
                                <span className={`${totals.balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                  ₹{totals.balanceDue.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between">
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" size="lg" className="gap-2">
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                        <Button type="button" variant="outline" size="lg" className="gap-2">
                          <Download className="h-4 w-4" />
                          Save as Draft
                        </Button>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={resetForm} disabled={saving} size="lg">
                          Cancel
                        </Button>
                        <Button type="submit" disabled={invoiceItems.length === 0 || saving} size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2">
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              {editingInvoice ? "Update" : "Create"} Invoice
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Invoices */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Receipt className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
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