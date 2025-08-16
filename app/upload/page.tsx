"use client"

import { useState, useCallback, useEffect } from "react"
import Papa from "papaparse"
import { supabase, getSupabaseClient } from "@/lib/supabase"
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle, Users, Package, Receipt, CreditCard, TrendingUp, DollarSign, ShoppingCart, Building2, Plus, Edit2, Check, Trash2, Eye, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"

interface UploadResult {
  success: boolean
  message: string
  details?: any
}

interface ReviewData {
  type: string
  headers: string[]
  rows: ReviewRow[]
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
}

interface ReviewRow {
  id: string
  original: any
  edited: any
  errors: string[]
  warnings: string[]
  isEditing: boolean
  type: string
}

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [businessId, setBusinessId] = useState<string>("")
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [existingParties, setExistingParties] = useState<any[]>([])
  const [existingItems, setExistingItems] = useState<any[]>([])
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadExistingData(business.id)
    }
  }, [])

  const loadExistingData = async (businessId: string) => {
    try {
      const client = getSupabaseClient()
      if (!client) return

      // Load existing parties
      const { data: parties } = await client
        .from('parties')
        .select('id, name, type')
        .eq('business_id', businessId)
      
      // Load existing items
      const { data: items } = await client
        .from('items')
        .select('id, name, sales_price')
        .eq('business_id', businessId)

      setExistingParties(parties || [])
      setExistingItems(items || [])
    } catch (error) {
      console.error("Error loading existing data:", error)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (!businessId) {
      setUploadResult({
        success: false,
        message: "No business selected. Please select a business first."
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    try {
      if (file.type === "application/json") {
        await handleJsonUpload(file)
      } else if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        await handleCsvUpload(file)
      } else {
        setUploadResult({
          success: false,
          message: "Unsupported file type. Please upload JSON or CSV files."
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadResult({
        success: false,
        message: "Upload failed. Please try again."
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleJsonUpload = async (file: File) => {
    const text = await file.text()
    const data = JSON.parse(text)

    const client = getSupabaseClient()
    if (!client) {
      setUploadResult({
        success: false,
        message: "Service temporarily unavailable. Please try again later."
      })
      return
    }

    let imported = {
      parties: 0,
      items: 0,
      invoices: 0,
      payments: 0,
      sales: 0,
      purchases: 0,
      expenses: 0
    }

    // Import parties
    if (data.parties && Array.isArray(data.parties)) {
      setUploadProgress(25)
      for (const party of data.parties) {
        try {
          await client.from("parties").insert([{
            ...party,
            business_id: businessId,
            id: undefined // Let Supabase generate new ID
          }])
          imported.parties++
        } catch (error) {
          console.error("Error importing party:", error)
        }
      }
    }

    // Import items
    if (data.items && Array.isArray(data.items)) {
      setUploadProgress(50)
      for (const item of data.items) {
        try {
          await client.from("items").insert([{
            ...item,
            business_id: businessId,
            id: undefined
          }])
          imported.items++
        } catch (error) {
          console.error("Error importing item:", error)
        }
      }
    }

    // Import invoices
    if (data.invoices && Array.isArray(data.invoices)) {
      setUploadProgress(75)
      for (const invoice of data.invoices) {
        try {
          await client.from("invoices").insert([{
            ...invoice,
            business_id: businessId,
            id: undefined
          }])
          imported.invoices++
        } catch (error) {
          console.error("Error importing invoice:", error)
        }
      }
    }

    // Import payments
    if (data.payments && Array.isArray(data.payments)) {
      setUploadProgress(75)
      for (const payment of data.payments) {
        try {
          await client.from("payments").insert([{
            ...payment,
            business_id: businessId,
            id: undefined
          }])
          imported.payments++
        } catch (error) {
          console.error("Error importing payment:", error)
        }
      }
    }

    // Import sales
    if (data.sales && Array.isArray(data.sales)) {
      setUploadProgress(80)
      for (const sale of data.sales) {
        try {
          await client.from("sales").insert([{
            ...sale,
            business_id: businessId,
            id: undefined
          }])
          imported.sales++
        } catch (error) {
          console.error("Error importing sale:", error)
        }
      }
    }

    // Import purchases
    if (data.purchases && Array.isArray(data.purchases)) {
      setUploadProgress(85)
      for (const purchase of data.purchases) {
        try {
          await client.from("purchases").insert([{
            ...purchase,
            business_id: businessId,
            id: undefined
          }])
          imported.purchases++
        } catch (error) {
          console.error("Error importing purchase:", error)
        }
      }
    }

    // Import expenses
    if (data.expenses && Array.isArray(data.expenses)) {
      setUploadProgress(90)
      for (const expense of data.expenses) {
        try {
          await client.from("expenses").insert([{
            ...expense,
            business_id: businessId,
            id: undefined
          }])
          imported.expenses++
        } catch (error) {
          console.error("Error importing expense:", error)
        }
      }
    }

    setUploadProgress(100)
    setUploadResult({
      success: true,
      message: "Data imported successfully!",
      details: imported
    })
  }

  const handleCsvUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(25)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setUploadProgress(50)
        const data = results.data as any[]
        
        if (data.length === 0) {
          setUploadResult({
            success: false,
            message: "CSV file is empty or has no valid data."
          })
          setUploading(false)
          return
        }

        // Detect CSV type based on headers
        const headers = Object.keys(data[0])
        const type = detectCsvType(headers)
        
        if (type === 'unknown') {
          setUploadResult({
            success: false,
            message: "Unable to detect CSV format. Please check the column headers."
          })
          setUploading(false)
          return
        }

        setUploadProgress(75)
        
        // Process and validate data
        const processedData = processDataForReview(data, type, headers)
        setReviewData(processedData)
        setShowReviewDialog(true)
        setUploadProgress(100)
        setUploading(false)
      },
      error: (error) => {
        console.error("CSV parsing error:", error)
        setUploadResult({
          success: false,
          message: "Error parsing CSV file. Please check the file format."
        })
        setUploading(false)
      }
    })
  }

  const detectCsvType = (headers: string[]): string => {
    const headerSet = new Set(headers.map(h => h.toLowerCase().trim()))
    
    if (headerSet.has('name') && headerSet.has('mobile')) {
      return 'parties'
    } else if (headerSet.has('name') && headerSet.has('sales_price')) {
      return 'items'
    } else if (headerSet.has('invoice_number') && headerSet.has('party_name') && headerSet.has('payment_received')) {
      return 'sales-entry'
    } else if (headerSet.has('invoice_number') && headerSet.has('party_name')) {
      return 'sales'
    } else if (headerSet.has('bill_number') && headerSet.has('supplier_name')) {
      return 'purchases'
    } else if (headerSet.has('description') && headerSet.has('amount') && headerSet.has('category')) {
      return 'expenses'
    }
    return 'unknown'
  }

  const processDataForReview = (data: any[], type: string, headers: string[]): ReviewData => {
    const rows: ReviewRow[] = data.map((row, index) => {
      const rowData: ReviewRow = {
        id: `row-${index}`,
        original: row,
        edited: { ...row },
        errors: [],
        warnings: [],
        isEditing: false,
        type: type
      }

      // Validate the row
      const validation = validateRow(row, type)
      rowData.errors = validation.errors
      rowData.warnings = validation.warnings

      return rowData
    })

    const errorRows = rows.filter(row => row.errors.length > 0).length
    const warningRows = rows.filter(row => row.warnings.length > 0 && row.errors.length === 0).length
    const validRows = rows.length - errorRows

    return {
      type,
      headers,
      rows,
      totalRows: rows.length,
      validRows,
      errorRows,
      warningRows
    }
  }

  const validateRow = (row: any, type: string) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (type === 'parties') {
      if (!row.name?.trim()) errors.push('Name is required')
      if (!row.type?.trim()) errors.push('Type is required')
      if (row.mobile && !/^\d{10}$/.test(row.mobile.replace(/\D/g, ''))) {
        warnings.push('Mobile number should be 10 digits')
      }
    } else if (type === 'items') {
      if (!row.name?.trim()) errors.push('Name is required')
      if (!row.sales_price || isNaN(parseFloat(row.sales_price))) {
        errors.push('Valid sales price is required')
      }
    } else if (type === 'sales' || type === 'sales-entry') {
      if (!row.invoice_number?.trim()) errors.push('Invoice number is required')
      if (!row.party_name?.trim()) errors.push('Party name is required')
      if (!row.item_name?.trim()) errors.push('Item name is required')
      if (!row.amount || isNaN(parseFloat(row.amount))) errors.push('Valid amount is required')
      
      // Check if party exists
      const partyExists = existingParties.find(p => 
        p.name.toLowerCase() === row.party_name?.toLowerCase()
      )
      if (!partyExists) {
        warnings.push(`Party "${row.party_name}" not found. Will be created as new customer.`)
      }

      // Check if item exists
      const itemExists = existingItems.find(i => 
        i.name.toLowerCase() === row.item_name?.toLowerCase()
      )
      if (!itemExists) {
        warnings.push(`Item "${row.item_name}" not found. Will be created with provided details.`)
      }
    } else if (type === 'purchases') {
      if (!row.bill_number?.trim()) errors.push('Bill number is required')
      if (!row.supplier_name?.trim()) errors.push('Supplier name is required')
      if (!row.item_name?.trim()) errors.push('Item name is required')
      if (!row.amount || isNaN(parseFloat(row.amount))) errors.push('Valid amount is required')

      // Check if supplier exists
      const supplierExists = existingParties.find(p => 
        p.name.toLowerCase() === row.supplier_name?.toLowerCase() && p.type === 'Supplier'
      )
      if (!supplierExists) {
        warnings.push(`Supplier "${row.supplier_name}" not found. Will be created as new supplier.`)
      }
    } else if (type === 'expenses') {
      if (!row.description?.trim()) errors.push('Description is required')
      if (!row.category?.trim()) errors.push('Category is required')
      if (!row.amount || isNaN(parseFloat(row.amount))) errors.push('Valid amount is required')
    }

    return { errors, warnings }
  }

  const handleRowEdit = (rowId: string, field: string, value: string) => {
    setReviewData(prev => {
      if (!prev) return prev
      
      return {
        ...prev,
        rows: prev.rows.map(row => {
          if (row.id === rowId) {
            const newEdited = { ...row.edited, [field]: value }
            const validation = validateRow(newEdited, row.type)
            return {
              ...row,
              edited: newEdited,
              errors: validation.errors,
              warnings: validation.warnings
            }
          }
          return row
        })
      }
    })
  }

  const toggleRowEdit = (rowId: string) => {
    setReviewData(prev => {
      if (!prev) return prev
      
      return {
        ...prev,
        rows: prev.rows.map(row => {
          if (row.id === rowId) {
            return { ...row, isEditing: !row.isEditing }
          }
          return row
        })
      }
    })
  }

  const handleCreateNewParty = async (name: string, type: string) => {
    try {
      const client = getSupabaseClient()
      if (!client) return false

      const { data, error } = await client
        .from('parties')
        .insert([{
          name,
          type,
          business_id: businessId,
          mobile: '',
          email: '',
          address: ''
        }])
        .select()

      if (error) throw error

      // Update existing parties list
      setExistingParties(prev => [...prev, { id: data[0].id, name, type }])
      
      toast({
        title: "Success",
        description: `${type} "${name}" created successfully`,
      })
      
      return true
    } catch (error) {
      console.error("Error creating party:", error)
      toast({
        title: "Error",
        description: "Failed to create party",
        variant: "destructive"
      })
      return false
    }
  }

  const handleCreateNewItem = async (name: string, salesPrice: number) => {
    try {
      const client = getSupabaseClient()
      if (!client) return false

      const { data, error } = await client
        .from('items')
        .insert([{
          name,
          sales_price: salesPrice,
          business_id: businessId,
          unit: 'Pcs',
          gst_percent: 18
        }])
        .select()

      if (error) throw error

      // Update existing items list
      setExistingItems(prev => [...prev, { id: data[0].id, name, sales_price: salesPrice }])
      
      toast({
        title: "Success",
        description: `Item "${name}" created successfully`,
      })
      
      return true
    } catch (error) {
      console.error("Error creating item:", error)
      toast({
        title: "Error",
        description: "Failed to create item",
        variant: "destructive"
      })
      return false
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewData) return

    const validRows = reviewData.rows.filter(row => row.errors.length === 0)
    
    if (validRows.length === 0) {
      toast({
        title: "No Valid Data",
        description: "Please fix all errors before submitting",
        variant: "destructive"
      })
      return
    }

    setProcessing(true)

    try {
      const client = getSupabaseClient()
      if (!client) throw new Error("Database connection unavailable")

      let imported = 0

      for (const row of validRows) {
        try {
          if (reviewData.type === 'parties') {
            await client.from("parties").insert([{
              ...row.edited,
              business_id: businessId,
              opening_balance: parseFloat(row.edited.opening_balance) || 0
            }])
          } else if (reviewData.type === 'items') {
            await client.from("items").insert([{
              ...row.edited,
              business_id: businessId,
              sales_price: parseFloat(row.edited.sales_price) || 0,
              purchase_price: parseFloat(row.edited.purchase_price) || 0,
              gst_percent: parseFloat(row.edited.gst_percent) || 18,
              opening_stock: parseFloat(row.edited.opening_stock) || 0
            }])
          } else if (reviewData.type === 'sales-entry') {
            // Insert into invoices table for sales-entry
            const invoiceData = {
              invoice_no: row.edited.invoice_number,
              date: row.edited.invoice_date || new Date().toISOString().split('T')[0],
              party_name: row.edited.party_name,
              items: [{
                name: row.edited.item_name,
                quantity: parseFloat(row.edited.quantity) || 1,
                rate: parseFloat(row.edited.rate) || 0,
                amount: parseFloat(row.edited.amount) || 0
              }],
              subtotal: parseFloat(row.edited.amount) || 0,
              gst_amount: parseFloat(row.edited.gst_amount) || 0,
              net_total: parseFloat(row.edited.total_amount) || 0,
              payment_mode: row.edited.payment_mode || 'Cash',
              payment_received: parseFloat(row.edited.payment_received) || 0,
              balance_due: (parseFloat(row.edited.total_amount) || 0) - (parseFloat(row.edited.payment_received) || 0),
              status: (parseFloat(row.edited.payment_received) || 0) >= (parseFloat(row.edited.total_amount) || 0) ? 'paid' : 'pending',
              notes: row.edited.notes || '',
              business_id: businessId,
              type: 'sales'
            }

            await client.from("invoices").insert([invoiceData])
          } else if (reviewData.type === 'sales') {
            await client.from("sales").insert([{
              ...row.edited,
              business_id: businessId,
              amount: parseFloat(row.edited.amount) || 0,
              gst_amount: parseFloat(row.edited.gst_amount) || 0,
              total_amount: parseFloat(row.edited.total_amount) || 0,
              quantity: parseFloat(row.edited.quantity) || 0,
              rate: parseFloat(row.edited.rate) || 0,
              invoice_date: row.edited.invoice_date || new Date().toISOString().split('T')[0]
            }])
          } else if (reviewData.type === 'purchases') {
            await client.from("purchases").insert([{
              ...row.edited,
              business_id: businessId,
              amount: parseFloat(row.edited.amount) || 0,
              gst_amount: parseFloat(row.edited.gst_amount) || 0,
              total_amount: parseFloat(row.edited.total_amount) || 0,
              quantity: parseFloat(row.edited.quantity) || 0,
              rate: parseFloat(row.edited.rate) || 0,
              bill_date: row.edited.bill_date || new Date().toISOString().split('T')[0]
            }])
          } else if (reviewData.type === 'expenses') {
            await client.from("expenses").insert([{
              ...row.edited,
              business_id: businessId,
              amount: parseFloat(row.edited.amount) || 0,
              gst_amount: parseFloat(row.edited.gst_amount) || 0,
              expense_date: row.edited.expense_date || new Date().toISOString().split('T')[0]
            }])
          }
          imported++
        } catch (error) {
          console.error("Error importing row:", error)
        }
      }

      setUploadResult({
        success: true,
        message: `Successfully imported ${imported} ${reviewData.type} records!`,
        details: { [reviewData.type]: imported }
      })

      setShowReviewDialog(false)
      setReviewData(null)

      toast({
        title: "Import Successful",
        description: `${imported} records have been imported successfully`,
      })

    } catch (error) {
      console.error("Import error:", error)
      toast({
        title: "Import Failed",
        description: "An error occurred while importing data",
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  const downloadTemplate = (type: string) => {
    let csvContent = ""
    let filename = ""

    if (type === 'parties') {
      csvContent = "name,mobile,email,gstin,pan,type,opening_balance,balance_type,address,city,state,pincode\n"
      csvContent += "Sample Party,9876543210,party@example.com,27ABCDE1234F1Z5,ABCDE1234F,Debtor,5000,To Collect,123 Main St,Mumbai,Maharashtra,400001\n"
      filename = "parties_template.csv"
    } else if (type === 'items') {
      csvContent = "name,code,hsn_code,gst_percent,unit,sales_price,purchase_price,opening_stock,description\n"
      csvContent += "Sample Item,ITM001,1234,18,Pcs,100,80,50,Sample item description\n"
      filename = "items_template.csv"
    } else if (type === 'sales') {
      csvContent = "invoice_number,invoice_date,party_name,item_name,quantity,rate,amount,gst_amount,total_amount,payment_mode,notes\n"
      csvContent += "INV001,2024-01-15,ABC Company,Sample Product,10,100,1000,180,1180,Cash,Sample sales entry\n"
      filename = "sales_template.csv"
    } else if (type === 'purchases') {
      csvContent = "bill_number,bill_date,supplier_name,item_name,quantity,rate,amount,gst_amount,total_amount,payment_mode,notes\n"
      csvContent += "BILL001,2024-01-15,XYZ Supplier,Raw Material,20,50,1000,180,1180,Credit,Sample purchase entry\n"
      filename = "purchases_template.csv"
    } else if (type === 'expenses') {
      csvContent = "expense_date,description,category,amount,gst_amount,payment_mode,vendor,notes\n"
      csvContent += "2024-01-15,Office Rent,Rent,15000,0,Bank Transfer,Property Owner,Monthly office rent\n"
      filename = "expenses_template.csv"
    } else if (type === 'sales-entry') {
      csvContent = "invoice_number,invoice_date,party_name,item_name,quantity,rate,amount,gst_amount,total_amount,payment_mode,payment_received,notes\n"
      csvContent += "INV001,2024-01-15,ABC Company,Sample Product,10,100,1000,180,1180,Cash,1180,Sample sales entry with payment\n"
      filename = "sales_entry_template.csv"
    }

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Upload className="h-8 w-8 text-blue-600" />
            Upload Data
          </h1>
          <div className="text-sm text-gray-500">
            Import your business data efficiently
          </div>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upload" className="flex items-center gap-2 text-base py-3">
              <Upload className="h-5 w-5" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2 text-base py-3">
              <Download className="h-5 w-5" />
              Download Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center text-xl">
                  <Upload className="h-6 w-6 mr-3 text-blue-600" />
                  Upload Data Files
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Drag and drop your CSV or JSON files to import data into your system
                </p>
              </CardHeader>
              <CardContent className="p-8">
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                    dragActive
                      ? "border-blue-500 bg-blue-50 scale-[1.02] shadow-lg"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Upload className={`mx-auto h-16 w-16 transition-colors ${dragActive ? 'text-blue-600' : 'text-blue-500'}`} />
                      {dragActive && (
                        <div className="absolute inset-0 animate-ping">
                          <Upload className="h-16 w-16 text-blue-400 opacity-75" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-gray-900 mb-2">
                        {dragActive ? "Drop your files here" : "Drag and drop your files here"}
                      </p>
                      <p className="text-base text-gray-600 mb-6">
                        or click to select files from your computer
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                    id="fileInput"
                  />
                  <label htmlFor="fileInput">
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all">
                      <span className="flex items-center gap-3 cursor-pointer">
                        <FileText className="h-5 w-5" />
                        Select Files
                      </span>
                    </Button>
                  </label>
                  <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Supported formats: <strong>JSON, CSV</strong></span>
                  </div>
                </div>

                {uploading && (
                  <div className="mt-6 bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-medium flex items-center gap-3 text-blue-800">
                        <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                        Uploading and Processing...
                      </span>
                      <span className="text-base font-semibold text-blue-700">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full h-3" />
                    <p className="text-sm text-blue-600 mt-2">Please wait while we process your file...</p>
                  </div>
                )}

                {uploadResult && (
                  <Alert className={`mt-4 ${uploadResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    {uploadResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={uploadResult.success ? 'text-green-800' : 'text-red-800'}>
                      {uploadResult.message}
                      {uploadResult.details && (
                        <div className="mt-2 text-sm">
                          {Object.entries(uploadResult.details).map(([key, value]) => (
                            <div key={key}>{key}: {String(value)}</div>
                          ))}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Parties Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a CSV template for importing parties (customers/suppliers)
                  </p>
                  <div className="text-xs text-gray-500 mb-4">
                    <p>Columns: name, mobile, email, gstin, pan, type, opening_balance, balance_type, address, city, state, pincode</p>
                  </div>
                  <Button onClick={() => downloadTemplate('parties')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2 text-green-600" />
                    Items Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a CSV template for importing items/products
                  </p>
                  <div className="text-xs text-gray-500 mb-4">
                    <p>Columns: name, code, hsn_code, gst_percent, unit, sales_price, purchase_price, opening_stock, description</p>
                  </div>
                  <Button onClick={() => downloadTemplate('items')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                    Sales Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a CSV template for importing sales transactions
                  </p>
                  <div className="text-xs text-gray-500 mb-4">
                    <p>Columns: invoice_number, invoice_date, party_name, item_name, quantity, rate, amount, gst_amount, total_amount, payment_mode, notes</p>
                  </div>
                  <Button onClick={() => downloadTemplate('sales')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2 text-orange-600" />
                    Purchases Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a CSV template for importing purchase transactions
                  </p>
                  <div className="text-xs text-gray-500 mb-4">
                    <p>Columns: bill_number, bill_date, supplier_name, item_name, quantity, rate, amount, gst_amount, total_amount, payment_mode, notes</p>
                  </div>
                  <Button onClick={() => downloadTemplate('purchases')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-red-600" />
                    Expenses Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a CSV template for importing expense records
                  </p>
                  <div className="text-xs text-gray-500 mb-4">
                    <p>Columns: expense_date, description, category, amount, gst_amount, payment_mode, vendor, notes</p>
                  </div>
                  <Button onClick={() => downloadTemplate('expenses')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Receipt className="h-5 w-5 mr-2 text-indigo-600" />
                    Sales-Entry Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a CSV template for importing sales entries with payment tracking
                  </p>
                  <div className="text-xs text-gray-500 mb-4">
                    <p>Columns: invoice_number, invoice_date, party_name, item_name, quantity, rate, amount, gst_amount, total_amount, payment_mode, payment_received, notes</p>
                  </div>
                  <Button onClick={() => downloadTemplate('sales-entry')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
                  Import Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <p className="font-semibold mb-2">File Formats:</p>
                    <p>• <strong>JSON Format:</strong> You can upload backup files exported from the Settings page</p>
                    <p>• <strong>CSV Format:</strong> Use the templates provided above for proper column structure</p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-2">Data Requirements:</p>
                    <p>• <strong>Sales:</strong> invoice_number, party_name, and amount are required fields</p>
                    <p>• <strong>Purchases:</strong> bill_number, supplier_name, and amount are required fields</p>
                    <p>• <strong>Expenses:</strong> description, category, and amount are required fields</p>
                    <p>• <strong>Date Format:</strong> Use YYYY-MM-DD format (e.g., 2024-01-15)</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Important Notes:</p>
                    <p>• <strong>Data Validation:</strong> Ensure all required fields are filled and data types are correct</p>
                    <p>• <strong>Duplicates:</strong> The system will skip duplicate entries based on unique identifiers</p>
                    <p>• <strong>Large Files:</strong> For files with many records, the import process may take some time</p>
                    <p>• <strong>Party/Item Names:</strong> Should match existing entries or will be created as new records</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Data Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-full overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0 border-b pb-4">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <Eye className="h-5 w-5 text-blue-600" />
                Review {reviewData?.type?.replace('-', ' ').toUpperCase()} Data - {reviewData?.totalRows} records
              </DialogTitle>
            </DialogHeader>
            
            {reviewData && (
              <div className="flex flex-col flex-1 overflow-hidden space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
                  <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-green-600">{reviewData.validRows}</div>
                          <p className="text-xs text-muted-foreground font-medium">Valid Records</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500 opacity-80" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-red-600">{reviewData.errorRows}</div>
                          <p className="text-xs text-muted-foreground font-medium">Error Records</p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-500 opacity-80" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-yellow-600">{reviewData.warningRows}</div>
                          <p className="text-xs text-muted-foreground font-medium">Warning Records</p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-yellow-500 opacity-80" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{reviewData.totalRows}</div>
                          <p className="text-xs text-muted-foreground font-medium">Total Records</p>
                        </div>
                        <FileText className="h-8 w-8 text-blue-500 opacity-80" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Data Table */}
                <div className="flex-1 border rounded-lg overflow-hidden shadow-sm bg-white">
                  <div className="flex flex-col h-full">
                    {/* Table Header - Fixed */}
                    <div className="bg-gray-50 border-b">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-gray-50">
                            <TableHead className="w-12 text-center font-semibold sticky left-0 bg-gray-50 z-20">#</TableHead>
                            <TableHead className="w-20 text-center font-semibold sticky left-12 bg-gray-50 z-20">Status</TableHead>
                            {reviewData.headers.map(header => (
                              <TableHead key={header} className="min-w-[150px] font-semibold text-gray-700">
                                {header.replace(/_/g, ' ').toUpperCase()}
                              </TableHead>
                            ))}
                            <TableHead className="w-20 text-center font-semibold sticky right-0 bg-gray-50 z-20">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                      </Table>
                    </div>
                    
                    {/* Table Body - Scrollable */}
                    <div className="flex-1 overflow-auto max-h-[400px]">
                      <Table>
                        <TableBody>
                          {reviewData.rows.map((row, index) => (
                            <TableRow 
                              key={row.id} 
                              className={`
                                hover:bg-gray-50 transition-colors border-b
                                ${row.errors.length > 0 ? 'bg-red-50 hover:bg-red-100' : 
                                  row.warnings.length > 0 ? 'bg-yellow-50 hover:bg-yellow-100' : 
                                  'bg-white hover:bg-gray-50'}
                              `}
                            >
                              <TableCell className="font-medium text-center w-12 sticky left-0 bg-inherit z-10 border-r">
                                {index + 1}
                              </TableCell>
                              <TableCell className="w-20 sticky left-12 bg-inherit z-10 border-r">
                                {row.errors.length > 0 ? (
                                  <Badge variant="destructive" className="text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Error
                                  </Badge>
                                ) : row.warnings.length > 0 ? (
                                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Warning
                                  </Badge>
                                ) : (
                                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Valid
                                  </Badge>
                                )}
                              </TableCell>
                              {reviewData.headers.map(header => (
                                <TableCell key={header} className="min-w-[150px]">
                                  {row.isEditing ? (
                                    // Show different input types based on field
                                    header === 'party_name' ? (
                                      <div className="space-y-2 min-w-[200px]">
                                        <Select 
                                          value={row.edited[header] || ''}
                                          onValueChange={(value) => handleRowEdit(row.id, header, value)}
                                        >
                                          <SelectTrigger className="w-full text-xs">
                                            <SelectValue placeholder="Select party" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {existingParties.map(party => (
                                              <SelectItem key={party.id} value={party.name}>
                                                {party.name} ({party.type})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          value={row.edited[header] || ''}
                                          onChange={(e) => handleRowEdit(row.id, header, e.target.value)}
                                          placeholder="Or type new party"
                                          className="w-full text-xs"
                                        />
                                        {row.warnings.some(w => w.includes('Party') && w.includes('not found')) && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-7"
                                            onClick={async () => {
                                              const partyName = row.edited[header]
                                              if (partyName && await handleCreateNewParty(partyName, 'Customer')) {
                                                const validation = validateRow(row.edited, row.type)
                                                setReviewData(prev => {
                                                  if (!prev) return prev
                                                  return {
                                                    ...prev,
                                                    rows: prev.rows.map(r => 
                                                      r.id === row.id ? { ...r, warnings: validation.warnings, errors: validation.errors } : r
                                                    )
                                                  }
                                                })
                                              }
                                            }}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Create
                                          </Button>
                                        )}
                                      </div>
                                    ) : header === 'supplier_name' ? (
                                      <div className="space-y-2 min-w-[200px]">
                                        <Select 
                                          value={row.edited[header] || ''}
                                          onValueChange={(value) => handleRowEdit(row.id, header, value)}
                                        >
                                          <SelectTrigger className="w-full text-xs">
                                            <SelectValue placeholder="Select supplier" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {existingParties.filter(p => p.type === 'Supplier').map(party => (
                                              <SelectItem key={party.id} value={party.name}>
                                                {party.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          value={row.edited[header] || ''}
                                          onChange={(e) => handleRowEdit(row.id, header, e.target.value)}
                                          placeholder="Or type new supplier"
                                          className="w-full text-xs"
                                        />
                                        {row.warnings.some(w => w.includes('Supplier') && w.includes('not found')) && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-7"
                                            onClick={async () => {
                                              const supplierName = row.edited[header]
                                              if (supplierName && await handleCreateNewParty(supplierName, 'Supplier')) {
                                                const validation = validateRow(row.edited, row.type)
                                                setReviewData(prev => {
                                                  if (!prev) return prev
                                                  return {
                                                    ...prev,
                                                    rows: prev.rows.map(r => 
                                                      r.id === row.id ? { ...r, warnings: validation.warnings, errors: validation.errors } : r
                                                    )
                                                  }
                                                })
                                              }
                                            }}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Create
                                          </Button>
                                        )}
                                      </div>
                                    ) : header === 'item_name' ? (
                                      <div className="space-y-2 min-w-[200px]">
                                        <Select 
                                          value={row.edited[header] || ''}
                                          onValueChange={(value) => handleRowEdit(row.id, header, value)}
                                        >
                                          <SelectTrigger className="w-full text-xs">
                                            <SelectValue placeholder="Select item" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {existingItems.map(item => (
                                              <SelectItem key={item.id} value={item.name}>
                                                {item.name} (₹{item.sales_price})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          value={row.edited[header] || ''}
                                          onChange={(e) => handleRowEdit(row.id, header, e.target.value)}
                                          placeholder="Or type new item"
                                          className="w-full text-xs"
                                        />
                                      </div>
                                    ) : header.includes('date') ? (
                                      <Input
                                        type="date"
                                        value={row.edited[header] || ''}
                                        onChange={(e) => handleRowEdit(row.id, header, e.target.value)}
                                        className="w-full text-xs"
                                      />
                                    ) : header.includes('amount') || header.includes('price') || header.includes('rate') || header.includes('quantity') || header.includes('percent') ? (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={row.edited[header] || ''}
                                        onChange={(e) => handleRowEdit(row.id, header, e.target.value)}
                                        className="w-full text-xs"
                                        placeholder={`Enter ${header}`}
                                      />
                                    ) : header === 'payment_mode' ? (
                                      <Select 
                                        value={row.edited[header] || ''}
                                        onValueChange={(value) => handleRowEdit(row.id, header, value)}
                                      >
                                        <SelectTrigger className="w-full text-xs">
                                          <SelectValue placeholder="Payment mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Cash">Cash</SelectItem>
                                          <SelectItem value="UPI">UPI</SelectItem>
                                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                                          <SelectItem value="Cheque">Cheque</SelectItem>
                                          <SelectItem value="Credit">Credit</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Input
                                        value={row.edited[header] || ''}
                                        onChange={(e) => handleRowEdit(row.id, header, e.target.value)}
                                        className="w-full text-xs"
                                        placeholder={`Enter ${header}`}
                                      />
                                    )
                                  ) : (
                                    <div className="space-y-1">
                                      <div 
                                        className="cursor-pointer hover:bg-blue-50 p-2 rounded border border-transparent hover:border-blue-200 transition-all text-sm"
                                        onDoubleClick={() => toggleRowEdit(row.id)}
                                        title="Double-click to edit"
                                      >
                                        {row.edited[header] || <span className="text-gray-400 italic">Double-click to edit</span>}
                                      </div>
                                      {row.errors.some(e => e.toLowerCase().includes(header.toLowerCase())) && (
                                        <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
                                          {row.errors.find(e => e.toLowerCase().includes(header.toLowerCase()))}
                                        </div>
                                      )}
                                      {row.warnings.some(w => w.toLowerCase().includes(header.toLowerCase())) && (
                                        <div className="text-xs text-yellow-600 bg-yellow-50 p-1 rounded">
                                          {row.warnings.find(w => w.toLowerCase().includes(header.toLowerCase()))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              ))}
                              <TableCell className="w-20 sticky right-0 bg-inherit z-10 border-l">
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => toggleRowEdit(row.id)}
                                    title={row.isEditing ? "Save changes" : "Edit row"}
                                  >
                                    {row.isEditing ? <Check className="h-3 w-3 text-green-600" /> : <Edit2 className="h-3 w-3" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                {/* Error/Warning Summary */}
                {(reviewData.errorRows > 0 || reviewData.warningRows > 0) && (
                  <Card className="flex-shrink-0 border-l-4 border-l-amber-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Issues Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm space-y-2">
                        {reviewData.errorRows > 0 && (
                          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            <p className="text-red-700">
                              <strong>{reviewData.errorRows} records have errors</strong> and cannot be imported. Please fix the errors or remove these records.
                            </p>
                          </div>
                        )}
                        {reviewData.warningRows > 0 && (
                          <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            <p className="text-yellow-700">
                              <strong>{reviewData.warningRows} records have warnings</strong>. These can still be imported but may create new parties/items.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            <DialogFooter className="flex-shrink-0 border-t pt-4 bg-gray-50/50">
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-gray-600">
                  {reviewData?.validRows || 0} valid records ready to import
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowReviewDialog(false)}
                    className="px-6"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmitReview}
                    disabled={processing || (reviewData?.validRows === 0)}
                    className="bg-green-600 hover:bg-green-700 px-6"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Import {reviewData?.validRows} Records
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  )
}