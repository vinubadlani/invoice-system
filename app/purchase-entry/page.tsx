"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { fetchParties, fetchItems, insertData, getCurrentUser, updateData, getSupabaseClient } from "@/lib/supabase"
import { useOptimizedData } from "@/lib/cache-store"
import { Plus, Trash2, Save, Package, Calendar, User, MapPin, FileText, Calculator, DollarSign, Loader2, RefreshCw, CreditCard, Upload, Download, CheckCircle, XCircle, AlertCircle, AlertTriangle, Edit } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import * as Papa from "papaparse"

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

interface BulkPurchaseRow {
  id: string
  invoice_number: string
  invoice_date: string
  party_name: string
  party_id?: string
  state: string
  address: string
  gstin: string
  item_name: string
  item_id?: string
  hsn_code: string
  quantity: number
  rate: number
  gst_percent: number
  gst_amount: number
  total_amount: number
  payment_received: number
  payment_method: string
  notes: string
  errors: string[]
  status: 'valid' | 'warning' | 'error'
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

  // Bulk upload states
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)
  
  // Bulk upload table states
  const [bulkData, setBulkData] = useState<BulkPurchaseRow[]>([])
  const [showBulkTable, setShowBulkTable] = useState(false)
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null)

  // Use optimized data fetching
  const { fetchParties: fetchOptimizedParties, fetchItems: fetchOptimizedItems } = useOptimizedData()
  
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

      // Use optimized data fetching
      const [partiesData, itemsData] = await Promise.all([
        fetchOptimizedParties(businessId),
        fetchOptimizedItems(businessId)
      ])

      // Filter parties to show only Creditors (suppliers)
      const creditorParties = partiesData.filter((p: Party) => p.type === "Creditor")
      setParties(creditorParties)
      setItems(itemsData)
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
          } else if (typeof invoice.items === 'object' && (invoice.items as any).items) {
            // New format - items is an object with payment_mode and items
            const itemsObj = invoice.items as any
            extractedPaymentMode = itemsObj.payment_mode || "Cash"
            extractedItems = itemsObj.items || []
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

  // Bulk upload functions
  const downloadPurchaseTemplate = () => {
    const csvContent = "invoice_number,invoice_date,party_name,state,address,gstin,item_name,hsn_code,quantity,rate,gst_percent,gst_amount,total_amount,payment_received,payment_method,notes\n"
      + "PUR001,2024-01-15,ABC Suppliers,Maharashtra,123 Supplier St Mumbai,27ABCDE1234F1Z5,Sample Product,1234,10,100,18,180,1180,500,Cash,Sample purchase entry\n"
    
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "purchase_bulk_upload_template.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (file: File) => {
    if (!businessId) {
      toast({
        title: "Error",
        description: "Please select a business before uploading files.",
        variant: "destructive"
      })
      return
    }

    try {
      const text = await file.text()
      
      // Parse CSV using Papa Parse
      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase().replace(/['"]/g, ''),
        transform: (value: string) => value.trim().replace(/['"]/g, '')
      })
      
      if (parseResult.errors.length > 0) {
        toast({
          title: "CSV parsing error",
          description: parseResult.errors[0].message,
          variant: "destructive"
        })
        return
      }
      
      const csvData = parseResult.data as any[]
      
      if (csvData.length === 0) {
        toast({
          title: "Empty file",
          description: "CSV file is empty or has no data rows.",
          variant: "destructive"
        })
        return
      }

      // Convert CSV data to BulkPurchaseRow format
      const tableData: BulkPurchaseRow[] = csvData.map((row, index) => ({
        id: `row-${Date.now()}-${index}`,
        invoice_number: row.invoice_number || row.invoice_no || `PUR-${Date.now()}-${index}`,
        invoice_date: row.invoice_date || row.date || new Date().toISOString().split('T')[0],
        party_name: row.party_name || '',
        party_id: undefined,
        state: row.state || '',
        address: row.address || '',
        gstin: row.gstin || '',
        item_name: row.item_name || '',
        item_id: undefined,
        hsn_code: row.hsn_code || '',
        quantity: parseFloat(row.quantity || '1'),
        rate: parseFloat(row.rate || '0'),
        gst_percent: parseFloat(row.gst_percent || '18'),
        gst_amount: parseFloat(row.gst_amount || '0'),
        total_amount: parseFloat(row.total_amount || row.amount || '0'),
        payment_received: parseFloat(row.payment_received || '0'),
        payment_method: row.payment_method || 'Cash',
        notes: row.notes || '',
        errors: [],
        status: 'valid' as const
      }))

      // Validate and auto-calculate missing values
      const validatedData = tableData.map(row => {
        const errors: string[] = []
        
        if (!row.invoice_number) errors.push('Invoice number required')
        if (!row.party_name) errors.push('Party name required')
        if (!row.item_name) errors.push('Item name required')
        if (row.quantity <= 0) errors.push('Quantity must be greater than 0')
        if (row.rate < 0) errors.push('Rate cannot be negative')
        
        // Auto-calculate if not provided
        if (row.gst_amount === 0 && row.rate > 0 && row.quantity > 0) {
          const subtotal = row.quantity * row.rate
          row.gst_amount = (subtotal * row.gst_percent) / 100
        }
        
        if (row.total_amount === 0 && row.rate > 0 && row.quantity > 0) {
          const subtotal = row.quantity * row.rate
          row.total_amount = subtotal + row.gst_amount
        }

        // Match existing parties and items
        const matchedParty = parties.find(p => 
          p.name.toLowerCase() === row.party_name.toLowerCase()
        )
        if (matchedParty) {
          row.party_id = matchedParty.id
          row.state = row.state || matchedParty.state || ''
          row.address = row.address || matchedParty.address || ''
          row.gstin = row.gstin || matchedParty.gstin || ''
        }

        const matchedItem = items.find(item => 
          item.name.toLowerCase() === row.item_name.toLowerCase()
        )
        if (matchedItem) {
          row.item_id = matchedItem.id
          row.hsn_code = row.hsn_code || matchedItem.hsn_code || ''
          row.gst_percent = row.gst_percent || matchedItem.gst_percent || 18
        }

        // Determine status based on errors
        const status: 'valid' | 'warning' | 'error' = 
          errors.some(e => e.includes('required') || e.includes('must be') || e.includes('cannot be')) ? 'error' :
          errors.length > 0 ? 'warning' : 'valid'

        return { ...row, errors, status }
      })

      setBulkData(validatedData)
      setShowBulkTable(true)
      setShowBulkUpload(false)
      
      toast({
        title: "File loaded successfully",
        description: `Loaded ${validatedData.length} rows for review and editing.`
      })
      
    } catch (error: any) {
      toast({
        title: "File upload error",
        description: error.message || 'Please try again.',
        variant: "destructive"
      })
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        handleFileUpload(file)
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV file.",
          variant: "destructive"
        })
      }
    }
  }

  const addNewRow = () => {
    const newRow: BulkPurchaseRow = {
      id: `row-${Date.now()}`,
      invoice_number: `PUR-${Date.now().toString().slice(-6)}`,
      invoice_date: new Date().toISOString().split('T')[0],
      party_name: '',
      party_id: undefined,
      state: '',
      address: '',
      gstin: '',
      item_name: '',
      item_id: undefined,
      hsn_code: '',
      quantity: 1,
      rate: 0,
      gst_percent: 18,
      gst_amount: 0,
      total_amount: 0,
      payment_received: 0,
      payment_method: 'Cash',
      notes: '',
      errors: [],
      status: 'valid' as const
    }
    setBulkData([...bulkData, newRow])
  }

  const deleteRow = (rowId: string) => {
    setBulkData(bulkData.filter(row => row.id !== rowId))
  }

  const updateCell = (rowId: string, field: keyof BulkPurchaseRow, value: any) => {
    setBulkData(prevData => 
      prevData.map(row => {
        if (row.id !== rowId) return row
        
        const updatedRow = { ...row, [field]: value }
        
        // Auto-calculate dependent fields
        if (field === 'quantity' || field === 'rate' || field === 'gst_percent') {
          const quantity = field === 'quantity' ? parseFloat(value) || 0 : updatedRow.quantity
          const rate = field === 'rate' ? parseFloat(value) || 0 : updatedRow.rate
          const gstPercent = field === 'gst_percent' ? parseFloat(value) || 0 : updatedRow.gst_percent
          
          const subtotal = quantity * rate
          updatedRow.gst_amount = (subtotal * gstPercent) / 100
          updatedRow.total_amount = subtotal + updatedRow.gst_amount
        }

        // Update party-related fields when party is selected
        if (field === 'party_name' || field === 'party_id') {
          let selectedParty: Party | undefined
          
          if (field === 'party_id') {
            selectedParty = parties.find(p => p.id === value)
            if (selectedParty) {
              updatedRow.party_name = selectedParty.name
            }
          } else {
            selectedParty = parties.find(p => 
              p.name.toLowerCase() === (value as string).toLowerCase()
            )
            if (selectedParty) {
              updatedRow.party_id = selectedParty.id
            }
          }
          
          if (selectedParty) {
            updatedRow.state = selectedParty.state || ''
            updatedRow.address = selectedParty.address || ''
            updatedRow.gstin = selectedParty.gstin || ''
          }
        }

        // Update item-related fields when item is selected
        if (field === 'item_name' || field === 'item_id') {
          let selectedItem: Item | undefined
          
          if (field === 'item_id') {
            selectedItem = items.find(i => i.id === value)
            if (selectedItem) {
              updatedRow.item_name = selectedItem.name
            }
          } else {
            selectedItem = items.find(i => 
              i.name.toLowerCase() === (value as string).toLowerCase()
            )
            if (selectedItem) {
              updatedRow.item_id = selectedItem.id
            }
          }
          
          if (selectedItem) {
            updatedRow.hsn_code = selectedItem.hsn_code || ''
            updatedRow.gst_percent = selectedItem.gst_percent || 18
            updatedRow.rate = selectedItem.purchase_price || 0
            
            // Recalculate amounts
            const subtotal = updatedRow.quantity * updatedRow.rate
            updatedRow.gst_amount = (subtotal * updatedRow.gst_percent) / 100
            updatedRow.total_amount = subtotal + updatedRow.gst_amount
          }
        }

        return updatedRow
      })
    )
  }

  const submitBulkData = async () => {
    if (!businessId) {
      toast({
        title: "Error",
        description: "Please select a business before submitting.",
        variant: "destructive"
      })
      return
    }

    // Validate all rows - only submit valid and warning rows (not error rows)
    const validRows = bulkData.filter(row => row.status !== 'error')

    if (validRows.length === 0) {
      toast({
        title: "No valid rows",
        description: "Please fix all errors before submitting. All rows have critical errors.",
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const client = getSupabaseClient()
      if (!client) throw new Error("Service unavailable")

      let imported = 0
      const errorMessages: string[] = []

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i]
        setUploadProgress((i / validRows.length) * 90)

        try {
          // Create party if needed
          let selectedParty = parties.find(p => p.id === row.party_id)
          
          if (!selectedParty && row.party_name) {
            const newPartyData = {
              business_id: businessId,
              name: row.party_name,
              type: "Creditor",
              gstin: row.gstin || "",
              state: row.state || "",
              address: row.address || "",
              phone: "",
              email: "",
            }

            const { data: newParty, error: partyError } = await client
              .from('parties')
              .insert([newPartyData])
              .select()
              .single()

            if (!partyError) {
              selectedParty = newParty as unknown as Party
              setParties(prev => [...prev, selectedParty!])
            }
          }

          // Create item if needed
          let selectedItem = items.find(item => item.id === row.item_id)
          
          if (!selectedItem && row.item_name) {
            const newItemData = {
              business_id: businessId,
              name: row.item_name,
              code: `ITEM-${Date.now()}`,
              hsn_code: row.hsn_code || "",
              gst_percent: row.gst_percent,
              purchase_price: row.rate,
              sales_price: row.rate * 1.2,
              unit: "Pcs",
            }

            const { data: newItem, error: itemError } = await client
              .from('items')
              .insert([newItemData])
              .select()
              .single()

            if (!itemError) {
              selectedItem = {
                id: newItem.id as string,
                name: newItem.name as string,
                hsn_code: newItem.hsn_code as string,
                gst_percent: newItem.gst_percent as number,
                purchase_price: newItem.purchase_price as number,
                unit: newItem.unit as string
              }
              setItems(prev => [...prev, selectedItem!])
            }
          }

          // Create invoice
          const invoiceItems = [{
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            item_name: row.item_name,
            hsn_code: row.hsn_code,
            quantity: row.quantity,
            rate: row.rate,
            gst_percent: row.gst_percent,
            gst_amount: row.gst_amount,
            total_amount: row.total_amount
          }]

          const invoiceData = {
            business_id: businessId,
            invoice_no: row.invoice_number,
            date: row.invoice_date,
            party_name: selectedParty?.name || row.party_name,
            gstin: selectedParty?.gstin || row.gstin || "",
            state: selectedParty?.state || row.state || "",
            address: selectedParty?.address || row.address || "",
            type: "purchase" as const,
            total_tax: row.gst_amount,
            net_total: row.total_amount,
            payment_received: row.payment_received,
            balance_due: row.total_amount - row.payment_received,
            items: {
              payment_mode: row.payment_method,
              items: invoiceItems
            },
          }

          const { data: insertedData, error: insertError } = await client
            .from('invoices')
            .insert([invoiceData])
            .select()

          if (insertError) {
            errorMessages.push(`Row ${i + 1}: ${insertError.message}`)
          } else {
            // Auto-record payment if needed
            if (row.payment_received > 0 && insertedData[0]) {
              const paymentData = {
                business_id: businessId,
                party_name: selectedParty?.name || row.party_name,
                invoice_no: row.invoice_number,
                type: "Paid",
                amount: row.payment_received,
                mode: row.payment_method,
                date: row.invoice_date,
                remarks: `Auto-recorded from bulk upload for purchase ${row.invoice_number}`,
              }
              
              await client.from("payments").insert([paymentData])
            }
            
            imported++
          }
        } catch (error: any) {
          errorMessages.push(`Row ${i + 1}: ${error.message}`)
        }
      }

      setUploadProgress(100)
      
      toast({
        title: imported > 0 ? "Success" : "Failed", 
        description: `Successfully imported ${imported} of ${validRows.length} records.`,
        variant: imported > 0 ? "default" : "destructive"
      })

      if (imported > 0) {
        setBulkData([])
        setShowBulkTable(false)
        setShowBulkUpload(false)
      }

    } catch (error: any) {
      toast({
        title: "Bulk submit error",
        description: error.message || 'Please try again.',
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
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
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={() => setShowBulkUpload(true)} 
                    variant="outline" 
                    size="lg"
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Bulk Upload
                  </Button>
                  <div className="hidden lg:block">
                    <div className="w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center">
                      <Package className="w-16 h-16 text-white/80" />
                    </div>
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

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Upload className="h-6 w-6 text-blue-600" />
              Bulk Upload Purchase Invoices
            </DialogTitle>
            <p className="text-gray-600 mt-2">
              Upload CSV files to import multiple purchase invoices at once
            </p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-xl border border-emerald-200">
              <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                How it works:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-emerald-800">
                    <span className="bg-emerald-200 text-emerald-900 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">1</span>
                    <span>Download the template CSV file</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-emerald-800">
                    <span className="bg-emerald-200 text-emerald-900 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">2</span>
                    <span>Fill in your purchase data following the format</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-emerald-800">
                    <span className="bg-emerald-200 text-emerald-900 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">3</span>
                    <span>Upload the CSV to review in table format</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-emerald-800">
                    <span className="bg-emerald-200 text-emerald-900 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">4</span>
                    <span>Edit data, select parties/items, and import</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-emerald-100 rounded-lg">
                <p className="text-sm text-emerald-800 font-medium">
                  ✨ <strong>Auto-Creation:</strong> Missing parties and items will be created automatically during import!
                </p>
              </div>
            </div>

            {/* Template Download */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gradient-to-br from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 transition-all duration-200">
              <div className="bg-gray-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-10 w-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Download Template
              </h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                Get our pre-formatted CSV template with proper column headers and sample data to get started quickly
              </p>
              <Button 
                onClick={downloadPurchaseTemplate} 
                variant="outline"
                size="lg"
                className="border-2 border-gray-600 text-gray-600 hover:bg-gray-50 font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Purchase Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200">
              <div className="bg-blue-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Upload className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-blue-900 mb-2">
                Upload CSV File
              </h3>
              <p className="text-sm text-blue-700 mb-6 max-w-md mx-auto">
                Upload your CSV file to preview and edit data in table format before importing
              </p>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                  id="bulkFileInput"
                  disabled={uploading}
                />
                <label htmlFor="bulkFileInput">
                  <Button 
                    asChild 
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <span className="cursor-pointer">
                      <FileText className="h-5 w-5 mr-2" />
                      Choose CSV File
                    </span>
                  </Button>
                </label>
                <div className="text-xs text-blue-600">
                  Supported format: .csv files only
                </div>
                <div className="border-t border-blue-200 pt-4">
                  <Button 
                    onClick={() => {
                      setBulkData([])
                      addNewRow()
                      setShowBulkTable(true)
                      setShowBulkUpload(false)
                    }}
                    variant="outline"
                    size="lg"
                    className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-3 px-6 rounded-lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Start with Empty Table
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Table Dialog */}
      <Dialog open={showBulkTable} onOpenChange={setShowBulkTable}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-6 w-6 text-green-600" />
              Review & Edit Purchase Data
            </DialogTitle>
            <p className="text-gray-600 mt-2">
              Review your data, fix any errors, and select parties/items from dropdowns before importing
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <Button 
                  onClick={addNewRow}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
                <Button 
                  onClick={() => {
                    setShowBulkTable(false)
                    setShowBulkUpload(true)
                  }}
                  variant="outline"
                  size="sm"
                >
                  Back to Upload
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                {bulkData.filter(row => row.status === 'valid').length} valid, {' '}
                {bulkData.filter(row => row.status === 'warning').length} warnings, {' '}
                {bulkData.filter(row => row.status === 'error').length} errors
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-8">Status</TableHead>
                    <TableHead className="min-w-32">Invoice No</TableHead>
                    <TableHead className="min-w-32">Date</TableHead>
                    <TableHead className="min-w-48">Party</TableHead>
                    <TableHead className="min-w-48">Item</TableHead>
                    <TableHead className="min-w-20">Qty</TableHead>
                    <TableHead className="min-w-24">Rate</TableHead>
                    <TableHead className="min-w-20">GST%</TableHead>
                    <TableHead className="min-w-24">Total</TableHead>
                    <TableHead className="min-w-24">Payment</TableHead>
                    <TableHead className="w-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkData.map((row, index) => (
                    <TableRow key={row.id} className={row.status === 'error' ? 'bg-red-50' : row.status === 'warning' ? 'bg-yellow-50' : 'bg-green-50'}>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {row.status === 'error' && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {row.status === 'warning' && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          {row.status === 'valid' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.invoice_number}
                          onChange={(e) => updateCell(row.id, 'invoice_number', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.invoice_date}
                          onChange={(e) => updateCell(row.id, 'invoice_date', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.party_id || ''}
                          onValueChange={(value) => updateCell(row.id, 'party_id', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={row.party_name || "Select party"} />
                          </SelectTrigger>
                          <SelectContent>
                            {parties.map((party) => (
                              <SelectItem key={party.id} value={party.id}>
                                {party.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!row.party_id && row.party_name && (
                          <div className="text-xs text-orange-600 mt-1">Will create: {row.party_name}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.item_id || ''}
                          onValueChange={(value) => updateCell(row.id, 'item_id', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={row.item_name || "Select item"} />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!row.item_id && row.item_name && (
                          <div className="text-xs text-orange-600 mt-1">Will create: {row.item_name}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => updateCell(row.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.rate}
                          onChange={(e) => updateCell(row.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.gst_percent}
                          onChange={(e) => updateCell(row.id, 'gst_percent', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">₹{row.total_amount.toFixed(2)}</div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.payment_received}
                          onChange={(e) => updateCell(row.id, 'payment_received', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => deleteRow(row.id)}
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Importing purchases...</span>
                  <span className="text-sm text-gray-500">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Upload Result */}
            {uploadResult && (
              <Alert className={`mt-4 ${uploadResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                {uploadResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={uploadResult.success ? 'text-green-800' : 'text-red-800'}>
                  {uploadResult.message}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkTable(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitBulkData}
                disabled={uploading || bulkData.filter(row => row.status !== 'error').length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {bulkData.filter(row => row.status !== 'error').length} Purchases
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  )
}
