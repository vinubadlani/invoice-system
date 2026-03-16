import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Search, Plus, Edit, Trash2, Phone, Mail } from 'lucide-react';
import api from '@/lib/api';

const Parties = () => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Replace with actual business ID from context/auth
  const businessId = 'your-business-id'; // TODO: Get from auth context

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.party.getAll(businessId);
      
      if (error) {
        console.error('Error fetching parties:', error);
        return;
      }
      
      setParties(data || []);
    } catch (error) {
      console.error('Exception fetching parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this party?')) return;
    
    try {
      const { error } = await api.party.delete(id);
      
      if (error) {
        console.error('Error deleting party:', error);
        alert('Failed to delete party');
        return;
      }
      
      // Refresh the list
      await fetchParties();
      alert('Party deleted successfully');
    } catch (error) {
      console.error('Exception deleting party:', error);
      alert('Failed to delete party');
    }
  };

  const filteredParties = Array.isArray(parties)
    ? parties.filter(party => {
        const matchesSearch =
          typeof party.name === 'string' && party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          typeof party.mobile === 'string' && party.mobile.includes(searchTerm);
        const matchesType = filterType === 'all' || party.type === filterType;
        return matchesSearch && matchesType;
      })
    : [];

  const stats = {
    total: Array.isArray(parties) ? parties.length : 0,
    debtors: Array.isArray(parties)
      ? parties.filter(p => p?.type === 'Debtor').length
      : 0,
    creditors: Array.isArray(parties)
      ? parties.filter(p => p?.type === 'Creditor').length
      : 0,
    expense: Array.isArray(parties)
      ? parties.filter(p => p?.type === 'Expense').length
      : 0
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Parties</h1>
          <p className="text-gray-600">Manage your customers and suppliers</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus size={20} />
          Add Party
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Parties</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="text-blue-500" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Debtors</p>
                <p className="text-2xl font-bold">{stats.debtors}</p>
              </div>
              <Users className="text-green-500" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Creditors</p>
                <p className="text-2xl font-bold">{stats.creditors}</p>
              </div>
              <Users className="text-orange-500" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expense Parties</p>
                <p className="text-2xl font-bold">{stats.expense}</p>
              </div>
              <Users className="text-red-500" size={32} />
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
                  placeholder="Search by name or mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="Debtor">Debtors</option>
              <option value="Creditor">Creditors</option>
              <option value="Expense">Expense</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Parties Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading parties...</p>
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No parties found</p>
              <Button className="mt-4">
                <Plus size={16} className="mr-2" />
                Add Your First Party
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Contact</th>
                    <th className="text-left p-3">Location</th>
                    <th className="text-left p-3">GSTIN</th>
                    <th className="text-left p-3">Opening Balance</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((party) => (
                    <tr key={party.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{party.name}</div>
                        {party.email && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail size={12} />
                            {party.email}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          party.type === 'Debtor' ? 'bg-green-100 text-green-800' :
                          party.type === 'Creditor' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {party.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Phone size={14} className="text-gray-400" />
                          {party.mobile}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {party.city}, {party.state}
                        </div>
                        <div className="text-xs text-gray-500">{party.pincode}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{party.gstin || '-'}</div>
                      </td>
                      <td className="p-3">
                        <div className={`font-medium ${
                          party.balance_type === 'To Collect' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ₹{party.opening_balance.toLocaleString()}
                          <div className="text-xs text-gray-500">{party.balance_type}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm">
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(party.id)}
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

export default Parties;
