"use client"

import type React from "react"

import { useState } from "react"
import { useApp } from "../context/AppContext"
import { Plus, Save, X } from "lucide-react"

export default function BankAccounts() {
  const { bankTransactions, addBankTransaction } = useApp()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    bankName: "State Bank of India",
    accountNo: "1234567890",
    type: "Deposit" as "Deposit" | "Withdrawal" | "Expense",
    amount: 0,
    purpose: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addBankTransaction(formData)
    resetForm()
    alert("Bank transaction recorded successfully!")
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      bankName: "State Bank of India",
      accountNo: "1234567890",
      type: "Deposit",
      amount: 0,
      purpose: "",
    })
    setIsFormOpen(false)
  }

  const totalBalance = bankTransactions.reduce((balance, transaction) => {
    if (transaction.type === "Deposit") {
      return balance + transaction.amount
    } else {
      return balance - transaction.amount
    }
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
        <button onClick={() => setIsFormOpen(true)} className="btn-primary flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Balance</h3>
          <p className={`text-3xl font-bold ${totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            ₹{Math.abs(totalBalance).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-1">State Bank of India</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Deposits</h3>
          <p className="text-3xl font-bold text-green-600">
            ₹
            {bankTransactions
              .filter((t) => t.type === "Deposit")
              .reduce((sum, t) => sum + t.amount, 0)
              .toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600">
            ₹
            {bankTransactions
              .filter((t) => t.type === "Expense" || t.type === "Withdrawal")
              .reduce((sum, t) => sum + t.amount, 0)
              .toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-1">This month</p>
        </div>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Add Bank Transaction</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account No *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.accountNo}
                onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type *</label>
              <select
                required
                className="form-input"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as "Deposit" | "Withdrawal" | "Expense" })
                }
              >
                <option value="Deposit">Deposit</option>
                <option value="Withdrawal">Withdrawal</option>
                <option value="Expense">Expense</option>
              </select>
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

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="Description of transaction"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex justify-end space-x-3">
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Save Transaction</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Bank Name</th>
                <th className="table-header">Account No</th>
                <th className="table-header">Type</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Purpose</th>
                <th className="table-header">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bankTransactions.map((transaction, index) => {
                // Calculate running balance
                const runningBalance = bankTransactions.slice(0, index + 1).reduce((balance, t) => {
                  if (t.type === "Deposit") {
                    return balance + t.amount
                  } else {
                    return balance - t.amount
                  }
                }, 0)

                return (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="table-cell">{new Date(transaction.date).toLocaleDateString()}</td>
                    <td className="table-cell">{transaction.bankName}</td>
                    <td className="table-cell">{transaction.accountNo}</td>
                    <td className="table-cell">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === "Deposit"
                            ? "bg-green-100 text-green-800"
                            : transaction.type === "Withdrawal"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`font-medium ${transaction.type === "Deposit" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.type === "Deposit" ? "+" : "-"}₹{transaction.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">{transaction.purpose}</td>
                    <td className="table-cell">
                      <span className={`font-medium ${runningBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ₹{Math.abs(runningBalance).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
