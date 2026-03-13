# HisabKitab - RPC-Based Architecture Setup Guide

## Overview
This project has been migrated to use **Supabase with RPC (Remote Procedure Call) architecture**. All database operations are now handled through secure RPC functions instead of direct CRUD operations.

## 📋 Prerequisites
- Supabase account
- Node.js and npm installed
- Access to Supabase SQL Editor

## 🚀 Setup Instructions

### Step 1: Set Up Supabase Database

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Open your project: `nbgnmpnjxuragmbiieeo`

2. **Run the Migration Script**
   - Open the SQL Editor in your Supabase dashboard
   - Copy the entire content from `db/supabase-migration.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

   This will:
   - Create all necessary tables
   - Set up Row Level Security (RLS) policies
   - Create RPC functions for all operations
   - Configure proper permissions

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

The `.env` file has already been created with your credentials:

```env
VITE_SUPABASE_URL=https://nbgnmpnjxuragmbiieeo.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_mMMRhUd2hMRaOBmhl9XzDQ_g06gpNjw
```

### Step 4: Start Development Server

```bash
npm run dev
```

## 🏗️ Architecture Overview

### RPC-Based Operations

All database operations use RPC functions instead of direct table access:

**Old Way (CRUD):**
```javascript
// ❌ Direct table access
const { data } = await supabase.from('invoices').select('*')
```

**New Way (RPC):**
```javascript
// ✅ RPC function call
const { data } = await supabase.rpc('rpc_get_invoices', { p_business_id: businessId })
```

### API Service Layer

The project uses a centralized API service (`src/lib/api.js`) that abstracts all RPC calls:

```javascript
import api from '@/lib/api'

// Get all invoices
const { data, error } = await api.invoice.getAll(businessId)

// Create new invoice
const { data: invoiceId } = await api.invoice.create(invoiceData)

// Update invoice
await api.invoice.update(invoiceId, updateData)

// Delete invoice
await api.invoice.delete(invoiceId)
```

## 📚 Available RPC Functions

### Business Operations
- `rpc_get_businesses()` - Get all businesses for current user
- `rpc_get_business_by_id(p_id)` - Get specific business
- `rpc_create_business(...)` - Create new business
- `rpc_update_business(p_id, ...)` - Update business
- `rpc_delete_business(p_id)` - Delete business

### Bank Account Operations
- `rpc_get_bank_accounts(p_business_id)` - Get all bank accounts
- `rpc_create_bank_account(...)` - Create new bank account
- `rpc_update_bank_account(p_id, ...)` - Update bank account
- `rpc_delete_bank_account(p_id)` - Delete bank account

### Party Operations
- `rpc_get_parties(p_business_id)` - Get all parties
- `rpc_create_party(...)` - Create new party
- `rpc_update_party(p_id, ...)` - Update party
- `rpc_delete_party(p_id)` - Delete party

### Item Operations
- `rpc_get_items(p_business_id)` - Get all items
- `rpc_create_item(...)` - Create new item
- `rpc_update_item(p_id, ...)` - Update item
- `rpc_delete_item(p_id)` - Delete item

### Invoice Operations
- `rpc_get_invoices(p_business_id, p_type)` - Get all invoices
- `rpc_get_invoice_by_id(p_id)` - Get specific invoice
- `rpc_create_invoice(...)` - Create new invoice
- `rpc_update_invoice(p_id, ...)` - Update invoice
- `rpc_delete_invoice(p_id)` - Delete invoice

### Payment Operations
- `rpc_get_payments(p_business_id)` - Get all payments
- `rpc_create_payment(...)` - Create new payment
- `rpc_update_payment(p_id, ...)` - Update payment
- `rpc_delete_payment(p_id)` - Delete payment

### Expense Operations
- `rpc_get_expenses(p_business_id)` - Get all expenses
- `rpc_create_expense(...)` - Create new expense
- `rpc_update_expense(p_id, ...)` - Update expense
- `rpc_delete_expense(p_id)` - Delete expense

### Bank Transaction Operations
- `rpc_get_bank_transactions(p_business_id)` - Get all transactions
- `rpc_create_bank_transaction(...)` - Create new transaction
- `rpc_delete_bank_transaction(p_id)` - Delete transaction

## 🔒 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Data is filtered based on business ownership
- All operations are secured at the database level

### Secure Functions
All RPC functions use `SECURITY DEFINER` and verify:
- User authentication via `auth.uid()`
- Business ownership before operations
- Proper authorization for all actions

## 🎯 Usage Examples

### Example 1: Fetch Invoices
```javascript
import api from '@/lib/api'

