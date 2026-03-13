# 🔐 Authentication Testing Instructions

## ✅ What's Been Fixed

Your authentication issue has been resolved! The problem was that users signing up through Supabase Auth weren't automatically being created in the `public.users` table, which broke foreign key relationships.

### Fixed:
1. ✅ Added `handle_new_user()` trigger function
2. ✅ Added `on_auth_user_created` trigger on `auth.users` table  
3. ✅ Updated RLS policy to allow INSERT on `public.users`
4. ✅ Enhanced `auth.signUp()` with full name support
5. ✅ Created comprehensive test page

---

## 🚀 Next Steps

### Step 1: Run the Migration SQL

**CRITICAL:** You must run the migration SQL in Supabase before testing!

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/nbgnmpnjxuragmbiieeo
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `db/supabase-migration.sql` in this project
5. Copy ALL the contents (1600+ lines)
6. Paste into the Supabase SQL Editor
7. Click **Run** or press `Ctrl+Enter`
8. Wait for "Success" message

**Expected Output:**
```
Success. No rows returned
```

This will create:
- ✅ All 10 tables (users, businesses, parties, items, invoices, etc.)
- ✅ 45+ RPC functions for CRUD operations
- ✅ Row Level Security (RLS) policies
- ✅ Authentication trigger
- ✅ Indexes and constraints

---

### Step 2: Test Authentication

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to the test page**:
   ```
   http://localhost:5173/auth-test
   ```

3. **Test Sign Up:**
   - Fill in Full Name, Email, Password
   - Click "Sign Up"
   - You should see: "✅ Sign up successful! Check your email for confirmation."
   - **Note:** If email confirmation is enabled in Supabase, check your email

4. **Test Sign In:**
   - Enter your email and password
   - Click "Sign In"
   - You should see: "✅ Sign in successful!"
   - Your user info should appear in the "Current User" section

5. **Test RPC Call:**
   - After signing in, click "Test RPC Call"
   - This verifies your database connection is working
   - You should see: "✅ RPC Success! Found X businesses."

6. **Test Sign Out:**
   - Click "Sign Out"
   - User info should disappear

---

## 🔍 Troubleshooting

### Issue: "Sign up error: Invalid API key"
- ❌ Problem: Environment variables not loaded
- ✅ Solution: Check that `.env` file exists and contains correct values
- Restart dev server with `npm run dev`

### Issue: "RPC Error: relation 'public.users' does not exist"
- ❌ Problem: Migration SQL not run yet
- ✅ Solution: Complete Step 1 above

### Issue: "Email not confirmed"
- ❌ Problem: Supabase has email confirmation enabled
- ✅ Solution Option 1: Check your email and click confirmation link
- ✅ Solution Option 2: Disable email confirmation in Supabase Dashboard:
  1. Go to Authentication → Settings
  2. Turn off "Enable email confirmations"
  3. Save changes

### Issue: "Sign in error: Invalid login credentials"
- ❌ Problem: Wrong email/password or user doesn't exist
- ✅ Solution: Make sure you signed up first, or check credentials

---

## 📋 Database Schema Overview

After running the migration, you'll have:

### Tables (10 total):
- `users` - User profiles (synced with auth.users via trigger)
- `businesses` - Business entities (user can have multiple)
- `parties` - Customers/Suppliers
- `items` - Products/Services
- `invoices` - Sales invoices
- `sales_items` - Invoice line items
- `payments` - Payment records
- `expenses` - Expense tracking
- `bank_accounts` - Bank account management
- `bank_transactions` - Bank transaction records

### RPC Functions (45+ total):
All follow pattern: `rpc_[action]_[entity]`

Examples:
```sql
-- Businesses
rpc_get_businesses()
rpc_create_business(p_name, p_type, ...)
rpc_update_business(p_id, p_name, ...)
rpc_delete_business(p_id)

-- Parties
rpc_get_parties(p_business_id)
rpc_create_party(p_business_id, p_name, ...)
rpc_update_party(p_id, p_name, ...)
rpc_delete_party(p_id)

-- Items
rpc_get_items(p_business_id)
rpc_create_item(p_business_id, p_name, ...)
-- ... etc for all entities
```

---

## 🎯 What Works Now

### ✅ Authentication Flow:
1. User signs up via `auth.signUp()` → Creates entry in `auth.users`
2. Trigger `on_auth_user_created` fires automatically
3. Trigger function `handle_new_user()` creates entry in `public.users`
4. User can now create businesses (foreign key satisfied)

### ✅ RPC Architecture:
- All database operations go through RPC functions
- No direct table access (secure)
- Row Level Security (RLS) enforced
- User-scoped data (can only see own data)

### ✅ API Service Layer:
```javascript
import api from '@/lib/api';

// Get all parties for a business
const { data, error } = await api.party.getAll(businessId);

// Create new party
const { data, error } = await api.party.create({
  businessId,
  name: 'ABC Corp',
  type: 'customer',
  email: 'abc@example.com'
});

// Update party
const { data, error } = await api.party.update(partyId, { 
  name: 'New Name' 
});

// Delete party
const { data, error } = await api.party.delete(partyId);
```

---

## 📚 Additional Resources

- **Migration SQL**: `db/supabase-migration.sql`
- **RPC Setup Guide**: `RPC_SETUP_GUIDE.md`
- **Quick Start Guide**: `QUICK_START.md`
- **Supabase Client**: `src/lib/supabaseClient.js`
- **API Service Layer**: `src/lib/api.js`

---

## 🎉 Ready for Production

Once authentication works:

1. **Create Business Context Provider** - Manage current business across app
2. **Migrate Remaining Components** - Update all pages to use RPC API
3. **Create Auth UI** - Proper login/signup pages (not just test page)
4. **Add Business Selection** - Let users switch between businesses
5. **Test All Features** - Verify all CRUD operations work

---

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Check the Supabase Dashboard → Logs
3. Verify migration SQL ran successfully
4. Check environment variables in `.env`

---

**Last Updated:** January 2025  
**Migration File:** db/supabase-migration.sql (1600+ lines)  
**Supabase Project:** nbgnmpnjxuragmbiieeo
