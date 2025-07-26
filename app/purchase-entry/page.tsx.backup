"use client"

import type React from "react"

import { useState } from "react"
import { useApp, type InvoiceItem } from "../context/AppContext"
import { Plus, Trash2, Save } from "lucide-react"

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Purchase Entry</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase No *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.invoiceNo}
                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
              <select
                required
                className="form-input"
                value={formData.partyName}
                onChange={(e) => handlePartyChange(e.target.value)}
              >
                <option value="">Select Supplier</option>
                {parties
                  .filter((p) => p.type === "Creditor")
                  .map((party) => (
                    <option key={party.id} value={party.name}>
                      {party.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <input
                type="text"
                className="form-input"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                className="form-input"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            <button type="button" onClick={addNewItem} className="btn-primary flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">S.No</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Item Name</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">HSN</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Qty</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Rate</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">GST %</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Tax Amt</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Total</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2 px-3">{index + 1}</td>
                    <td className="py-2 px-3">
                      <select
                        className="form-input min-w-[150px]"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(index, "itemName", e.target.value)}
                      >
                        <option value="">Select Item</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.name}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        className="form-input w-20"
                        value={item.hsn}
                        onChange={(e) => handleItemChange(index, "hsn", e.target.value)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        className="form-input w-20"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, "qty", Number.parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        className="form-input w-24"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, "rate", Number.parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        className="form-input w-20"
                        value={item.gstPercent}
                        onChange={(e) => handleItemChange(index, "gstPercent", Number.parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2 px-3 text-sm">₹{item.taxAmount.toFixed(2)}</td>
                    <td className="py-2 px-3 text-sm font-medium">₹{item.total.toFixed(2)}</td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900"
                        disabled={invoiceItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Tax</label>
              <input type="text" className="form-input bg-gray-50" value={`₹${totals.totalTax.toFixed(2)}`} readOnly />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Round Off</label>
              <input type="text" className="form-input bg-gray-50" value={`₹${totals.roundOff.toFixed(2)}`} readOnly />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Net Total</label>
              <input
                type="text"
                className="form-input bg-gray-50 font-bold"
                value={`₹${totals.netTotal.toFixed(2)}`}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Made</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={totals.paymentReceived}
                onChange={(e) => handlePaymentChange(Number.parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Balance Due</label>
              <input
                type="text"
                className={`form-input bg-gray-50 font-bold ${totals.balanceDue > 0 ? "text-red-600" : "text-green-600"}`}
                value={`₹${totals.balanceDue.toFixed(2)}`}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button type="submit" className="btn-primary flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Save Purchase</span>
          </button>
        </div>
      </form>
    </div>
  )
}
