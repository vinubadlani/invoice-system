"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle, Users, Package, Receipt, CreditCard, BookOpen, FileSpreadsheet, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"

interface UploadResult {
  success: boolean
  message: string
  details?: any
}

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [businessId, setBusinessId] = useState<string>("")

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
    }
  }, [])

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

  const detectCsvType = (headers: string[]) => {
    const headerStr = headers.join(',').toLowerCase()
    
    if (headerStr.includes('name') && headerStr.includes('mobile') && headerStr.includes('gstin')) {
      return 'parties'
    } else if (headerStr.includes('name') && headerStr.includes('sales_price') && headerStr.includes('hsn_code')) {
      return 'items'
    } else if (headerStr.includes('invoice_no') && headerStr.includes('party_name') && headerStr.includes('net_total')) {
      return 'invoices'
    } else if (headerStr.includes('payment_date') && headerStr.includes('amount') && headerStr.includes('payment_method')) {
      return 'payments'
    } else if (headerStr.includes('account_name') && headerStr.includes('debit') && headerStr.includes('credit')) {
      return 'ledger'
    }
    return 'unknown'
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

    let imported = {
      parties: 0,
      items: 0,
      invoices: 0,
      payments: 0,
      ledger: 0
    }

    const sections = Object.keys(data).length
    let currentSection = 0

    // Import parties
    if (data.parties && Array.isArray(data.parties)) {
      setUploadProgress((currentSection / sections) * 100)
      for (const party of data.parties) {
        try {
          await supabase.from("parties").insert([{
            ...party,
            business_id: businessId,
            id: undefined
          }])
          imported.parties++
        } catch (error) {
          console.error("Error importing party:", error)
        }
      }
      currentSection++
    }

    // Import items
    if (data.items && Array.isArray(data.items)) {
      setUploadProgress((currentSection / sections) * 100)
      for (const item of data.items) {
        try {
          await supabase.from("items").insert([{
            ...item,
            business_id: businessId,
            id: undefined
          }])
          imported.items++
        } catch (error) {
          console.error("Error importing item:", error)
        }
      }
      currentSection++
    }

    // Import invoices
    if (data.invoices && Array.isArray(data.invoices)) {
      setUploadProgress((currentSection / sections) * 100)
      for (const invoice of data.invoices) {
        try {
          await supabase.from("invoices").insert([{
            ...invoice,
            business_id: businessId,
            id: undefined
          }])
          imported.invoices++
        } catch (error) {
          console.error("Error importing invoice:", error)
        }
      }
      currentSection++
    }

    // Import payments
    if (data.payments && Array.isArray(data.payments)) {
      setUploadProgress((currentSection / sections) * 100)
      for (const payment of data.payments) {
        try {
          await supabase.from("payments").insert([{
            ...payment,
            business_id: businessId,
            id: undefined
          }])
          imported.payments++
        } catch (error) {
          console.error("Error importing payment:", error)
        }
      }
      currentSection++
    }

    setUploadProgress(100)
    setUploadResult({
      success: true,
      message: "Data imported successfully!",
      details: imported
    })
  }

  const handleCsvUpload = async (file: File) => {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim() !== '')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    const type = detectCsvType(headers)

    if (type === 'unknown') {
      setUploadResult({
        success: false,
        message: "Unable to detect CSV format. Please check the column headers and use our templates."
      })
      return
    }

    let imported = 0
    const total = lines.length - 1

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue

      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      try {
        if (type === 'parties') {
          await supabase.from("parties").insert([{
            ...row,
            business_id: businessId,
            opening_balance: parseFloat(row.opening_balance) || 0
          }])
        } else if (type === 'items') {
          await supabase.from("items").insert([{
            ...row,
            business_id: businessId,
            sales_price: parseFloat(row.sales_price) || 0,
            purchase_price: parseFloat(row.purchase_price) || 0,
            gst_percent: parseFloat(row.gst_percent) || 0,
            opening_stock: parseFloat(row.opening_stock) || 0
          }])
        } else if (type === 'invoices') {
          await supabase.from("invoices").insert([{
            ...row,
            business_id: businessId,
            net_total: parseFloat(row.net_total) || 0,
            total_tax: parseFloat(row.total_tax) || 0,
            payment_received: parseFloat(row.payment_received) || 0,
            balance_due: parseFloat(row.balance_due) || 0,
            items: JSON.parse(row.items || '[]')
          }])
        } else if (type === 'payments') {
          await supabase.from("payments").insert([{
            ...row,
            business_id: businessId,
            amount: parseFloat(row.amount) || 0
          }])
        }
        imported++
      } catch (error) {
        console.error("Error importing row:", error)
      }

      setUploadProgress((i / total) * 100)
    }

    setUploadResult({
      success: true,
      message: `Successfully imported ${imported} ${type} records!`,
      details: { [type]: imported }
    })
  }

  const downloadTemplate = (type: string) => {
    let csvContent = ""
    let filename = ""

    switch (type) {
      case 'parties':
        csvContent = `"name","mobile","email","gstin","pan","type","opening_balance","balance_type","address","city","state","pincode"
"ABC Traders Ltd","9876543210","abc@traders.com","27ABCDE1234F1Z5","ABCDE1234F","Debtor","5000","To Collect","123 Business Park, Sector 5","Mumbai","Maharashtra","400001"
"XYZ Suppliers","9123456789","contact@xyzsuppliers.com","29FGHIJ5678K2L9","FGHIJ5678K","Creditor","0","To Pay","456 Industrial Area","Delhi","Delhi","110001"
"Retail Customer","9988776655","","","","Debtor","1500","To Collect","789 Market Street","Pune","Maharashtra","411001"`
        filename = "parties_template.csv"
        break

      case 'items':
        csvContent = `"name","code","hsn_code","gst_percent","unit","sales_price","purchase_price","opening_stock","description"
"Premium Widget","WDG001","8414","18","Pcs","150","120","100","High quality premium widget"
"Standard Component","STD002","8415","12","Kg","80","65","50","Standard industrial component"
"Deluxe Service","SRV003","9983","18","Hour","500","400","0","Professional consulting service"`
        filename = "items_template.csv"
        break

      case 'sales':
        csvContent = `"invoice_no","date","party_name","party_id","gstin","state","address","net_total","total_tax","payment_received","balance_due","type","items"
"INV-001","2024-01-15","ABC Traders Ltd","party1","27ABCDE1234F1Z5","Maharashtra","123 Business Park","11800","1800","10000","1800","sales","[{""item_name"":""Widget"",""qty"":10,""rate"":100,""total"":1000}]"
"INV-002","2024-01-16","Retail Customer","party2","","Maharashtra","789 Market Street","5900","900","5900","0","sales","[{""item_name"":""Component"",""qty"":5,""rate"":100,""total"":500}]"`
        filename = "sales_template.csv"
        break

      case 'purchases':
        csvContent = `"invoice_no","date","party_name","party_id","gstin","state","address","net_total","total_tax","payment_received","balance_due","type","items"
"PUR-001","2024-01-15","XYZ Suppliers","party3","29FGHIJ5678K2L9","Delhi","456 Industrial Area","9440","1440","8000","1440","purchase","[{""item_name"":""Raw Material"",""qty"":20,""rate"":40,""total"":800}]"
"PUR-002","2024-01-16","Global Imports","party4","27KLMNO9012P3Q4","Karnataka","321 Export House","23600","3600","20000","3600","purchase","[{""item_name"":""Equipment"",""qty"":2,""rate"":1000,""total"":2000}]"`
        filename = "purchases_template.csv"
        break

      case 'payments':
        csvContent = `"payment_date","party_name","party_id","amount","payment_method","payment_type","reference_no","notes"
"2024-01-15","ABC Traders Ltd","party1","5000","Bank Transfer","Payment In","TXN123456","Partial payment for Invoice INV-001"
"2024-01-16","XYZ Suppliers","party3","8000","Cheque","Payment Out","CHQ789012","Payment for Purchase PUR-001"
"2024-01-17","Retail Customer","party2","1500","Cash","Payment In","CASH001","Cash payment received"`
        filename = "payments_template.csv"
        break

      case 'ledger':
        csvContent = `"date","account_name","account_type","debit","credit","narration","reference"
"2024-01-15","Sales Account","Income","0","10000","Sales to ABC Traders","INV-001"
"2024-01-15","GST Output","Liability","0","1800","GST on sales","INV-001"
"2024-01-16","Purchase Account","Expense","8000","0","Purchase from XYZ Suppliers","PUR-001"
"2024-01-16","GST Input","Asset","1440","0","GST on purchases","PUR-001"
"2024-01-17","Cash Account","Asset","5000","0","Cash received from customer","CASH001"`
        filename = "ledger_template.csv"
        break

      case 'bank_accounts':
        csvContent = `"account_name","account_number","bank_name","branch","ifsc_code","account_type","opening_balance"
"Current Account","1234567890","HDFC Bank","Mumbai Main","HDFC0000123","Current","50000"
"Savings Account","9876543210","SBI","Delhi Branch","SBIN0000456","Savings","25000"
"Business Account","5555666677","ICICI Bank","Pune Camp","ICIC0005555","Current","75000"`
        filename = "bank_accounts_template.csv"
        break

      default:
        return
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const templates = [
    {
      type: 'parties',
      title: 'Parties (Customers/Suppliers)',
      description: 'Import customer and supplier information with contact details and opening balances',
      icon: Users,
      color: 'from-blue-500 to-cyan-600',
      columns: ['name', 'mobile', 'email', 'gstin', 'pan', 'type', 'opening_balance', 'address', 'city', 'state']
    },
    {
      type: 'items',
      title: 'Items/Products',
      description: 'Import product catalog with pricing, tax rates, and stock information',
      icon: Package,
      color: 'from-green-500 to-emerald-600',
      columns: ['name', 'code', 'hsn_code', 'gst_percent', 'unit', 'sales_price', 'purchase_price', 'opening_stock']
    },
    {
      type: 'sales',
      title: 'Sales Invoices',
      description: 'Import sales transactions and invoice data',
      icon: Receipt,
      color: 'from-purple-500 to-pink-600',
      columns: ['invoice_no', 'date', 'party_name', 'net_total', 'payment_received', 'balance_due', 'items']
    },
    {
      type: 'purchases',
      title: 'Purchase Orders',
      description: 'Import purchase transactions and vendor bills',
      icon: FileSpreadsheet,
      color: 'from-orange-500 to-red-600',
      columns: ['invoice_no', 'date', 'party_name', 'net_total', 'payment_received', 'balance_due', 'items']
    },
    {
      type: 'payments',
      title: 'Payment Records',
      description: 'Import payment transactions and receipts',
      icon: CreditCard,
      color: 'from-indigo-500 to-purple-600',
      columns: ['payment_date', 'party_name', 'amount', 'payment_method', 'payment_type', 'reference_no']
    },
    {
      type: 'ledger',
      title: 'Ledger Entries',
      description: 'Import general ledger entries for accounting',
      icon: BookOpen,
      color: 'from-teal-500 to-cyan-600',
      columns: ['date', 'account_name', 'account_type', 'debit', 'credit', 'narration', 'reference']
    },
    {
      type: 'bank_accounts',
      title: 'Bank Accounts',
      description: 'Import bank account information and opening balances',
      icon: Database,
      color: 'from-gray-500 to-slate-600',
      columns: ['account_name', 'account_number', 'bank_name', 'branch', 'ifsc_code', 'account_type']
    }
  ]

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg">
                <Upload className="h-8 w-8 text-white" />
              </div>
              Data Import Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Import your business data quickly and efficiently</p>
          </div>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="upload" className="text-lg py-3">Upload Files</TabsTrigger>
            <TabsTrigger value="templates" className="text-lg py-3">Download Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-6 w-6" />
                  Upload Data Files
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                    dragActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105"
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Drag and drop your files here
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    or click to select files from your computer
                  </p>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                    id="fileInput"
                  />
                  <label htmlFor="fileInput">
                    <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      <span className="gap-2">
                        <FileText className="h-5 w-5" />
                        Select Files
                      </span>
                    </Button>
                  </label>
                  <div className="flex justify-center gap-4 mt-6">
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                      ✓ CSV Files
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      ✓ JSON Files
                    </Badge>
                  </div>
                </div>

                {uploading && (
                  <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-medium text-gray-900 dark:text-gray-100">Processing your data...</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full h-3" />
                  </div>
                )}

                {uploadResult && (
                  <Alert className={`mt-8 border-0 shadow-lg ${uploadResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    {uploadResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                    <AlertDescription className={`text-lg ${uploadResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                      {uploadResult.message}
                      {uploadResult.details && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(uploadResult.details).map(([key, value]) => (
                            <div key={key} className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                              <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">{key}</div>
                              <div className="text-xl font-bold">{String(value)}</div>
                            </div>
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
              {templates.map((template) => {
                const IconComponent = template.icon
                return (
                  <Card key={template.type} className="shadow-lg border-0 overflow-hidden hover:shadow-xl transition-shadow">
                    <CardHeader className={`bg-gradient-to-r ${template.color} text-white p-6`}>
                      <CardTitle className="flex items-center gap-3">
                        <IconComponent className="h-6 w-6" />
                        {template.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm leading-relaxed">
                        {template.description}
                      </p>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sample Columns:</h4>
                        <div className="flex flex-wrap gap-1">
                          {template.columns.slice(0, 4).map((col) => (
                            <Badge key={col} variant="outline" className="text-xs">
                              {col}
                            </Badge>
                          ))}
                          {template.columns.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.columns.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        onClick={() => downloadTemplate(template.type)} 
                        className="w-full gap-2"
                        variant="outline"
                      >
                        <Download className="h-4 w-4" />
                        Download Template
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Guidelines Card */}
            <Card className="mt-8 shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <AlertCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  Import Guidelines & Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">📊 File Formats</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• <strong>CSV:</strong> Use our templates for proper column structure</li>
                      <li>• <strong>JSON:</strong> Upload backup files from Settings export</li>
                      <li>• <strong>Encoding:</strong> Use UTF-8 encoding for special characters</li>
                      <li>• <strong>Size Limit:</strong> Maximum 10MB per file</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">✅ Data Validation</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Ensure all required fields are filled</li>
                      <li>• Use correct data types (numbers, dates, text)</li>
                      <li>• GSTIN format: 15 characters alphanumeric</li>
                      <li>• Date format: YYYY-MM-DD (ISO format)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">🔄 Processing</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Large files may take several minutes to process</li>
                      <li>• Duplicate entries are automatically skipped</li>
                      <li>• Invalid rows are logged for review</li>
                      <li>• Progress is shown during upload</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">🛡️ Data Security</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• All data is encrypted during transfer</li>
                      <li>• Files are processed and deleted immediately</li>
                      <li>• No data is stored on external servers</li>
                      <li>• Backup your data before bulk imports</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}