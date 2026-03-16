import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Search, Plus, Edit, Trash2, Eye, Download, DollarSign, Clock, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

const SalesInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Replace with actual business ID from context/auth
  const businessId = 'your-business-id'; // TODO: Get from auth context

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // Get only sales type invoices
      const { data, error } = await api.invoice.getAll(businessId, 'sales');
      
      if (error) {
        console.error('Error fetching invoices:', error);
        return;
      }
      
      setInvoices(data || []);
    } catch (error) {
      console.error('Exception fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      const { error } = await api.invoice.delete(id);
      
      if (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice');
        return;
      }
      
      // Refresh the list
      await fetchInvoices();
      alert('Invoice deleted successfully');
    } catch (error) {
      console.error('Exception deleting invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const { error } = await api.invoice.update(id, { status: newStatus });
      
      if (error) {
        console.error('Error updating invoice:', error);
        alert('Failed to update invoice status');
        return;
      }
      
      // Refresh the list
      await fetchInvoices();
    } catch (error) {
      console.error('Exception updating invoice:', error);
      alert('Failed to update invoice status');
    }
  };

  const filteredInvoices = Array.isArray(invoices)
    ? invoices.filter(invoice => {
        const matchesSearch =
          typeof invoice.invoice_no === 'string' && invoice.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
          typeof invoice.party_name === 'string' && invoice.party_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
    : [];

  const stats = {
    total: Array.isArray(invoices) ? invoices.length : 0,
    totalRevenue: Array.isArray(invoices)
      ? invoices.reduce((sum, inv) => sum + Number(inv?.net_total ?? 0), 0)
      : 0,
    totalReceived: Array.isArray(invoices)
      ? invoices.reduce((sum, inv) => sum + Number(inv?.payment_received ?? 0), 0)
      : 0,
    totalPending: Array.isArray(invoices)
      ? invoices.reduce((sum, inv) => sum + Number(inv?.balance_due ?? 0), 0)
      : 0,
    paid: Array.isArray(invoices)
      ? invoices.filter(inv => inv?.status === 'paid').length
      : 0,
    pending: Array.isArray(invoices)
      ? invoices.filter(inv => inv?.status === 'sent' || inv?.status === 'partial').length
      : 0,
    draft: Array.isArray(invoices)
      ? invoices.filter(inv => inv?.status === 'draft').length
      : 0,
    overdue: Array.isArray(invoices)
      ? invoices.filter(inv => inv?.status === 'overdue').length
      : 0
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return badges[status] || badges.draft;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Invoices</h1>
          <p className="text-gray-600">Manage your sales invoices and track payments</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus size={20} />
          Create Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.total} invoices</p>
              </div>
              <DollarSign className="text-blue-500" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Received</p>
                <p className="text-2xl font-bold text-green-600">₹{stats.totalReceived.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.paid} paid</p>
              </div>
              <CheckCircle className="text-green-500" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">₹{stats.totalPending.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.pending} pending</p>
              </div>
              <Clock className="text-orange-500" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-xs text-gray-500 mt-1">Need attention</p>
              </div>
              <FileText className="text-red-500" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by invoice no or party name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No invoices found</p>
              <Button className="mt-4">
                <Plus size={16} className="mr-2" />
                Create Your First Invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Invoice No</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Party Name</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-right p-3">Received</th>
                    <th className="text-right p-3">Balance</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{invoice.invoice_no}</div>
                        {invoice.due_date && (
                          <div className="text-xs text-gray-500">
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {new Date(invoice.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{invoice.party_name}</div>
                        {invoice.gstin && (
                          <div className="text-xs text-gray-500">GSTIN: {invoice.gstin}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-medium">
                          ₹{Number(invoice.net_total).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-medium text-green-600">
                          ₹{Number(invoice.payment_received).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className={`font-medium ${
                          Number(invoice.balance_due) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ₹{Number(invoice.balance_due).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" title="View">
                            <Eye size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit">
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" title="Download">
                            <Download size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Delete"
                            onClick={() => handleDelete(invoice.id)}
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesInvoices;
