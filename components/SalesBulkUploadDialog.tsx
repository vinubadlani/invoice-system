"use client"

import { useState, useCallback, useEffect } from "react"
import Papa from "papaparse"
import { getSupabaseClient } from "@/lib/supabase"
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle, Plus, Edit2, Check, Trash2, Eye, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface SalesBulkUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  parties: any[]
  items: any[]
  onUploadComplete: () => void
}

interface ReviewRow {
  id: string
  original: any
  edited: any
  errors: string[]
  warnings: string[]
  isEditing: boolean
  isValid: boolean
}

interface ReviewData {
  headers: string[]
  rows: ReviewRow[]
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
}

export default function SalesBulkUploadDialog({ 
  open, 
  onOpenChange, 
  businessId, 
  parties, 
  items,
  onUploadComplete 
}: SalesBulkUploadDialogProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'processing' | 'results'>('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importErrors, setImportErrors] = useState<Array<{row: number, error: string, category?: string, solution?: string, data: any}>>([])
  const [importResults, setImportResults] = useState<{imported: number, total: number} | null>(null)
  const [showCreatePartyDialog, setShowCreatePartyDialog] = useState(false)
  const [showCreateItemDialog, setShowCreateItemDialog] = useState(false)
  const [newPartyData, setNewPartyData] = useState({ name: '', gstin: '', address: '', city: '', state: '' })
  const [newItemData, setNewItemData] = useState({ name: '', hsn_code: '', sales_price: 0, unit: 'Pcs', gst_percent: 18 })
  const { toast } = useToast()

  // Debug data availability
  console.log('SalesBulkUploadDialog - Data available:', {
    partiesCount: parties.length,
    itemsCount: items.length,
    businessId,
    parties: parties.slice(0, 3), // Show first 3 parties for debugging
    items: items.slice(0, 3) // Show first 3 items for debugging
  })

  const downloadSalesTemplate = () => {
    const csvContent = "invoice_number,invoice_date,party_name,item_name,quantity,rate,amount,gst_amount,total_amount,notes\n"
      + "SI001,2024-01-15,ABC Company,Sample Product,10,100,1000,180,1180,Sample sales entry\n"
      + "SI001,2024-01-15,ABC Company,Service Item,5,200,1000,180,1180,Additional item for same invoice\n"
      + "SI002,2024-01-16,XYZ Corp,Another Product,8,150,1200,216,1416,Different invoice\n"
    
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sales_bulk_upload_template.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const validateRow = (rowData: any): { errors: string[], warnings: string[], isValid: boolean } => {
    const errors: string[] = []
    const warnings: string[] = []

    // Required field validation with specific error messages
    if (!rowData.invoice_number && !rowData.invoice_no) {
      warnings.push("⚠️ Invoice number missing - System will auto-generate invoice number")
    }
    
    if (!rowData.party_name || rowData.party_name.trim() === '') {
      errors.push("❌ Party name is required - Please provide customer/party name")
    }
    
    if (!rowData.item_name || rowData.item_name.trim() === '') {
      errors.push("❌ Item name is required - Please provide product/service name")
    }
    
    if (!rowData.quantity || isNaN(Number(rowData.quantity)) || Number(rowData.quantity) <= 0) {
      errors.push("❌ Valid quantity is required - Must be a positive number greater than 0")
    }
    
    if (!rowData.rate || isNaN(Number(rowData.rate)) || Number(rowData.rate) <= 0) {
      errors.push("❌ Valid rate/price is required - Must be a positive number greater than 0")
    }

    // Party validation with detailed messages
    const partyExists = parties.some(p => p.name.toLowerCase() === rowData.party_name?.toLowerCase())
    if (rowData.party_name && !partyExists) {
      warnings.push(`🆕 Party "${rowData.party_name}" not found in database - New party will be created automatically`)
    }

    // Item validation with detailed messages  
    const itemExists = items.some(i => i.name.toLowerCase() === rowData.item_name?.toLowerCase())
    if (rowData.item_name && !itemExists) {
      warnings.push(`🆕 Item "${rowData.item_name}" not found in database - New item will be created automatically`)
    }

    // Date validation with specific error messages
    if (rowData.invoice_date) {
      const date = new Date(rowData.invoice_date)
      if (isNaN(date.getTime())) {
        errors.push("❌ Invalid invoice date format - Use YYYY-MM-DD format (e.g., 2024-01-15)")
      } else {
        // Check if date is too far in future
        const today = new Date()
        const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
        if (date > oneYearFromNow) {
          warnings.push("⚠️ Invoice date is more than 1 year in the future - Please verify the date")
        }
        
        // Check if date is too far in past
        const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate())
        if (date < twoYearsAgo) {
          warnings.push("⚠️ Invoice date is more than 2 years old - Please verify the date")
        }
      }
    } else {
      warnings.push("⚠️ Invoice date missing - System will use today's date")
    }

    // Amount validation with detailed calculations
    const quantity = Number(rowData.quantity) || 0
    const rate = Number(rowData.rate) || 0
    const expectedAmount = quantity * rate
    const providedAmount = Number(rowData.amount) || 0
    
    if (providedAmount && Math.abs(expectedAmount - providedAmount) > 0.01) {
      warnings.push(`🧮 Amount mismatch - Calculated: ₹${expectedAmount.toFixed(2)}, Provided: ₹${providedAmount.toFixed(2)} - Will use calculated amount`)
    }

    // GST validation
    if (rowData.gst_amount) {
      const gstAmount = Number(rowData.gst_amount) || 0
      // Estimate GST percentage (common rates: 0, 5, 12, 18, 28)
      const estimatedGstPercent = Math.round((gstAmount / expectedAmount) * 100)
      const commonGstRates = [0, 5, 12, 18, 28]
      const closestRate = commonGstRates.reduce((prev, curr) => 
        Math.abs(curr - estimatedGstPercent) < Math.abs(prev - estimatedGstPercent) ? curr : prev
      )
      
      if (Math.abs(estimatedGstPercent - closestRate) > 2) {
        warnings.push(`🧮 GST amount seems unusual - ${estimatedGstPercent}% GST rate calculated from provided amount`)
      }
    }

    // Total amount validation
    if (rowData.total_amount) {
      const totalAmount = Number(rowData.total_amount) || 0
      const gstAmount = Number(rowData.gst_amount) || 0
      const expectedTotal = expectedAmount + gstAmount
      
      if (Math.abs(totalAmount - expectedTotal) > 0.01) {
        warnings.push(`🧮 Total amount mismatch - Calculated: ₹${expectedTotal.toFixed(2)}, Provided: ₹${totalAmount.toFixed(2)}`)
      }
    }

    // Text field validation
    if (rowData.party_name && rowData.party_name.length > 100) {
      warnings.push("⚠️ Party name is very long - Consider using a shorter name")
    }
    
    if (rowData.item_name && rowData.item_name.length > 100) {
      warnings.push("⚠️ Item name is very long - Consider using a shorter name")
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    }
  }

  const processFileData = (csvData: any[]) => {
    const headers = Object.keys(csvData[0] || {})
    
    // Group rows by invoice number for validation
    const invoiceGroups = new Map<string, any[]>()
    csvData.forEach((rowData, index) => {
      const invoiceNo = rowData.invoice_number || rowData.invoice_no || `auto-${index}`
      if (!invoiceGroups.has(invoiceNo)) {
        invoiceGroups.set(invoiceNo, [])
      }
      invoiceGroups.get(invoiceNo)!.push({ ...rowData, originalIndex: index })
    })

    const rows: ReviewRow[] = csvData.map((rowData, index) => {
      const invoiceNo = rowData.invoice_number || rowData.invoice_no || `auto-${index}`
      const groupRows = invoiceGroups.get(invoiceNo) || []
      
      // Validate individual row
      const validation = validateRow(rowData)
      
      // Add invoice-specific validations with detailed messages
      const additionalErrors: string[] = []
      const additionalWarnings: string[] = []
      
      // Check for consistent party and date within invoice group
      const uniqueParties = new Set(groupRows.map(r => r.party_name))
      const uniqueDates = new Set(groupRows.map(r => r.invoice_date))
      
      if (uniqueParties.size > 1) {
        additionalErrors.push(`🚫 Multiple parties in invoice ${invoiceNo} - All items in same invoice must have same party. Found: ${Array.from(uniqueParties).join(', ')}`)
      }
      
      if (uniqueDates.size > 1) {
        additionalWarnings.push(`📅 Multiple dates in invoice ${invoiceNo} - All items should have same date. Found dates: ${Array.from(uniqueDates).join(', ')}`)
      }
      
      // Show invoice grouping info with details
      if (groupRows.length > 1) {
        const totalInvoiceAmount = groupRows.reduce((sum, r) => sum + (Number(r.quantity) * Number(r.rate)), 0)
        additionalWarnings.push(`📦 Multi-item invoice ${invoiceNo} - Contains ${groupRows.length} items with total amount ₹${totalInvoiceAmount.toFixed(2)}`)
      }

      // Check for duplicate items within the same invoice
      const itemNames = groupRows.map(r => r.item_name?.toLowerCase()).filter(Boolean)
      const duplicateItems = itemNames.filter((item, index) => itemNames.indexOf(item) !== index)
      if (duplicateItems.length > 0) {
        additionalWarnings.push(`🔄 Duplicate items in invoice ${invoiceNo} - Items: ${[...new Set(duplicateItems)].join(', ')} appear multiple times`)
      }

      return {
        id: `row-${index}`,
        original: { ...rowData },
        edited: { ...rowData },
        errors: [...validation.errors, ...additionalErrors],
        warnings: [...validation.warnings, ...additionalWarnings],
        isEditing: false,
        isValid: validation.isValid && additionalErrors.length === 0
      }
    })

    const validRows = rows.filter(row => row.isValid).length
    const errorRows = rows.filter(row => row.errors.length > 0).length
    const warningRows = rows.filter(row => row.warnings.length > 0 && row.errors.length === 0).length

    return {
      headers,
      rows,
      totalRows: rows.length,
      validRows,
      errorRows,
      warningRows
    }
  }

  const handleFileUpload = useCallback(async (file: File) => {
    if (!businessId) {
      toast({
        title: "Error",
        description: "Please select a business before uploading files.",
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setSelectedFile(file)

    try {
      const text = await file.text()
      
      // Parse CSV using Papa Parse
      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase().replace(/['"]/g, ''),
        transform: (value: string) => value.trim().replace(/['"]/g, '')
      })
      
      setUploadProgress(50)

      if (parseResult.errors.length > 0) {
        const errorDetails = parseResult.errors.map(error => 
          `Row ${error.row || 'Unknown'}: ${error.message}`
        ).join('\n')
        
        toast({
          title: "CSV Parsing Errors",
          description: `Found ${parseResult.errors.length} parsing error(s):\n${errorDetails}`,
          variant: "destructive"
        })
        
        console.error("CSV parsing errors:", parseResult.errors)
        return
      }
      
      const csvData = parseResult.data as any[]
      
      if (csvData.length === 0) {
        toast({
          title: "Error",
          description: "CSV file is empty or has no data rows.",
          variant: "destructive"
        })
        return
      }

      setUploadProgress(80)

      const processedData = processFileData(csvData)
      setReviewData(processedData)
      
      setUploadProgress(100)
      setCurrentStep('review')

      toast({
        title: "File Processed",
        description: `Loaded ${processedData.totalRows} rows for review`,
      })

    } catch (error: any) {
      console.error("File processing error:", error)
      toast({
        title: "Error",
        description: `Failed to process file: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }, [businessId, parties, items, toast])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleRowEdit = (rowId: string, field: string, value: string) => {
    setReviewData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        rows: prev.rows.map(row => {
          if (row.id === rowId) {
            const updatedRow = {
              ...row,
              edited: { ...row.edited, [field]: value }
            }
            // Re-validate the row
            const validation = validateRow(updatedRow.edited)
            return {
              ...updatedRow,
              errors: validation.errors,
              warnings: validation.warnings,
              isValid: validation.isValid
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
        rows: prev.rows.map(row => 
          row.id === rowId ? { ...row, isEditing: !row.isEditing } : row
        )
      }
    })
  }

  const handleCreateNewParty = async (partyName: string) => {
    try {
      const client = getSupabaseClient()
      if (!client) throw new Error("Service unavailable")

      const partyData = {
        business_id: businessId,
        name: partyName,
        gstin: newPartyData.gstin,
        address: newPartyData.address,
        city: newPartyData.city,
        state: newPartyData.state,
        type: 'Customer',
        opening_balance: 0
      }

      const { data, error } = await client
        .from('parties')
        .insert(partyData)
        .select()
        .single()

      if (error) throw error

      // Add to parties list (this should ideally update the parent component's state)
      parties.push(data)

      toast({
        title: "Success",
        description: `Party "${partyName}" created successfully`,
      })

      setShowCreatePartyDialog(false)
      setNewPartyData({ name: '', gstin: '', address: '', city: '', state: '' })
      
      return true
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create party: ${error.message}`,
        variant: "destructive"
      })
      return false
    }
  }

  const handleCreateNewItem = async (itemName: string) => {
    try {
      const client = getSupabaseClient()
      if (!client) throw new Error("Service unavailable")

      const itemData = {
        business_id: businessId,
        name: itemName,
        code: `ITEM-${Date.now().toString().slice(-6)}`,
        hsn_code: newItemData.hsn_code,
        sales_price: newItemData.sales_price,
        purchase_price: newItemData.sales_price * 0.8,
        unit: newItemData.unit,
        gst_percent: newItemData.gst_percent,
        opening_stock: 0
      }

      const { data, error } = await client
        .from('items')
        .insert(itemData)
        .select()
        .single()

      if (error) throw error

      // Add to items list
      items.push(data)

      toast({
        title: "Success",
        description: `Item "${itemName}" created successfully`,
      })

      setShowCreateItemDialog(false)
      setNewItemData({ name: '', hsn_code: '', sales_price: 0, unit: 'Pcs', gst_percent: 18 })
      
      return true
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create item: ${error.message}`,
        variant: "destructive"
      })
      return false
    }
  }

  // Function to generate invoice number based on business settings
  const generateInvoiceNumber = async (client: any, businessId: string) => {
    try {
      // Get the latest invoice number from the invoices table
      const { data: latestInvoice } = await client
        .from('invoices')
        .select('invoice_no')
        .eq('business_id', businessId)
        .eq('type', 'sales')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestInvoice?.invoice_no) {
        // Extract number from the latest invoice (assuming format like SI-001, INV-001, etc.)
        const match = latestInvoice.invoice_no.match(/(\d+)$/)
        if (match) {
          const nextNumber = parseInt(match[1]) + 1
          const prefix = latestInvoice.invoice_no.replace(/\d+$/, '')
          return `${prefix}${nextNumber.toString().padStart(match[1].length, '0')}`
        }
      }

      // Default format if no previous invoices
      const today = new Date()
      const year = today.getFullYear().toString().slice(-2)
      const month = (today.getMonth() + 1).toString().padStart(2, '0')
      return `SI-${year}${month}-001`
    } catch (error) {
      // Fallback to timestamp-based number
      const timestamp = Date.now().toString().slice(-6)
      return `SI-${timestamp}`
    }
  }

  const handleImport = async () => {
    if (!reviewData || !businessId) return

    const validRows = reviewData.rows.filter(row => row.isValid)
    
    if (validRows.length === 0) {
      toast({
        title: "Error",
        description: "No valid rows to import. Please fix all errors first.",
        variant: "destructive"
      })
      return
    }

    setImporting(true)
    setImportProgress(0)
    setCurrentStep('processing')
    setImportErrors([]) // Clear previous errors

    try {
      const client = getSupabaseClient()
      if (!client) throw new Error("Service unavailable")

      // Group valid rows by invoice number
      const invoiceGroups = new Map<string, any[]>()
      validRows.forEach((row, index) => {
        const rowData = row.edited
        const invoiceNo = rowData.invoice_number || rowData.invoice_no || `auto-${index}`
        if (!invoiceGroups.has(invoiceNo)) {
          invoiceGroups.set(invoiceNo, [])
        }
        invoiceGroups.get(invoiceNo)!.push(rowData)
      })

      let imported = 0
      let totalInvoices = invoiceGroups.size
      const errors: Array<{row: number, error: string, category?: string, solution?: string, data: any}> = []

      let invoiceIndex = 0
      for (const [invoiceNo, invoiceRows] of invoiceGroups) {
        setImportProgress((invoiceIndex / totalInvoices) * 90)

        try {
          // All rows in this group should have the same party and date
          const firstRow = invoiceRows[0]
          
          // Find or create party
          let selectedParty = parties.find(p => 
            p.name.toLowerCase() === firstRow.party_name.toLowerCase()
          )
          
          if (!selectedParty) {
            // Create new party if it doesn't exist
            const partyData = {
              business_id: businessId,
              name: firstRow.party_name,
              address: '', // Will be filled later from party master
              city: '', // Will be filled later from party master
              state: '', // Will be filled later from party master
              gstin: '',
              type: 'Customer',
              opening_balance: 0
            }

            const { data: newParty, error: partyError } = await client
              .from('parties')
              .insert(partyData)
              .select()
              .single()

            if (partyError) throw partyError
            selectedParty = newParty
          }

          // Process all items for this invoice
          const invoiceItems: any[] = []
          let totalSubtotal = 0
          let totalTax = 0

          for (const rowData of invoiceRows) {
            // Find or create item
            let selectedItem = items.find(i => 
              i.name.toLowerCase() === rowData.item_name.toLowerCase()
            )

            if (!selectedItem) {
              // Create new item if it doesn't exist
              const itemData = {
                business_id: businessId,
                name: rowData.item_name,
                code: `ITEM-${Date.now().toString().slice(-6)}`,
                hsn_code: '',
                sales_price: Number(rowData.rate) || 0,
                purchase_price: Number(rowData.rate) * 0.8 || 0,
                unit: 'Pcs',
                gst_percent: 18,
                opening_stock: 0
              }

              const { data: newItem, error: itemError } = await client
                .from('items')
                .insert(itemData)
                .select()
                .single()

              if (itemError) throw itemError
              selectedItem = newItem
            }

            // Calculate amounts for this item
            const quantity = Number(rowData.quantity) || 1
            const rate = Number(rowData.rate) || 0
            const itemSubtotal = quantity * rate
            const gstPercent = selectedItem.gst_percent || 18
            const itemTax = (itemSubtotal * gstPercent) / 100

            // Add to invoice items
            invoiceItems.push({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              item_id: selectedItem.id,
              item_name: selectedItem.name,
              item_code: selectedItem.code || '',
              hsn: selectedItem.hsn_code || '',
              qty: quantity,
              rate: rate,
              unit: selectedItem.unit || 'Pcs',
              gst_percent: gstPercent,
              tax_amount: itemTax,
              total: itemSubtotal
            })

            totalSubtotal += itemSubtotal
            totalTax += itemTax
          }

          // Generate invoice number if auto-generated
          const finalInvoiceNo = invoiceNo.startsWith('auto-') 
            ? await generateInvoiceNumber(client, businessId) 
            : invoiceNo

          // Create the invoice with all items
          const invoiceData = {
            business_id: businessId,
            invoice_no: finalInvoiceNo,
            date: firstRow.invoice_date || new Date().toISOString().split('T')[0],
            party_id: selectedParty.id,
            party_name: selectedParty.name,
            gstin: selectedParty.gstin || '',
            state: selectedParty.state || '',
            address: selectedParty.address || '',
            items: invoiceItems,
            total_tax: totalTax,
            round_off: 0,
            net_total: totalSubtotal + totalTax,
            payment_received: 0, // Remove payment tracking from bulk upload
            balance_due: totalSubtotal + totalTax, // Full amount is due since no payment
            type: "sales" as const,
          }

          const { data: insertedInvoice, error: invoiceError } = await client
            .from('invoices')
            .insert(invoiceData)
            .select()
            .single()

          if (invoiceError) throw invoiceError

          imported++

        } catch (error: any) {
          console.error(`Error importing invoice ${invoiceNo}:`, error)
          let errorMessage = error?.message || error?.details || error?.hint || 'Unknown error occurred'
          let errorCategory = 'Unknown Error'
          let solution = 'Please check the data and try again'
          
          // Categorize errors and provide specific solutions
          if (errorMessage.includes('duplicate key value violates unique constraint') && errorMessage.includes('invoices_business_id_invoice_no_key')) {
            errorCategory = 'Duplicate Invoice Number'
            errorMessage = `Invoice number "${invoiceNo}" already exists in your database`
            solution = 'Use a different invoice number or check existing invoices'
          } else if (errorMessage.includes('foreign key violation') || errorMessage.includes('violates foreign key constraint')) {
            errorCategory = 'Data Reference Error'
            solution = 'Check that all party and item references are valid'
          } else if (errorMessage.includes('null value in column') || errorMessage.includes('violates not-null constraint')) {
            errorCategory = 'Missing Required Data'
            const nullColumn = errorMessage.match(/column "([^"]+)"/)?.[1] || 'unknown field'
            errorMessage = `Required field "${nullColumn}" is missing or empty`
            solution = `Please provide a value for ${nullColumn}`
          } else if (errorMessage.includes('invalid input syntax') || errorMessage.includes('invalid text representation')) {
            errorCategory = 'Data Format Error'
            solution = 'Check that numbers are valid and dates are in YYYY-MM-DD format'
          } else if (errorMessage.includes('permission denied') || errorMessage.includes('insufficient privilege')) {
            errorCategory = 'Permission Error'
            solution = 'Contact your administrator for database access permissions'
          } else if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
            errorCategory = 'Connection Error'
            solution = 'Check your internet connection and try again'
          }
          
          // Add error for all rows in this invoice group with enhanced details
          const invoiceRowData = invoiceGroups.get(invoiceNo) || []
          errors.push({
            row: invoiceIndex + 1,
            error: errorMessage,
            category: errorCategory,
            solution: solution,
            data: { 
              invoice_no: invoiceNo,
              party_name: invoiceRowData[0]?.party_name,
              items_count: invoiceRowData.length,
              total_amount: invoiceRowData.reduce((sum, row) => sum + (Number(row.total_amount) || Number(row.quantity) * Number(row.rate) || 0), 0)
            }
          })
        }

        invoiceIndex++
      }

      setImportProgress(100)
      setImportErrors(errors)
      setImportResults({ imported, total: totalInvoices })

      if (imported > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${imported} out of ${totalInvoices} invoices (${validRows.length} items total).`,
        })
        
        // If no errors, close dialog and reset
        if (errors.length === 0) {
          onUploadComplete()
          onOpenChange(false)
          
          // Reset state
          setCurrentStep('upload')
          setReviewData(null)
          setSelectedFile(null)
          setImportErrors([])
          setImportResults(null)
        } else {
          // Show results step with errors
          setCurrentStep('results')
        }
      } else {
        // All failed, show results
        setCurrentStep('results')
        toast({
          title: "Import Failed",
          description: "No invoices were imported successfully. Please check the errors below.",
          variant: "destructive"
        })
      }

    } catch (error: any) {
      console.error("Import error:", error)
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setImporting(false)
    }
  }

  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-blue-800">Available Data:</span>
          <div className="flex gap-4 text-xs">
            <span className="bg-blue-100 px-2 py-1 rounded">
              Parties: {parties.length}
            </span>
            <span className="bg-blue-100 px-2 py-1 rounded">
              Items: {items.length}
            </span>
          </div>
        </div>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Download the template CSV file below</li>
          <li>• Fill in your sales data following the column format</li>
          <li>• <strong>Multiple items per invoice:</strong> Use the same invoice number for multiple rows to create multi-item invoices</li>
          <li>• All rows with the same invoice number must have the same party name and date</li>
          <li>• New parties and items will be automatically created if they don't exist</li>
          <li>• Party address and city will be fetched from party master data</li>
          <li>• Payment tracking is managed separately through bank accounts</li>
          <li>• Upload the completed CSV file for review</li>
          {(parties.length === 0 || items.length === 0) && (
            <li className="font-medium text-red-600">
              ⚠️ {parties.length === 0 ? 'No parties' : ''} {parties.length === 0 && items.length === 0 ? ' and ' : ''} {items.length === 0 ? 'No items' : ''} found - Please add some parties and items first, or they will be auto-created during import
            </li>
          )}
        </ul>
      </div>

      {/* Template Download */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Download Template
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Get the CSV template with proper column headers
        </p>
        <Button onClick={downloadSalesTemplate} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Sales Template
        </Button>
      </div>

      {/* File Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload CSV File
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Select your completed sales CSV file
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
          id="bulkFileInput"
          disabled={uploading}
        />
        <label htmlFor="bulkFileInput">
          <Button asChild disabled={uploading}>
            <span>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Select CSV File
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Processing file...</span>
            <span className="text-sm text-gray-500">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}
    </div>
  )

  const renderReviewStep = () => {
    if (!reviewData) return null

    // Calculate unique invoices from rows
    const invoiceNumbers = new Set()
    reviewData.rows.forEach(row => {
      const invoiceNo = row.edited.invoice_number || row.edited.invoice_no || `auto-${row.id.split('-')[1]}`
      invoiceNumbers.add(invoiceNo)
    })

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{reviewData.totalRows}</div>
              <div className="text-sm text-gray-500">Total Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{invoiceNumbers.size}</div>
              <div className="text-sm text-gray-500">Invoices</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{reviewData.validRows}</div>
              <div className="text-sm text-gray-500">Valid</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{reviewData.warningRows}</div>
              <div className="text-sm text-gray-500">Warnings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{reviewData.errorRows}</div>
              <div className="text-sm text-gray-500">Errors</div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <div className="border rounded-lg">
          <div className="flex">
            {/* Fixed Header */}
            <div className="flex-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
            
            {/* Scrollable Header */}
            <div className="flex-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {reviewData.headers.map(header => (
                      <TableHead key={header} className="min-w-[150px] capitalize">
                        {header.replace(/_/g, ' ')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="max-h-96 overflow-y-auto">
            <div className="flex">
              {/* Fixed Columns */}
              <div className="flex-none">
                <Table>
                  <TableBody>
                    {reviewData.rows.map((row, index) => (
                      <TableRow 
                        key={row.id}
                        className={`
                          ${row.errors.length > 0 ? 'bg-red-50' : 
                            row.warnings.length > 0 ? 'bg-yellow-50' : 'bg-green-50'}
                        `}
                      >
                        <TableCell className="w-12 text-center font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="w-20">
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
                        <TableCell className="w-16">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowEdit(row.id)}
                            >
                              {row.isEditing ? <Check className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                            </Button>
                            {(row.errors.length > 0 || row.warnings.length > 0) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const allMessages = [
                                    ...row.errors.map(e => `❌ Error: ${e}`),
                                    ...row.warnings.map(w => `⚠️ Warning: ${w}`)
                                  ]
                                  toast({
                                    title: `Row ${index + 1} Details`,
                                    description: allMessages.join('\n\n'),
                                    duration: 10000,
                                  })
                                }}
                                title="👁️ Click to view all errors and warnings for this row"
                                className="hover:bg-blue-50"
                              >
                                <Eye className="h-3 w-3 text-blue-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Scrollable Columns */}
              <div className="flex-1 overflow-x-auto">
                <Table>
                  <TableBody>
                    {reviewData.rows.map((row) => (
                      <TableRow 
                        key={row.id}
                        className={`
                          ${row.errors.length > 0 ? 'bg-red-50' : 
                            row.warnings.length > 0 ? 'bg-yellow-50' : 'bg-green-50'}
                        `}
                      >
                        {reviewData.headers.map(header => (
                          <TableCell key={header} className="min-w-[150px]">
                            {row.isEditing ? (
                              header === 'party_name' ? (
                                <div className="space-y-2">
                                  <Select 
                                    value={row.edited[header] || ''}
                                    onValueChange={(value) => handleRowEdit(row.id, header, value)}
                                  >
                                    <SelectTrigger className="w-full text-xs">
                                      <SelectValue placeholder="Select party" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {parties.length === 0 ? (
                                        <SelectItem value="" disabled>
                                          No parties available - Create one first
                                        </SelectItem>
                                      ) : (
                                        parties.map(party => (
                                          <SelectItem key={party.id} value={party.name}>
                                            {party.name}
                                          </SelectItem>
                                        ))
                                      )}
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
                                      onClick={() => {
                                        setNewPartyData({ ...newPartyData, name: row.edited[header] })
                                        setShowCreatePartyDialog(true)
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Create Party
                                    </Button>
                                  )}
                                </div>
                              ) : header === 'item_name' ? (
                                <div className="space-y-2">
                                  <Select 
                                    value={row.edited[header] || ''}
                                    onValueChange={(value) => handleRowEdit(row.id, header, value)}
                                  >
                                    <SelectTrigger className="w-full text-xs">
                                      <SelectValue placeholder="Select item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {items.length === 0 ? (
                                        <SelectItem value="" disabled>
                                          No items available - Create one first
                                        </SelectItem>
                                      ) : (
                                        items.map(item => (
                                          <SelectItem key={item.id} value={item.name}>
                                            {item.name} - ₹{item.sales_price}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    value={row.edited[header] || ''}
                                    onChange={(e) => handleRowEdit(row.id, header, e.target.value)}
                                    placeholder="Or type new item"
                                    className="w-full text-xs"
                                  />
                                  {row.warnings.some(w => w.includes('Item') && w.includes('not found')) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-7"
                                      onClick={() => {
                                        setNewItemData({ ...newItemData, name: row.edited[header] })
                                        setShowCreateItemDialog(true)
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Create Item
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <Input
                                  value={row.edited[header] || ''}
                                  onChange={(e) => handleRowEdit(row.id, header, e.target.value)}
                                  className="w-full text-xs"
                                />
                              )
                            ) : (
                              <div className="text-xs">
                                {row.edited[header] || '-'}
                                {row.errors.some(e => e.toLowerCase().includes(header.replace('_', ' '))) && (
                                  <div className="text-red-600 text-xs mt-1 p-2 bg-red-50 rounded border-l-2 border-red-200">
                                    <div className="font-medium">❌ Error:</div>
                                    {row.errors.filter(e => e.toLowerCase().includes(header.replace('_', ' '))).map((error, idx) => (
                                      <div key={idx} className="mt-1">{error}</div>
                                    ))}
                                  </div>
                                )}
                                {row.warnings.some(w => w.toLowerCase().includes(header.replace('_', ' '))) && (
                                  <div className="text-yellow-700 text-xs mt-1 p-2 bg-yellow-50 rounded border-l-2 border-yellow-200">
                                    <div className="font-medium">⚠️ Warning:</div>
                                    {row.warnings.filter(w => w.toLowerCase().includes(header.replace('_', ' '))).map((warning, idx) => (
                                      <div key={idx} className="mt-1">{warning}</div>
                                    ))}
                                  </div>
                                )}
                                {/* Show all errors and warnings for this row if not field-specific */}
                                {!row.errors.some(e => e.toLowerCase().includes(header.replace('_', ' '))) && 
                                 !row.warnings.some(w => w.toLowerCase().includes(header.replace('_', ' '))) && 
                                 header === 'party_name' && (row.errors.length > 0 || row.warnings.length > 0) && (
                                  <div className="mt-1 space-y-1">
                                    {row.errors.filter(e => !reviewData.headers.some(h => e.toLowerCase().includes(h.replace('_', ' ')))).map((error, idx) => (
                                      <div key={`error-${idx}`} className="text-red-600 text-xs p-2 bg-red-50 rounded border-l-2 border-red-200">
                                        <div className="font-medium">❌ Row Error:</div>
                                        <div>{error}</div>
                                      </div>
                                    ))}
                                    {row.warnings.filter(w => !reviewData.headers.some(h => w.toLowerCase().includes(h.replace('_', ' ')))).map((warning, idx) => (
                                      <div key={`warning-${idx}`} className="text-yellow-700 text-xs p-2 bg-yellow-50 rounded border-l-2 border-yellow-200">
                                        <div className="font-medium">⚠️ Row Warning:</div>
                                        <div>{warning}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep('upload')}>
            Back to Upload
          </Button>
          <Button 
            onClick={handleImport}
            disabled={reviewData.validRows === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Import {(() => {
              const invoiceNumbers = new Set()
              reviewData.rows.filter(row => row.isValid).forEach(row => {
                const invoiceNo = row.edited.invoice_number || row.edited.invoice_no || `auto-${row.id.split('-')[1]}`
                invoiceNumbers.add(invoiceNo)
              })
              return invoiceNumbers.size
            })()} Invoice{(() => {
              const invoiceNumbers = new Set()
              reviewData.rows.filter(row => row.isValid).forEach(row => {
                const invoiceNo = row.edited.invoice_number || row.edited.invoice_no || `auto-${row.id.split('-')[1]}`
                invoiceNumbers.add(invoiceNo)
              })
              return invoiceNumbers.size === 1 ? '' : 's'
            })()} ({reviewData.validRows} Items)
          </Button>
        </div>
      </div>
    )
  }

  const renderProcessingStep = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <div>
        <h3 className="text-lg font-medium">Importing Sales Data</h3>
        <p className="text-sm text-gray-500">Please wait while we process your data...</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-gray-500">{importProgress}%</span>
        </div>
        <Progress value={importProgress} className="w-full" />
      </div>
    </div>
  )

  const renderResultsStep = () => (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          {importResults && importResults.imported === importResults.total ? (
            <CheckCircle className="h-8 w-8 text-green-600" />
          ) : (
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          )}
        </div>
        <h3 className="text-lg font-medium">Import Results</h3>
        {importResults && (
          <p className="text-sm text-gray-500">
            {importResults.imported} of {importResults.total} entries imported successfully
          </p>
        )}
      </div>

      {/* Import Statistics */}
      {importResults && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResults.imported}</div>
                <p className="text-xs text-gray-500">Successful</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{importErrors.length}</div>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{importResults.total}</div>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Details Table */}
      {importErrors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <h4 className="font-medium">Failed Entries ({importErrors.length})</h4>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Invoice</TableHead>
                      <TableHead>Error Type</TableHead>
                      <TableHead>Party Name</TableHead>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Error Details</TableHead>
                      <TableHead>Solution</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importErrors.map((error, index) => (
                      <TableRow key={index} className="group hover:bg-gray-50">
                        <TableCell className="font-mono text-center">{error.row}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              error.category?.includes('Duplicate') ? 'destructive' :
                              error.category?.includes('Missing') ? 'secondary' :
                              error.category?.includes('Format') ? 'outline' :
                              'default'
                            }
                            className="text-xs"
                          >
                            {error.category || 'Error'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{error.data.party_name}</TableCell>
                        <TableCell className="font-mono">
                          {error.data.invoice_no || (
                            <Badge variant="outline" className="text-xs">Auto-generated</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {error.data.items_count || 1} item{(error.data.items_count || 1) > 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">₹{error.data.total_amount?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-red-600 break-words leading-tight">{error.error}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-blue-600 break-words leading-tight">{error.solution || 'Please check the data and try again'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: `Import Error Details - Invoice ${error.row}`,
                                description: `🔍 Full Error Details:\n\n❌ Error: ${error.error}\n\n📊 Category: ${error.category || 'Unknown'}\n\n💡 Solution: ${error.solution || 'Please check the data and try again'}\n\n📄 Data Details:\n• Party: ${error.data.party_name}\n• Invoice: ${error.data.invoice_no}\n• Items: ${error.data.items_count}\n• Amount: ₹${error.data.total_amount?.toFixed(2) || '0.00'}`,
                                duration: 15000,
                              })
                            }}
                            title="👁️ Click to view detailed error information"
                            className="hover:bg-blue-50"
                          >
                            <Eye className="h-3 w-3 text-blue-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-4">
                <div>
                  <strong>📊 Error Categories Summary:</strong>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                    {(() => {
                      const categories = importErrors.reduce((acc, error) => {
                        const category = error.category || 'Other'
                        acc[category] = (acc[category] || 0) + 1
                        return acc
                      }, {} as Record<string, number>)
                      
                      return Object.entries(categories).map(([category, count]) => (
                        <div key={category} className="bg-gray-50 p-2 rounded">
                          <div className="font-medium text-sm">{category}</div>
                          <div className="text-xs text-gray-600">{count} error{count > 1 ? 's' : ''}</div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
                
                <div>
                  <strong>🛠️ Common Solutions:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• <strong>Duplicate Invoice Numbers:</strong> Use unique invoice numbers or let system auto-generate them</li>
                    <li>• <strong>Missing Required Data:</strong> Ensure all required fields (party name, item name, quantity, rate) are filled</li>
                    <li>• <strong>Data Format Errors:</strong> Use YYYY-MM-DD for dates, positive numbers for quantities and rates</li>
                    <li>• <strong>Party/Item Not Found:</strong> Check spelling or let system create new entries automatically</li>
                    <li>• <strong>Multiple Parties per Invoice:</strong> Each invoice should have only one party for all items</li>
                  </ul>
                </div>
                
                <div>
                  <strong>💡 Tips for Success:</strong>
                  <ul className="mt-2 space-y-1 text-sm text-blue-600">
                    <li>• Download and use the provided CSV template</li>
                    <li>• Group multiple items under same invoice number for multi-item invoices</li>
                    <li>• Keep party and date consistent within each invoice</li>
                    <li>• Verify calculated amounts match provided amounts</li>
                    <li>• Test with a small batch first before uploading large files</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button 
          variant="outline"
          onClick={() => {
            setCurrentStep('upload')
            setReviewData(null)
            setSelectedFile(null)
            setImportErrors([])
            setImportResults(null)
          }}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload New File
        </Button>
        
        <div className="flex gap-2">
          {importResults && importResults.imported > 0 && (
            <Button 
              onClick={() => {
                onUploadComplete()
                onOpenChange(false)
                // Reset state
                setCurrentStep('upload')
                setReviewData(null)
                setSelectedFile(null)
                setImportErrors([])
                setImportResults(null)
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
          
          {importErrors.length > 0 && (
            <Button 
              variant="outline"
              onClick={() => setCurrentStep('review')}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Fix Errors
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Upload Sales Invoices
              {currentStep !== 'upload' && (
                <Badge variant="outline">
                  {currentStep === 'review' && 'Review Data'}
                  {currentStep === 'processing' && 'Processing'}
                  {currentStep === 'results' && 'Import Results'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {currentStep === 'upload' && renderUploadStep()}
            {currentStep === 'review' && renderReviewStep()}
            {currentStep === 'processing' && renderProcessingStep()}
            {currentStep === 'results' && renderResultsStep()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Party Dialog */}
      <Dialog open={showCreatePartyDialog} onOpenChange={setShowCreatePartyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Party</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Party Name</Label>
              <Input
                value={newPartyData.name}
                onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })}
                placeholder="Enter party name"
              />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input
                value={newPartyData.gstin}
                onChange={(e) => setNewPartyData({ ...newPartyData, gstin: e.target.value })}
                placeholder="Enter GSTIN (optional)"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={newPartyData.address}
                onChange={(e) => setNewPartyData({ ...newPartyData, address: e.target.value })}
                placeholder="Enter address"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={newPartyData.city}
                  onChange={(e) => setNewPartyData({ ...newPartyData, city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={newPartyData.state}
                  onChange={(e) => setNewPartyData({ ...newPartyData, state: e.target.value })}
                  placeholder="Enter state"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePartyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleCreateNewParty(newPartyData.name)}>
              Create Party
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Item Dialog */}
      <Dialog open={showCreateItemDialog} onOpenChange={setShowCreateItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input
                value={newItemData.name}
                onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                placeholder="Enter item name"
              />
            </div>
            <div>
              <Label>HSN Code</Label>
              <Input
                value={newItemData.hsn_code}
                onChange={(e) => setNewItemData({ ...newItemData, hsn_code: e.target.value })}
                placeholder="Enter HSN code (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sales Price</Label>
                <Input
                  type="number"
                  value={newItemData.sales_price}
                  onChange={(e) => setNewItemData({ ...newItemData, sales_price: Number(e.target.value) })}
                  placeholder="Enter sales price"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={newItemData.unit} onValueChange={(value) => setNewItemData({ ...newItemData, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pcs">Pcs</SelectItem>
                    <SelectItem value="Kg">Kg</SelectItem>
                    <SelectItem value="Ltr">Ltr</SelectItem>
                    <SelectItem value="Mtr">Mtr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>GST Percentage</Label>
              <Select value={newItemData.gst_percent.toString()} onValueChange={(value) => setNewItemData({ ...newItemData, gst_percent: Number(value) })}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleCreateNewItem(newItemData.name)}>
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
