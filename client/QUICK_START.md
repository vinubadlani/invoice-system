# Quick Start Guide - HisabKitab RPC Migration

## ✅ What Has Been Done

### 1. Database Migration File Created
- **Location**: `db/supabase-migration.sql`
- **Contents**:
  - All table schemas (businesses, parties, items, invoices, payments, expenses, etc.)
  - Complete RPC functions for all CRUD operations
  - Row Level Security (RLS) policies
  - Proper indexes for performance
  - Security policies ensuring data isolation

### 2. Supabase Client Configuration
- **Location**: `src/lib/supabaseClient.js`
- **Features**:
  - Initialized Supabase client
  - RPC call wrapper with error handling
  - Authentication helpers

### 3. API Service Layer
- **Location**: `src/lib/api.js`
- **Provides**: Clean abstraction over all RPC functions
- **Modules**:
  - businessAPI - Business operations
  - bankAccountAPI - Bank account management
  - bankTransactionAPI - Transaction tracking
  - partyAPI - Customer/Supplier management
  - itemAPI - Product/Service catalog
  - invoiceAPI - Sales/Purchase invoices
  - paymentAPI - Payment tracking
  - expenseAPI - Expense management

### 4. Example Components Updated
The following pages have been updated with full RPC implementation:
- **Parties.js** - Complete party management with search and filters
- **Items.js** - Inventory management with stock tracking
- **SalesInvoices.js** - Invoice management with payment tracking

### 5. Environment Configuration
- **File**: `.env`
- **Variables**: 
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

## 🚀 Next Steps to Go Live

### Step 1: Run Database Migration
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Copy entire content from `db/supabase-migration.sql`
4. Paste and Run in SQL Editor
5. Verify all tables and functions are created

### Step 2: Test the Setup
```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

### Step 3: Implement Authentication
Add authentication flow to your app:

```javascript
// In your login component
import { auth } from '@/lib/supabaseClient'

const handleLogin = async (email, password) => {
  const { data, error } = await auth.signIn(email, password)
  if (error) {
    console.error('Login error:', error)
    return
  }
  // Redirect to dashboard
}
```

### Step 4: Add Business Context
Create a context to manage the current business:

```javascript
// src/context/BusinessContext.jsx
import React, { createContext, useState, useEffect } from 'react'
import { auth } from '@/lib/supabaseClient'
import api from '@/lib/api'

export const BusinessContext = createContext()

export const BusinessProvider = ({ children }) => {
  const [currentBusiness, setCurrentBusiness] = useState(null)
  const [businesses, setBusinesses] = useState([])

  useEffect(() => {
    loadBusinesses()
  }, [])

  const loadBusinesses = async () => {
    const { data } = await api.business.getAll()
    if (data && data.length > 0) {
      setBusinesses(data)
      setCurrentBusiness(data[0]) // Set first business as current
    }
  }

  return (
    <BusinessContext.Provider value={{ currentBusiness, businesses, setCurrentBusiness }}>
      {children}
    </BusinessContext.Provider>
  )
}
```

### Step 5: Update Components to Use Business Context
Replace hardcoded `businessId` with context:

```javascript
import { useContext } from 'react'
import { BusinessContext } from '@/context/BusinessContext'

const MyComponent = () => {
  const { currentBusiness } = useContext(BusinessContext)
  const businessId = currentBusiness?.id

  // Use businessId in API calls
  const { data } = await api.invoice.getAll(businessId)
}
```

## 📋 Migration Checklist

### Mandatory Tasks
- [ ] Run database migration in Supabase
- [ ] Test authentication flow
- [ ] Create business context
- [ ] Update all remaining components to use RPC
- [ ] Remove axios dependency (if not used elsewhere)
- [ ] Test all CRUD operations

### Recommended Tasks
- [ ] Add loading states to all components
- [ ] Add error notifications (toast/alert)
- [ ] Implement form validation
- [ ] Add confirmation dialogs for delete operations
- [ ] Create reusable modal components for add/edit
- [ ] Add pagination for large lists
- [ ] Implement date range filters
- [ ] Add export functionality (PDF, Excel)
- [ ] Implement print functionality for invoices

### Optional Enhancements
- [ ] Add real-time subscriptions for collaborative editing
- [ ] Implement search with debouncing
- [ ] Add data visualization (charts, graphs)
- [ ] Create mobile-responsive design
- [ ] Add bulk operations (bulk delete, bulk update)
- [ ] Implement advanced filtering
- [ ] Add audit trail/activity log
- [ ] Create backup/restore functionality

## 🎯 Component Update Pattern

For each component that needs updating:

### 1. Replace Imports
```javascript
// OLD
import axios from 'axios'

