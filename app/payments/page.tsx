"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Save, X, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import DataTable from "@/components/DataTable"
import AuthenticatedLayout from "@/components/AuthenticatedLayout"
import { useToast } from "@/hooks/use-toast"

interface Payment {
  id: string
  business_id: string
  party_id: string
  party_name: string
  invoice_id?: string
  invoice_no?: string
  amount: number
  payment_method: "Cash" | "Cheque" | "Bank Transfer" | "UPI" | "Card"
  payment_date: string
  reference_no?: string
  notes?: string
  type: "payment_in" | "payment_out"
  created_at: string
}

interface Party {
  id: string
  name: string
  type: string
}

interface Invoice {
  id: string
  invoice_no: string
  party_name: string
  net_total: number
  balance_due: number
  type: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string>("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    party_id: "",
    invoice_id: "",
    amount: "",
    payment_method: "Cash" as "Cash" | "Cheque" | "Bank Transfer" | "UPI" | "Card",
    payment_date: new Date().toISOString().split('T')[0],
    reference_no: "",
    notes: "",
    type: "payment_in" as "payment_in" | "payment_out",
  })

  useEffect(() => {
    const storedBusiness = localStorage.getItem("selectedBusiness")
    if (storedBusiness) {
      const business = JSON.parse(storedBusiness)
      setBusinessId(business.id)
      loadData(business.id)
    }
  }, [])

  const loadData = useCallback(async (businessId: string) => {
    try {
      setLoading(true)
      
      const [paymentsResult, partiesResult] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
        supabase
          .from("parties")
          .select("id, name, type")
          .eq("business_id", businessId)
      ])

      if (paymentsResult.error) throw paymentsResult.error
      if (partiesResult.error) throw partiesResult.error

      setPayments(paymentsResult.data || [])
      setParties(partiesResult.data || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load payments data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadInvoicesForParty = useCallback(async (partyId: string) => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_no, party_name, net_total, balance_due, type")
        .eq("business_id", businessId)
        .eq("party_id", partyId)
        .gt("balance_due", 0)
        .order("date", { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error("Error loading invoices:", error)
    }
  }, [businessId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !formData.party_id || !formData.amount) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const selectedParty = parties.find(p => p.id === formData.party_id)
      if (!selectedParty) throw new Error("Selected party not found")

      const selectedInvoice = invoices.find(i => i.id === formData.invoice_id)

      const paymentData = {
        business_id: businessId,
        party_id: formData.party_id,
        party_name: selectedParty.name,
        invoice_id: formData.invoice_id || null,
        invoice_no: selectedInvoice?.invoice_no || null,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        reference_no: formData.reference_no || null,
        notes: formData.notes || null,
        type: formData.type,
      }

      let result
      if (editingPayment) {
        result = await supabase
          .from("payments")
          .update(paymentData)
          .eq("id", editingPayment.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from("payments")
          .insert([paymentData])
          .select()
          .single()
      }

      if (result.error) throw result.error

      // Update invoice balance if payment is linked to an invoice
      if (formData.invoice_id && selectedInvoice) {
        const newBalanceDue = selectedInvoice.balance_due - parseFloat(formData.amount)
        const newPaymentReceived = selectedInvoice.net_total - newBalanceDue

        await supabase
          .from("invoices")
          .update({
            payment_received: newPaymentReceived,
            balance_due: Math.max(0, newBalanceDue)
          })
          .eq("id", formData.invoice_id)
      }

      // Update payments list
      if (editingPayment) {
        setPayments(prev => prev.map(payment => 
          payment.id === editingPayment.id ? result.data : payment
        ))
      } else {
        setPayments(prev => [result.data, ...prev])
      }

      toast({
        title: "Success",
        description: `Payment ${editingPayment ? "updated" : "recorded"} successfully`,
      })

      resetForm()
    } catch (error: any) {
      console.error("Error saving payment:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save payment",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      party_id: "",
      invoice_id: "",
      amount: "",
      payment_method: "Cash",
      payment_date: new Date().toISOString().split('T')[0],
      reference_no: "",
      notes: "",
      type: "payment_in",
    })
    setIsFormOpen(false)
    setEditingPayment(null)
    setInvoices([])
  }

  const handleEdit = (payment: Payment) => {
    setFormData({
      party_id: payment.party_id,
      invoice_id: payment.invoice_id || "",
      amount: payment.amount.toString(),
      payment_method: payment.payment_method,
      payment_date: payment.payment_date,
      reference_no: payment.reference_no || "",
      notes: payment.notes || "",
      type: payment.type,
    })
    setEditingPayment(payment)
    setIsFormOpen(true)
    
    // Load invoices for the selected party
    if (payment.party_id) {
      loadInvoicesForParty(payment.party_id)
    }
  }

  const handlePartyChange = (partyId: string) => {
    setFormData(prev => ({ ...prev, party_id: partyId, invoice_id: "" }))
    loadInvoicesForParty(partyId)
  }

  const columns = useMemo(
    () => [
      { 
        key: "payment_date", 
        label: "Date", 
        render: (value: string) => new Date(value).toLocaleDateString() 
      },
      { key: "party_name", label: "Party Name" },
      { 
        key: "invoice_no", 
        label: "Invoice No", 
        render: (value: string) => value || "Direct Payment" 
      },
      {
        key: "amount",
        label: "Amount",
        render: (value: number) => `₹${value.toLocaleString()}`,
      },
      {
        key: "type",
        label: "Type",
        render: (value: string) => (
          <Badge variant={value === "payment_in" ? "default" : "secondary"}>
            {value === "payment_in" ? "Payment In" : "Payment Out"}
          </Badge>
        ),
      },
      { key: "payment_method", label: "Method" },
      { 
        key: "reference_no", 
        label: "Reference", 
        render: (value: string) => value || "-" 
      },
    ],
    []
  )

  const actions = (payment: Payment) => (
    <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)}>
      <Edit className="h-4 w-4" />
    </Button>
  )

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
              <p className="text-gray-600">Record and manage payments</p>
            </div>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>

        {/* Form */}
        {isFormOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {editingPayment ? "Edit Payment" : "Record New Payment"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Payment Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "payment_in" | "payment_out") => 
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment_in">Payment In (Received)</SelectItem>
                      <SelectItem value="payment_out">Payment Out (Made)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="party_id">Party *</Label>
                  <Select
                    value={formData.party_id}
                    onValueChange={handlePartyChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Party" />
                    </SelectTrigger>
                    <SelectContent>
                      {parties.map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name} ({party.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_id">Link to Invoice (Optional)</Label>
                  <Select
                    value={formData.invoice_id}
                    onValueChange={(value) => setFormData({ ...formData, invoice_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Invoice (Direct Payment)</SelectItem>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoice_no} - ₹{invoice.balance_due.toLocaleString()} due
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value: "Cash" | "Cheque" | "Bank Transfer" | "UPI" | "Card") => 
                      setFormData({ ...formData, payment_method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_date">Payment Date *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    required
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_no">Reference No</Label>
                  <Input
                    id="reference_no"
                    value={formData.reference_no}
                    onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                    placeholder="Cheque/Transaction No"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3 flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingPayment ? "Update" : "Record"} Payment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={payments}
              columns={columns}
              title=""
              searchKeys={["party_name", "invoice_no", "reference_no"]}
              actions={actions}
            />
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
