"use client"

import type React from "react"

import { useState } from "react"
import { useApp } from "../context/AppContext"
import { Plus, Save, X } from "lucide-react"

export default function Payments() {
  const { parties, payments, addPayment } = useApp()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    partyName: "",
    type: "Received" as "Received" | "Paid",
    invoiceNo: "",
    amount: 0,
    mode: "Cash",
    remarks: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addPayment(formData)
    resetForm()
    alert("Payment recorded successfully!")
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      partyName: "",
      type: "Received",
      invoiceNo: "",
      amount: 0,
      mode: "Cash",
      remarks: "",
    })
    setIsFormOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <button onClick={() => setIsFormOpen(true)} className="btn-primary flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Party Name *</label>
              <select
                required
                className="form-input"
                value={formData.partyName}
                onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
              >
                <option value="">Select Party</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.name}>
                    {party.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
              <select
                required
                className="form-input"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "Received" | "Paid" })}
              >
                <option value="Received">Received</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Against Invoice No</label>
              <input
                type="text"
                className="form-input"
                value={formData.invoiceNo}
                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                placeholder="INV-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                className="form-input"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
              <select
                className="form-input"
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                rows={3}
                className="form-input"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex justify-end space-x-3">
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Record Payment</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Party Name</th>
                <th className="table-header">Type</th>
                <th className="table-header">Invoice No</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Mode</th>
                <th className="table-header">Remarks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Sample Payment Entry */}
              <tr className="hover:bg-gray-50">
                <td className="table-cell">2025-01-16</td>
                <td className="table-cell font-medium">Shree Enterprises</td>
                <td className="table-cell">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Received
                  </span>
                </td>
                <td className="table-cell">INV-001</td>
                <td className="table-cell">
                  <span className="text-green-600 font-medium">₹2,000</span>
                </td>
                <td className="table-cell">Bank Transfer</td>
                <td className="table-cell">Partial payment received</td>
              </tr>
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="table-cell">{new Date(payment.date).toLocaleDateString()}</td>
                  <td className="table-cell font-medium">{payment.partyName}</td>
                  <td className="table-cell">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.type === "Received" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {payment.type}
                    </span>
                  </td>
                  <td className="table-cell">{payment.invoiceNo}</td>
                  <td className="table-cell">
                    <span className={`font-medium ${payment.type === "Received" ? "text-green-600" : "text-red-600"}`}>
                      ₹{payment.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="table-cell">{payment.mode}</td>
                  <td className="table-cell">{payment.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