const fetchInvoices = async () => {
  const businessId = 'your-business-id'
  const { data, error } = await api.invoice.getAll(businessId, 'sales')
  
  if (error) {
    console.error('Error fetching invoices:', error)
    return
  }
  
  console.log('Invoices:', data)
}
```

### Example 2: Create Party
```javascript
import api from '@/lib/api'

const createParty = async () => {
  const partyData = {
    business_id: 'your-business-id',
    name: 'John Doe',
    mobile: '1234567890',
    address: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    type: 'Debtor'
  }
  
  const { data: partyId, error } = await api.party.create(partyData)
  
  if (error) {
    console.error('Error creating party:', error)
    return
  }
  
  console.log('Created party ID:', partyId)
}
```

### Example 3: Update Invoice
```javascript
import api from '@/lib/api'

const updateInvoice = async (invoiceId) => {
  const updateData = {
    status: 'paid',
    payment_received: 10000,
    balance_due: 0
  }
  
  const { data: success, error } = await api.invoice.update(invoiceId, updateData)
  
  if (error) {
    console.error('Error updating invoice:', error)
    return
  }
  
  console.log('Invoice updated:', success)
}
```

## 🔧 Migration from Old Code

To migrate existing components:

1. **Replace axios imports:**
   ```javascript
   // Old
   import axios from 'axios'
   
   // New
   import api from '@/lib/api'
   ```

2. **Replace API calls:**
   ```javascript
   // Old
   const response = await axios.get('http://localhost:8000/api/invoices')
   const data = response.data
   
   // New
   const { data, error } = await api.invoice.getAll(businessId)
   ```

3. **Handle errors properly:**
   ```javascript
   const { data, error } = await api.invoice.create(invoiceData)
   
   if (error) {
     console.error('Error:', error)
     // Handle error
     return
   }
   
   // Use data
   ```

## 📝 Database Schema

The database includes the following tables:
- `users` - User profiles
- `businesses` - Business information
- `bank_accounts` - Bank account details
- `bank_transactions` - Bank transaction records
- `parties` - Customer/Supplier information
- `items` - Product/Service catalog
- `invoices` - Sales and purchase invoices
- `sales_items` - Invoice line items
- `payments` - Payment records
- `expenses` - Expense tracking

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"
- Ensure `.env` file exists in the root directory
- Verify environment variables are correctly set

### Error: "function does not exist"
- Make sure you've run the migration script in Supabase SQL Editor
- Check that all RPC functions were created successfully

### Error: "Unauthorized" or "permission denied"
- Verify you're logged in with a valid Supabase account
- Check RLS policies are set up correctly
- Ensure business ownership is correct

## 📞 Support

For issues or questions, please check:
1. Supabase Dashboard for function logs
2. Browser console for error messages
3. Network tab for API call details

## 🎉 Benefits of RPC Architecture

1. **Security** - All operations validated at database level
2. **Performance** - Reduced network round trips
3. **Maintainability** - Business logic centralized in database
4. **Type Safety** - Clear function signatures
5. **Scalability** - Easy to add new operations
6. **Testing** - Functions can be tested independently

---

**Note:** This application now exclusively uses RPC functions. Direct table access through Supabase's CRUD operations is disabled by RLS policies.
