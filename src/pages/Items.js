import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Search, Plus, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import api from '@/lib/api';

const Items = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Replace with actual business ID from context/auth
  const businessId = 'your-business-id'; // TODO: Get from auth context

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.item.getAll(businessId);
      
      if (error) {
        console.error('Error fetching items:', error);
        return;
      }
      
      setItems(data || []);
    } catch (error) {
      console.error('Exception fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const { error } = await api.item.delete(id);
      
      if (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item');
        return;
      }
      
      // Refresh the list
      await fetchItems();
      alert('Item deleted successfully');
    } catch (error) {
      console.error('Exception deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.hsn_code && item.hsn_code.includes(searchTerm))
  );

  const totalInventoryValue = items.reduce((sum, item) => 
    sum + (item.opening_stock * item.sales_price), 0
  );

  const totalStock = items.reduce((sum, item) => sum + item.opening_stock, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Items</h1>
          <p className="text-gray-600">Manage your product and service catalog</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus size={20} />
          Add Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <Package className="text-blue-500" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stock</p>
                <p className="text-2xl font-bold">{totalStock.toLocaleString()}</p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold">₹{totalInventoryValue.toLocaleString()}</p>
              </div>
              <TrendingDown className="text-purple-500" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, code, or HSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No items found</p>
              <Button className="mt-4">
                <Plus size={16} className="mr-2" />
                Add Your First Item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Item Code</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">HSN</th>
                    <th className="text-left p-3">Unit</th>
                    <th className="text-right p-3">Sales Price</th>
                    <th className="text-right p-3">Purchase Price</th>
                    <th className="text-right p-3">Stock</th>
                    <th className="text-right p-3">GST %</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{item.code}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500">{item.description}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{item.hsn_code || '-'}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{item.unit}</div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-medium text-green-600">
                          ₹{item.sales_price.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-medium text-orange-600">
                          ₹{item.purchase_price.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className={`font-medium ${
                          item.opening_stock > 10 ? 'text-green-600' : 
                          item.opening_stock > 0 ? 'text-orange-600' : 
                          'text-red-600'
                        }`}>
                          {item.opening_stock}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="text-sm">{item.gst_percent}%</div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm">
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(item.id)}
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

export default Items;
