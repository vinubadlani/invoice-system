"use client"

import type React from "react"
import { useState } from "react"
import { useApp, type InvoiceItem } from "../context/AppContext"
import { Plus, Trash2, Save, Package, Calendar, User, MapPin, FileText, Calculator, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"

export default function PurchaseEntry() {
  const { parties, items, addInvoice } = useApp()
  const [formData, setFormData] = useState({
    invoiceNo: `PUR-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split("T")[0],
    partyName: "",
    gstin: "",
    state: "",
    address: "",
  })

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      itemName: "",
      hsn: "",
      qty: 1,
      rate: 0,
      gstPercent: 0,
      taxAmount: 0,
      total: 0,
    },
  ])

  const [totals, setTotals] = useState({
    totalTax: 0,
    roundOff: 0,
    netTotal: 0,
    paymentReceived: 0,
    balanceDue: 0,
  })

  const handlePartyChange = (partyName: string) => {
    const party = parties.find((p) => p.name === partyName)
    if (party) {
      setFormData({
        ...formData,
        partyName,
        gstin: party.gstin,
        state: party.state,
        address: party.address,
      })
    }
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...invoiceItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    // Auto-fill item details when item name is selected
    if (field === "itemName") {
      const item = items.find((i) => i.name === value)
      if (item) {
        updatedItems[index] = {
          ...updatedItems[index],
          hsn: item.hsnCode,
          rate: item.purchasePrice,
          gstPercent: item.gstPercent,
        }
      }
    }

    // Calculate totals for the item
    const item = updatedItems[index]
    const subtotal = item.qty * item.rate
    item.taxAmount = (subtotal * item.gstPercent) / 100
    item.total = subtotal + item.taxAmount

    setInvoiceItems(updatedItems)
    calculateTotals(updatedItems)
  }

  const calculateTotals = (items: InvoiceItem[]) => {
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0)
    const grossTotal = items.reduce((sum, item) => sum + item.total, 0)
    const roundOff = Math.round(grossTotal) - grossTotal
    const netTotal = Math.round(grossTotal)

    setTotals({
      totalTax,
      roundOff,
      netTotal,
      paymentReceived: totals.paymentReceived,
      balanceDue: netTotal - totals.paymentReceived,
    })
  }

  const addNewItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      {
        id: Date.now().toString(),
        itemName: "",
        hsn: "",
        qty: 1,
        rate: 0,
        gstPercent: 0,
        taxAmount: 0,
        total: 0,
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
      paymentReceived: amount,
      balanceDue: totals.netTotal - amount,
    }
    setTotals(newTotals)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const invoice = {
      ...formData,
      items: invoiceItems,
      ...totals,
      type: "purchase" as const,
    }
    addInvoice(invoice)

    // Reset form
    setFormData({
      invoiceNo: `PUR-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split("T")[0],
      partyName: "",
      gstin: "",
      state: "",
      address: "",
    })
    setInvoiceItems([
      {
        id: "1",
        itemName: "",
        hsn: "",
        qty: 1,
        rate: 0,
        gstPercent: 0,
        taxAmount: 0,
        total: 0,
      },
    ])
    setTotals({
      totalTax: 0,
      roundOff: 0,
      netTotal: 0,
      paymentReceived: 0,
      balanceDue: 0,
    })

    alert("Purchase invoice saved successfully!")
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="p-6 space-y-8">
          {/* Modern Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-800 rounded-2xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-green-600/20 backdrop-blur-sm"></div>
            <div className="relative p-8 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
                    Purchase Entry
                  </h1>
                  <p className="text-emerald-100 text-lg opacity-90">
                    Create and manage purchase transactions with ease
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
                      value={formData.invoiceNo}
                      onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
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
                      value={formData.partyName} 
                      onValueChange={(value) => handlePartyChange(value)}
                    >
                      <SelectTrigger className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500">
                        <SelectValue placeholder="Select Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {parties
                          .filter((p) => p.type === "Creditor")
                          .map((party) => (
                            <SelectItem key={party.id} value={party.name}>
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
                              value={item.itemName}
                              onValueChange={(value) => handleItemChange(index, "itemName", value)}
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
                              value={item.hsn}
                              onChange={(e) => handleItemChange(index, "hsn", e.target.value)}
                              placeholder="HSN"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <Input
                              type="number"
                              className="w-20 border-slate-300"
                              value={item.qty}
                              onChange={(e) => handleItemChange(index, "qty", Number.parseInt(e.target.value) || 0)}
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
                              value={item.gstPercent}
                              onChange={(e) => handleItemChange(index, "gstPercent", Number.parseFloat(e.target.value) || 0)}
                              min="0"
                              max="28"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                              ₹{item.taxAmount.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                              ₹{item.total.toFixed(2)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Total Tax</Label>
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
                      <div className="text-lg font-bold text-amber-700">₹{totals.totalTax.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Round Off</Label>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <div className="text-lg font-bold text-blue-700">₹{totals.roundOff.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Net Total</Label>
                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
                      <div className="text-xl font-bold text-emerald-700">₹{totals.netTotal.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Payment Made</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="border-slate-300 focus:border-purple-500 focus:ring-purple-500 text-lg font-semibold"
                      value={totals.paymentReceived}
                      onChange={(e) => handlePaymentChange(Number.parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Balance Due</Label>
                    <div className={`p-3 border rounded-lg ${
                      totals.balanceDue > 0 
                        ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200' 
                        : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                    }`}>
                      <div className={`text-xl font-bold ${
                        totals.balanceDue > 0 ? 'text-red-700' : 'text-green-700'
                      }`}>
                        ₹{totals.balanceDue.toFixed(2)}
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
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-3 text-lg font-semibold shadow-xl"
              >
                <Save className="h-5 w-5 mr-2" />
                Save Purchase
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
