"use client"

import React, { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { 
  Upload, Download, Save, Plus, Trash2, FileText, 
  CheckCircle, XCircle, AlertTriangle, Loader2,
  Edit3, Eye, Calculator, Users, Package
} from "lucide-react"
import * as Papa from "papaparse"
import { getSupabaseClient } from '@/lib/supabase'

interface Party {
  id: string
  name: string
  type: string
  gstin?: string
  state?: string
  address?: string
}

interface Item {
  id: string
  name: string
  hsn_code?: string
  gst_percent?: number
  purchase_price?: number
  unit?: string
}

interface PurchaseRow {
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

interface ExcelUploaderProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  parties: Party[]
  items: Item[]
  onPartiesUpdate: (parties: Party[]) => void
  onItemsUpdate: (items: Item[]) => void
  onSuccess?: () => void
  type: 'purchase' | 'sales'
}

export default function ExcelUploader({
  isOpen,
  onClose,
  businessId,
  parties,
  items,
  onPartiesUpdate,
  onItemsUpdate,
  onSuccess,
  type = 'purchase'
}: ExcelUploaderProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [data, setData] = useState<PurchaseRow[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [editingCell, setEditingCell] = useState<{rowId: string, field: string} | null>(null)
  const { toast } = useToast()

  const downloadTemplate = useCallback(() => {
    const csvContent = `invoice_number,invoice_date,party_name,state,address,gstin,item_name,hsn_code,quantity,rate,gst_percent,gst_amount,total_amount,payment_received,payment_method,notes
PUR001,2025-01-15,ABC Suppliers,Maharashtra,123 Supplier St Mumbai,27ABCDE1234F1Z5,Sample Product,1234,10,100,18,180,1180,500,Cash,Sample purchase entry`
    
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${type}_template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [type])

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file || (!file.name.endsWith('.csv') && file.type !== 'text/csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    
    try {
      const text = await file.text()
      
      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase().replace(/['"]/g, ''),
        transform: (value: string) => value.trim().replace(/['"]/g, '')
      })
      
      if (parseResult.errors.length > 0) {
        throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`)
      }
      
      const csvData = parseResult.data as any[]
      
      if (csvData.length === 0) {
        throw new Error("CSV file is empty or has no data rows")
      }

      // Convert and validate data
      const processedData: PurchaseRow[] = csvData.map((row, index) => {
        const errors: string[] = []
        
        // Basic validation
        const invoice_number = row.invoice_number || row.invoice_no || `${type.toUpperCase()}-${Date.now()}-${index}`
        const party_name = row.party_name || ''
        const item_name = row.item_name || ''
        const quantity = parseFloat(row.quantity || '1')
        const rate = parseFloat(row.rate || '0')
        const gst_percent = parseFloat(row.gst_percent || '18')
        
        // Validation
        if (!invoice_number) errors.push('Invoice number required')
        if (!party_name) errors.push('Party name required')
        if (!item_name) errors.push('Item name required')
        if (quantity <= 0) errors.push('Quantity must be greater than 0')
        if (rate < 0) errors.push('Rate cannot be negative')
        
        // Calculate amounts
        const subtotal = quantity * rate
        const gst_amount = (subtotal * gst_percent) / 100
        const total_amount = subtotal + gst_amount
        
        // Match existing parties
        const matchedParty = parties.find(p => 
          p.name.toLowerCase() === party_name.toLowerCase()
        )
        
        // Match existing items
        const matchedItem = items.find(i => 
          i.name.toLowerCase() === item_name.toLowerCase()
        )
        
        if (!matchedParty && party_name) {
          errors.push('New party - will be created')
        }
        
        if (!matchedItem && item_name) {
          errors.push('New item - will be created')
        }
        
        const status: 'valid' | 'warning' | 'error' = 
          errors.some(e => e.includes('required') || e.includes('must be') || e.includes('cannot be')) ? 'error' :
          errors.length > 0 ? 'warning' : 'valid'

        return {
          id: `row-${Date.now()}-${index}`,
          invoice_number,
          invoice_date: row.invoice_date || row.date || new Date().toISOString().split('T')[0],
          party_name,
          party_id: matchedParty?.id,
          state: row.state || matchedParty?.state || '',
          address: row.address || matchedParty?.address || '',
          gstin: row.gstin || matchedParty?.gstin || '',
          item_name,
          item_id: matchedItem?.id,
          hsn_code: row.hsn_code || matchedItem?.hsn_code || '',
          quantity,
          rate,
          gst_percent,
          gst_amount,
          total_amount: parseFloat(row.total_amount) || total_amount,
          payment_received: parseFloat(row.payment_received || '0'),
          payment_method: row.payment_method || 'Cash',
          notes: row.notes || '',
          errors,
          status
        }
      })

      setData(processedData)
      setStep('review')
      
      toast({
        title: "File uploaded successfully",
        description: `Loaded ${processedData.length} rows for review`
      })
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [parties, items, type, toast])

  const updateCell = useCallback((rowId: string, field: keyof PurchaseRow, value: any) => {
    setData(prevData => 
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

        // Update party-related fields
        if (field === 'party_id') {
          const selectedParty = parties.find(p => p.id === value)
          if (selectedParty) {
            updatedRow.party_name = selectedParty.name
            updatedRow.state = selectedParty.state || ''
            updatedRow.address = selectedParty.address || ''
            updatedRow.gstin = selectedParty.gstin || ''
          }
        }

        // Update item-related fields
        if (field === 'item_id') {
          const selectedItem = items.find(i => i.id === value)
          if (selectedItem) {
            updatedRow.item_name = selectedItem.name
            updatedRow.hsn_code = selectedItem.hsn_code || ''
            updatedRow.gst_percent = selectedItem.gst_percent || 18
            updatedRow.rate = selectedItem.purchase_price || 0
            
            // Recalculate amounts
            const subtotal = updatedRow.quantity * updatedRow.rate
            updatedRow.gst_amount = (subtotal * updatedRow.gst_percent) / 100
            updatedRow.total_amount = subtotal + updatedRow.gst_amount
          }
        }

        // Re-validate
        const errors: string[] = []
        if (!updatedRow.invoice_number) errors.push('Invoice number required')
        if (!updatedRow.party_name) errors.push('Party name required')
        if (!updatedRow.item_name) errors.push('Item name required')
        if (updatedRow.quantity <= 0) errors.push('Quantity must be greater than 0')
        if (updatedRow.rate < 0) errors.push('Rate cannot be negative')
        
        const matchedParty = parties.find(p => p.name.toLowerCase() === updatedRow.party_name.toLowerCase())
        const matchedItem = items.find(i => i.name.toLowerCase() === updatedRow.item_name.toLowerCase())
        
        if (!matchedParty && updatedRow.party_name) errors.push('New party - will be created')
        if (!matchedItem && updatedRow.item_name) errors.push('New item - will be created')
        
        updatedRow.errors = errors
        updatedRow.status = errors.some(e => e.includes('required') || e.includes('must be') || e.includes('cannot be')) ? 'error' :
                           errors.length > 0 ? 'warning' : 'valid'

        return updatedRow
      })
    )
  }, [parties, items])

  const addNewRow = () => {
    const newRow: PurchaseRow = {
      id: `row-${Date.now()}`,
      invoice_number: `${type.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      invoice_date: new Date().toISOString().split('T')[0],
      party_name: '',
      state: '',
      address: '',
      gstin: '',
      item_name: '',
      hsn_code: '',
      quantity: 1,
      rate: 0,
      gst_percent: 18,
      gst_amount: 0,
      total_amount: 0,
      payment_received: 0,
      payment_method: 'Cash',
      notes: '',
      errors: ['Invoice number required', 'Party name required', 'Item name required'],
      status: 'error'
    }
    setData([...data, newRow])
  }

  const deleteRow = (rowId: string) => {
    setData(data.filter(row => row.id !== rowId))
  }

  const submitData = async () => {
    if (!businessId) {
      toast({
        title: "Error",
        description: "Please select a business",
        variant: "destructive"
      })
      return
    }

    const validRows = data.filter(row => row.status !== 'error')
    
    if (validRows.length === 0) {
      toast({
        title: "No valid rows",
        description: "Please fix all errors before submitting",
        variant: "destructive"
      })
      return
    }

    setProcessing(true)
    setProgress(0)

    try {
      const client = getSupabaseClient()
      if (!client) throw new Error("Service unavailable")

      let imported = 0
      const errorMessages: string[] = []

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i]
        setProgress((i / validRows.length) * 90)

        try {
          // Create party if needed
          let selectedParty = parties.find(p => p.id === row.party_id)
          
          if (!selectedParty && row.party_name) {
            const newPartyData = {
              business_id: businessId,
              name: row.party_name,
              type: type === 'purchase' ? "Creditor" : "Debtor",
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

            if (!partyError && newParty) {
              selectedParty = newParty as unknown as Party
              onPartiesUpdate([...parties, selectedParty])
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

            if (!itemError && newItem) {
              selectedItem = {
                id: newItem.id as string,
                name: newItem.name as string,
                hsn_code: newItem.hsn_code as string,
                gst_percent: newItem.gst_percent as number,
                purchase_price: newItem.purchase_price as number,
                unit: newItem.unit as string
              }
              onItemsUpdate([...items, selectedItem])
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
            type: type,
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
                type: type === 'purchase' ? "Paid" : "Received",
                amount: row.payment_received,
                mode: row.payment_method,
                date: row.invoice_date,
                remarks: `Auto-recorded from bulk upload for ${type} ${row.invoice_number}`,
              }
              
              await client.from("payments").insert([paymentData])
            }
            
            imported++
          }
        } catch (error: any) {
          errorMessages.push(`Row ${i + 1}: ${error.message}`)
        }
      }

      setProgress(100)
      
      toast({
        title: imported > 0 ? "Success!" : "Failed",
        description: `Successfully imported ${imported} of ${validRows.length} ${type} invoices`,
        variant: imported > 0 ? "default" : "destructive"
      })

      if (imported > 0) {
        onSuccess?.()
        handleClose()
      }

    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
      setProgress(0)
    }
  }

  const handleClose = () => {
    setStep('upload')
    setData([])
    setEditingCell(null)
    onClose()
  }

  const getStatusIcon = (status: PurchaseRow['status']) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = (status: PurchaseRow['status']) => {
    switch (status) {
      case 'valid': return 'bg-green-50 border-green-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'error': return 'bg-red-50 border-red-200'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {type === 'purchase' ? 'Purchase' : 'Sales'} Excel Uploader
            {step === 'review' && (
              <Badge variant="outline" className="ml-2">
                {data.length} rows loaded
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 p-6">
            {/* Instructions */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Download the template CSV file below</li>
                  <li>• Fill in your {type} data following the column format</li>
                  <li>• Upload the completed CSV to review in Excel format</li>
                  <li>• Missing parties and items will be auto-created</li>
                </ul>
              </CardContent>
            </Card>

            {/* Template Download */}
            <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Download className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Download Template
                </h3>
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Get the CSV template with proper column headers
                </p>
                <Button onClick={downloadTemplate} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                  <Download className="h-4 w-4 mr-2" />
                  Download {type} Template
                </Button>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card className="border-dashed border-2 border-emerald-300 hover:border-emerald-400 transition-colors bg-emerald-50/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-emerald-500 mb-4" />
                <h3 className="text-lg font-semibold text-emerald-800 mb-2">
                  Upload CSV File
                </h3>
                <p className="text-sm text-emerald-700 mb-4 text-center">
                  Select your completed {type} CSV file to review in Excel format
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  id="csvFileInput"
                  disabled={loading}
                />
                <label htmlFor="csvFileInput">
                  <Button asChild disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                    <span>
                      {loading ? (
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
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 p-4">
            {/* Action Bar */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-emerald-50 p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Button onClick={addNewRow} size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
                <Button onClick={() => setStep('upload')} size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New File
                </Button>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{data.filter(r => r.status === 'valid').length} Valid</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>{data.filter(r => r.status === 'warning').length} Warnings</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>{data.filter(r => r.status === 'error').length} Errors</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  Total: ₹{data.reduce((sum, row) => sum + row.total_amount, 0).toFixed(2)}
                </span>
                <Button 
                  onClick={submitData} 
                  disabled={processing || data.filter(r => r.status !== 'error').length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing... {Math.round(progress)}%
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Submit ({data.filter(r => r.status !== 'error').length})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            {processing && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-center text-gray-600">Processing {type} invoices...</p>
              </div>
            )}

            {/* Excel-like Table */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[60vh] border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gradient-to-r from-gray-50 to-blue-50 sticky top-0 z-10">
                      <tr>
                        <th className="w-12 p-3 border-r border-gray-200 font-semibold text-gray-700">#</th>
                        <th className="min-w-[120px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700">Invoice No</th>
                        <th className="min-w-[110px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700">Date</th>
                        <th className="min-w-[180px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Party Name
                        </th>
                        <th className="min-w-[100px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700">State</th>
                        <th className="min-w-[180px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Item Name
                        </th>
                        <th className="min-w-[80px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700">HSN</th>
                        <th className="min-w-[80px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700">Qty</th>
                        <th className="min-w-[90px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700">Rate</th>
                        <th className="min-w-[80px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700">GST%</th>
                        <th className="min-w-[100px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700 flex items-center gap-1">
                          <Calculator className="h-3 w-3" />
                          Total
                        </th>
                        <th className="min-w-[90px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700">Payment</th>
                        <th className="min-w-[80px] p-3 border-r border-gray-200 text-left font-semibold text-gray-700">Mode</th>
                        <th className="w-16 p-3 font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, index) => (
                        <tr key={row.id} className={`${getStatusColor(row.status)} hover:bg-opacity-70 transition-colors border-b`}>
                          <td className="p-2 border-r border-gray-200 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-medium">{index + 1}</span>
                              {getStatusIcon(row.status)}
                            </div>
                          </td>
                          
                          {/* Invoice Number */}
                          <td className="p-2 border-r border-gray-200">
                            <Input
                              value={row.invoice_number}
                              onChange={(e) => updateCell(row.id, 'invoice_number', e.target.value)}
                              className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="INV-001"
                            />
                          </td>

                          {/* Date */}
                          <td className="p-2 border-r border-gray-200">
                            <Input
                              type="date"
                              value={row.invoice_date}
                              onChange={(e) => updateCell(row.id, 'invoice_date', e.target.value)}
                              className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>

                          {/* Party Name with Dropdown */}
                          <td className="p-2 border-r border-gray-200">
                            <Select
                              value={row.party_id || ''}
                              onValueChange={(value) => updateCell(row.id, 'party_id', value)}
                            >
                              <SelectTrigger className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                <SelectValue>
                                  <span className="truncate">{row.party_name || 'Select party'}</span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {parties.map((party) => (
                                  <SelectItem key={party.id} value={party.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{party.name}</span>
                                      <span className="text-xs text-gray-500">{party.state}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                                <div className="border-t p-2">
                                  <Input
                                    value={row.party_name}
                                    onChange={(e) => updateCell(row.id, 'party_name', e.target.value)}
                                    placeholder="Or type new party name"
                                    className="h-7 text-xs"
                                  />
                                </div>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* State */}
                          <td className="p-2 border-r border-gray-200">
                            <Input
                              value={row.state}
                              onChange={(e) => updateCell(row.id, 'state', e.target.value)}
                              className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="State"
                            />
                          </td>

                          {/* Item Name with Dropdown */}
                          <td className="p-2 border-r border-gray-200">
                            <Select
                              value={row.item_id || ''}
                              onValueChange={(value) => updateCell(row.id, 'item_id', value)}
                            >
                              <SelectTrigger className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                <SelectValue>
                                  <span className="truncate">{row.item_name || 'Select item'}</span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{item.name}</span>
                                      <span className="text-xs text-gray-500">₹{item.purchase_price} | {item.hsn_code}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                                <div className="border-t p-2">
                                  <Input
                                    value={row.item_name}
                                    onChange={(e) => updateCell(row.id, 'item_name', e.target.value)}
                                    placeholder="Or type new item name"
                                    className="h-7 text-xs"
                                  />
                                </div>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* HSN Code */}
                          <td className="p-2 border-r border-gray-200">
                            <Input
                              value={row.hsn_code}
                              onChange={(e) => updateCell(row.id, 'hsn_code', e.target.value)}
                              className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="HSN"
                            />
                          </td>

                          {/* Quantity */}
                          <td className="p-2 border-r border-gray-200">
                            <Input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => updateCell(row.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="0"
                              min="0"
                            />
                          </td>

                          {/* Rate */}
                          <td className="p-2 border-r border-gray-200">
                            <Input
                              type="number"
                              value={row.rate}
                              onChange={(e) => updateCell(row.id, 'rate', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                            />
                          </td>

                          {/* GST Percent */}
                          <td className="p-2 border-r border-gray-200">
                            <Input
                              type="number"
                              value={row.gst_percent}
                              onChange={(e) => updateCell(row.id, 'gst_percent', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="18"
                              min="0"
                              max="100"
                            />
                          </td>

                          {/* Total Amount (calculated) */}
                          <td className="p-2 border-r border-gray-200">
                            <div className="h-8 px-2 flex items-center bg-blue-50 rounded text-xs font-semibold text-blue-800">
                              ₹{row.total_amount.toFixed(2)}
                            </div>
                          </td>

                          {/* Payment Received */}
                          <td className="p-2 border-r border-gray-200">
                            <Input
                              type="number"
                              value={row.payment_received}
                              onChange={(e) => updateCell(row.id, 'payment_received', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                            />
                          </td>

                          {/* Payment Method */}
                          <td className="p-2 border-r border-gray-200">
                            <Select
                              value={row.payment_method}
                              onValueChange={(value) => updateCell(row.id, 'payment_method', value)}
                            >
                              <SelectTrigger className="h-8 text-xs border-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="UPI">UPI</SelectItem>
                                <SelectItem value="Bank">Bank</SelectItem>
                                <SelectItem value="Credit">Credit</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Delete Action */}
                          <td className="p-2 text-center">
                            <Button
                              onClick={() => deleteRow(row.id)}
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}

                      {data.length === 0 && (
                        <tr>
                          <td colSpan={14} className="p-12 text-center text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No data loaded</p>
                            <p className="text-sm">Upload a CSV file or add rows manually to get started</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            {data.length > 0 && (
              <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">{data.length}</div>
                      <div className="text-gray-600">Total Rows</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{data.filter(r => r.status === 'valid').length}</div>
                      <div className="text-gray-600">Valid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{data.filter(r => r.status === 'error').length}</div>
                      <div className="text-gray-600">Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">₹{data.reduce((sum, row) => sum + row.total_amount, 0).toFixed(2)}</div>
                      <div className="text-gray-600">Total Amount</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="border-t bg-gray-50 p-4">
          <Button variant="outline" onClick={handleClose} disabled={processing}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
