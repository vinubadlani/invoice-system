"use client"

import { useState, useEffect } from "react"
import { getCurrentUser, queryBuilder, insertData, updateData, deleteData } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Download, Search, Filter, Receipt, TrendingUp, DollarSign, Calendar, Upload, FileText } from "lucide-react"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"
import * as Papa from "papaparse"

interface Expense {
  id: string
  business_id: string
  date: string
  category: string
  description: string
  amount: number
  receipt_url?: string
  created_at: string
  updated_at: string
}

interface ExpenseCategory {
  id: string
  name: string
  description?: string
}

const DEFAULT_CATEGORIES = [
  "Office Supplies", "Travel", "Marketing", "Utilities", "Professional Services",
  "Equipment", "Maintenance", "Software", "Insurance", "Rent", "Meals", "Other"
]

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{success: boolean, message: string} | null>(null)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: "",
    description: "",
    amount: "",
    receipt_url: ""
  })

  const { toast } = useToast()

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadExpenses(business.id)
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    filterExpenses()
  }, [expenses, searchTerm, selectedCategory, dateFrom, dateTo])

  const loadExpenses = async (businessId: string) => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      const expensesData = await queryBuilder(
        'expenses',
        '*',
        { business_id: businessId },
        { orderBy: 'date', ascending: false }
      )
      
      setExpenses(Array.isArray(expensesData) ? expensesData as unknown as Expense[] : [])
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterExpenses = () => {
    let filtered = expenses

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(expense => expense.category === selectedCategory)
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(expense => new Date(expense.date) >= new Date(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter(expense => new Date(expense.date) <= new Date(dateTo))
    }

    setFilteredExpenses(filtered)
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: "",
      description: "",
      amount: "",
      receipt_url: ""
    })
    setEditingExpense(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!businessId || !formData.category || !formData.description || !formData.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      const user = await getCurrentUser()
      const expenseData = {
        business_id: businessId,
        date: formData.date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        receipt_url: formData.receipt_url || null
      }

      if (editingExpense) {
        const result = await updateData('expenses', editingExpense.id, {
          ...expenseData,
          updated_at: new Date().toISOString()
        })
        if (result.error) throw result.error
        
        toast({
          title: "Success",
          description: "Expense updated successfully"
        })
      } else {
        const result = await insertData('expenses', expenseData)
        if (result.error) throw result.error
        
        toast({
          title: "Success",
          description: "Expense recorded successfully"
        })
      }

      setIsDialogOpen(false)
      resetForm()
      loadExpenses(businessId)
    } catch (error) {
      console.error("Error saving expense:", error)
      toast({
        title: "Error",
        description: "Failed to save expense",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (expense: Expense) => {
    setFormData({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      receipt_url: expense.receipt_url || ""
    })
    setEditingExpense(expense)
    setIsDialogOpen(true)
  }

  const handleDelete = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return

    try {
      const result = await deleteData('expenses', expenseId)
      if (result.error) throw result.error
      
      toast({
        title: "Success",
        description: "Expense deleted successfully"
      })
      
      loadExpenses(businessId)
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive"
      })
    }
  }

  const exportExpenses = () => {
    const csvContent = [
      ['Date', 'Category', 'Description', 'Amount', 'Receipt URL'],
      ...filteredExpenses.map(expense => [
        new Date(expense.date).toLocaleDateString('en-IN'),
        expense.category,
        expense.description,
        expense.amount,
        expense.receipt_url || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const downloadTemplate = () => {
    const csvContent = "date,description,category,amount,receipt_url\n" +
                     "2024-01-15,Office Rent,Rent,15000,\n" +
                     "2024-01-16,Internet Bill,Utilities,2500,\n" +
                     "2024-01-17,Travel Reimbursement,Travel,1200,\n"
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = "expenses_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleBulkUpload = async (file: File) => {
    if (!businessId) {
      toast({
        title: "Error",
        description: "Please select a business before uploading expenses.",
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    setUploadResult(null)

    try {
      const text = await file.text()
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const data = results.data as any[]
          
          if (data.length === 0) {
            setUploadResult({
              success: false,
              message: "CSV file is empty or has no valid data."
            })
            setUploading(false)
            return
          }

          let imported = 0
          const errorMessages: string[] = []

          for (let i = 0; i < data.length; i++) {
            const row = data[i]
            
            try {
              // Normalize field names to handle different column headers
              const expenseData = {
                business_id: businessId,
                date: row.date || row.expense_date || row.transaction_date || new Date().toISOString().split('T')[0],
                category: row.category || row.expense_category || row.expense_type || 'Other',
                description: row.description || row.expense_description || row.details || '',
                amount: parseFloat(row.amount || row.expense_amount || row.cost) || 0,
                receipt_url: row.receipt_url || row.receipt || null
              }

              // Validate required fields
              if (!expenseData.description.trim()) {
                errorMessages.push(`Row ${i + 1}: Description is required`)
                continue
              }
              if (!expenseData.category.trim()) {
                errorMessages.push(`Row ${i + 1}: Category is required`)
                continue
              }
              if (expenseData.amount <= 0) {
                errorMessages.push(`Row ${i + 1}: Valid amount is required`)
                continue
              }

              const result = await insertData('expenses', expenseData)
              if (result.error) {
                errorMessages.push(`Row ${i + 1}: ${result.error.message}`)
              } else {
                imported++
              }
            } catch (error: any) {
              errorMessages.push(`Row ${i + 1}: ${error.message}`)
            }
          }

          setUploadResult({
            success: imported > 0,
            message: `Successfully imported ${imported} of ${data.length} expenses. ${errorMessages.length} errors occurred.`
          })

          if (imported > 0) {
            loadExpenses(businessId)
            toast({
              title: "Bulk Upload Complete",
              description: `Successfully imported ${imported} expenses.`
            })
          }

          if (errorMessages.length > 0) {
            console.log("Upload errors:", errorMessages)
          }
        },
        error: (error: any) => {
          console.error("CSV parsing error:", error)
          setUploadResult({
            success: false,
            message: "Error parsing CSV file. Please check the file format."
          })
        }
      })
    } catch (error: any) {
      setUploadResult({
        success: false,
        message: `Upload failed: ${error.message}`
      })
    } finally {
      setUploading(false)
    }
  }

  // Calculate statistics
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlyExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date)
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
  }).reduce((sum, expense) => sum + expense.amount, 0)

  const categoryTotals = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const topCategory = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0]

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Expense Management</h1>
              <p className="text-slate-600 dark:text-slate-400">Track and manage your business expenses</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={exportExpenses} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {/* <Button onClick={() => setShowBulkUpload(true)} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button> */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({...formData, amount: e.target.value})}
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Brief description of the expense"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="receipt_url">Receipt URL</Label>
                      <Input
                        id="receipt_url"
                        value={formData.receipt_url}
                        onChange={(e) => setFormData({...formData, receipt_url: e.target.value})}
                        placeholder="Link to receipt or document"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingExpense ? 'Update' : 'Save'} Expense
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-blue-700">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800">₹{totalExpenses.toLocaleString()}</div>
                <p className="text-xs text-blue-600">Filtered period</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-green-700">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-800">₹{monthlyExpenses.toLocaleString()}</div>
                <p className="text-xs text-green-600">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-purple-700">Top Category</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-800">
                  {topCategory ? topCategory[0] : 'N/A'}
                </div>
                <p className="text-xs text-purple-600">
                  {topCategory ? `₹${topCategory[1].toLocaleString()}` : 'No expenses'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-orange-700">Total Records</CardTitle>
                <Receipt className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-800">{filteredExpenses.length}</div>
                <p className="text-xs text-orange-600">Expense entries</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search expenses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {DEFAULT_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">To Date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Expense Records</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{new Date(expense.date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">
                              {expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{expense.description}</TableCell>
                          <TableCell>
                            <span className="font-semibold text-red-600">₹{expense.amount.toLocaleString()}</span>
                          </TableCell>
                          <TableCell>
                            {expense.receipt_url ? (
                              <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                View
                              </a>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(expense)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(expense.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Expenses Found</h3>
                  <p className="text-gray-500">Start by adding your first expense record</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bulk Upload Dialog */}
        <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Upload Expenses
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>Upload expenses from a CSV file. The file should contain columns for:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>date</strong> - Date of expense (YYYY-MM-DD)</li>
                  <li><strong>description</strong> - Description of the expense</li>
                  <li><strong>category</strong> - Expense category</li>
                  <li><strong>amount</strong> - Amount spent</li>
                  <li><strong>receipt_url</strong> - Optional receipt link</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button onClick={downloadTemplate} variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div>
                <Label htmlFor="expense-file">Select CSV File</Label>
                <Input
                  id="expense-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleBulkUpload(file)
                    }
                  }}
                  disabled={uploading}
                />
              </div>

              {uploading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Processing expenses...</p>
                </div>
              )}

              {uploadResult && (
                <div className={`p-3 rounded-lg ${uploadResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <p className="text-sm">{uploadResult.message}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => {
                  setShowBulkUpload(false)
                  setUploadResult(null)
                }}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  )
}