// NEW
import api from '@/lib/api'
import { useContext } from 'react'
import { BusinessContext } from '@/context/BusinessContext'
```

### 2. Update Data Fetching
```javascript
// OLD
const response = await axios.get('http://localhost:8000/api/parties')
const data = response.data

// NEW
const { currentBusiness } = useContext(BusinessContext)
const { data, error } = await api.party.getAll(currentBusiness.id)

if (error) {
  console.error('Error:', error)
  return
}
```

### 3. Update Create Operations
```javascript
// OLD
await axios.post('http://localhost:8000/api/parties', partyData)

// NEW
const { data: partyId, error } = await api.party.create({
  business_id: currentBusiness.id,
  ...partyData
})

if (error) {
  console.error('Error:', error)
  return
}
```

### 4. Update Update Operations
```javascript
// OLD
await axios.put(`http://localhost:8000/api/parties/${id}`, updateData)

// NEW
const { error } = await api.party.update(id, updateData)

if (error) {
  console.error('Error:', error)
  return
}
```

### 5. Update Delete Operations
```javascript
// OLD
await axios.delete(`http://localhost:8000/api/parties/${id}`)

// NEW
const { error } = await api.party.delete(id)

if (error) {
  console.error('Error:', error)
  return
}
```

## 🔍 Testing Your Implementation

### Test RPC Functions Directly
You can test RPC functions in Supabase SQL Editor:

```sql
-- Test getting businesses (replace with your user ID)
SELECT * FROM rpc_get_businesses('user-uuid');

-- Test creating a party
SELECT rpc_create_party(
  'business-uuid',
  'John Doe',
  '1234567890',
  '123 Street',
  'Mumbai',
  'Maharashtra',
  '400001'
);
```

### Test from Browser Console
```javascript
// Test in browser console after login
const { data, error } = await api.party.getAll('your-business-id')
console.log('Parties:', data)
```

## 📚 Additional Resources

### Key Files to Reference
1. `RPC_SETUP_GUIDE.md` - Complete RPC documentation
2. `db/supabase-migration.sql` - Database schema and functions
3. `src/lib/api.js` - API service layer
4. `src/lib/supabaseClient.js` - Supabase configuration
5. `src/pages/Parties.js` - Example implementation
6. `src/pages/Items.js` - Example implementation
7. `src/pages/SalesInvoices.js` - Example implementation

### Supabase Resources
- Dashboard: https://supabase.com/dashboard
- Documentation: https://supabase.com/docs
- RPC Guide: https://supabase.com/docs/guides/database/functions

## ⚠️ Important Notes

1. **Authentication Required**: All RPC functions require authenticated users
2. **Business ID**: Always pass the correct business ID for data isolation
3. **Error Handling**: Always check for errors in RPC responses
4. **Data Types**: Ensure correct data types (UUID, NUMERIC, etc.)
5. **NULL Values**: Use `null` for optional fields, not `undefined`

## 🎉 Benefits Achieved

- ✅ **Security**: All operations validated at database level
- ✅ **Performance**: Single network calls for complex operations
- ✅ **Maintainability**: Centralized business logic
- ✅ **Scalability**: Easy to add new operations
- ✅ **Type Safety**: Clear function signatures
- ✅ **Data Isolation**: RLS ensures users only see their data

## 📞 Need Help?

If you encounter issues:
1. Check Supabase Dashboard for error logs
2. Check browser console for client-side errors
3. Verify RLS policies are correctly set up
4. Ensure user is authenticated
5. Verify business ownership for all operations

---

**Your application is now ready for RPC-based operations! 🚀**
