"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
      payments: 0
    }

    // Import parties
    if (data.parties && Array.isArray(data.parties)) {
      setUploadProgress(25)
      for (const party of data.parties) {
        try {
          await supabase.from("parties").insert([{
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
    }

    // Import invoices
    if (data.invoices && Array.isArray(data.invoices)) {
      setUploadProgress(75)
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
    }

    // Import payments
    if (data.payments && Array.isArray(data.payments)) {
      setUploadProgress(90)
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
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    
    // Detect CSV type based on headers
    let type = 'unknown'
    if (headers.includes('name') && headers.includes('mobile')) {
      type = 'parties'
    } else if (headers.includes('name') && headers.includes('sales_price')) {
      type = 'items'
    }

    if (type === 'unknown') {
      setUploadResult({
        success: false,
        message: "Unable to detect CSV format. Please check the column headers."
      })
      return
    }

    let imported = 0
    const total = lines.length - 1

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue

      const values = lines[i].split(',').map(v => v.trim())
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
        }
        imported++
      } catch (error) {
        console.error("Error importing row:", error)
      }

      setUploadProgress((i / total) * 100)
    }

    setUploadResult({
      success: true,
      message: `Successfully imported ${imported} ${type}!`,
      details: { [type]: imported }
    })
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
        <h1 className="text-2xl font-bold text-gray-900">Upload Data</h1>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList>
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="templates">Download Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Data Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drag and drop your files here
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    or click to select files
                  </p>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                    id="fileInput"
                  />
                  <label htmlFor="fileInput">
                    <Button asChild>
                      <span>Select Files</span>
                    </Button>
                  </label>
                  <p className="text-xs text-gray-400 mt-2">
                    Supported formats: JSON, CSV
                  </p>
                </div>

                {uploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Uploading...</span>
                      <span className="text-sm text-gray-500">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
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
                    Download Parties Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
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
                    Download Items Template
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
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• <strong>JSON Format:</strong> You can upload backup files exported from the Settings page</p>
                  <p>• <strong>CSV Format:</strong> Use the templates provided above for proper column structure</p>
                  <p>• <strong>Data Validation:</strong> Ensure all required fields are filled and data types are correct</p>
                  <p>• <strong>Duplicates:</strong> The system will skip duplicate entries based on unique identifiers</p>
                  <p>• <strong>Large Files:</strong> For files with many records, the import process may take some time</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}