# 📊 Hisab Kitab - Accounting & Business Management

A modern accounting and business management application built with React + Vite and powered by Supabase.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit app
http://localhost:5173
```

## 📋 Database Migration

**IMPORTANT:** Follow these steps to migrate from your old database:

### 1. Run Schema Migration
```bash
# Go to Supabase Dashboard SQL Editor
# Copy all contents from: db/supabase-migration.sql
# Paste and click "Run"
```

### 2. Test Authentication
```bash
# Start dev server
npm run dev

# Visit: http://localhost:5173/auth-test
# Sign up and test authentication
```

### 3. Migrate Old Data (RECOMMENDED)
```bash
# Install Python dependencies
pip install supabase-py python-dotenv

# Add service key to .env file
# Get from: Supabase Dashboard > Settings > API

# Run migration
python db/migrate-backup.py
```

📚 **Complete Guide:** [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)

## 📁 Documentation

- **[MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)** - Complete migration overview
- **[db/MIGRATION_GUIDE.md](db/MIGRATION_GUIDE.md)** - Detailed data migration guide
- **[RPC_SETUP_GUIDE.md](RPC_SETUP_GUIDE.md)** - RPC function documentation
- **[QUICK_START.md](QUICK_START.md)** - Quick setup guide
- **[AUTH_TESTING_INSTRUCTIONS.md](AUTH_TESTING_INSTRUCTIONS.md)** - Auth testing guide

## 🏗️ Architecture

### Database: Supabase (PostgreSQL)
- ✅ RPC-based architecture (no direct CRUD)
- ✅ Row Level Security (RLS)
- ✅ 10 tables (users, businesses, parties, items, invoices, etc.)
- ✅ 45+ RPC functions
- ✅ Auto-triggers for user management

### Frontend: React + Vite
- ✅ Tailwind CSS for styling
- ✅ Radix UI components
- ✅ Lucide React icons
- ✅ React Router for navigation

### Authentication: Supabase Auth
- ✅ Email/password authentication
- ✅ JWT tokens
- ✅ Auto-user creation trigger

## 📦 Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Supabase** - Backend & Database
- **Tailwind CSS** - Styling
- **Radix UI** - Component primitives
- **Lucide React** - Icons
- **React Router** - Routing

## 🔐 Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=https://nbgnmpnjxuragmbiieeo.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_mMMRhUd2hMRaOBmhl9XzDQ_g06gpNjw

# For data migration only
# SUPABASE_SERVICE_KEY=your_service_role_key_here
```

## 📊 Features

- ✅ User authentication & management
- ✅ Multi-business support
- ✅ Party management (customers/suppliers)
- ✅ Inventory management
- ✅ Sales & purchase invoices
- ✅ Payment tracking
- ✅ Expense management
- ✅ Bank account management
- ✅ Transaction history
- ✅ Dashboard & reports

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📝 API Usage

All database operations use RPC functions:

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

## 🗄️ Database Structure

### Tables (10)
1. **users** - User profiles
2. **businesses** - Business entities
3. **parties** - Customers/Suppliers
4. **items** - Products/Inventory
5. **invoices** - Sales/Purchase invoices
6. **sales_items** - Invoice line items
7. **payments** - Payment records
8. **expenses** - Expense tracking
9. **bank_accounts** - Bank accounts
10. **bank_transactions** - Transactions

### RPC Functions (45+)
- `rpc_get_*` - Read operations
- `rpc_create_*` - Create operations  
- `rpc_update_*` - Update operations
- `rpc_delete_*` - Delete operations

## 🎯 Migration Status

### ✅ Completed
- Schema migration SQL created
- RPC functions implemented
- Auth trigger added
- Supabase client configured
- API service layer created
- Example pages updated (Parties, Items, Invoices)
- Data migration scripts created
- Documentation written

### 🔄 In Progress
- Migrate remaining pages to RPC
- Implement business context provider
- Add loading states
- Add error handling

### 📅 Upcoming
- Complete all page migrations
- Add form validation
- Implement reports
- Add export features
- Performance optimization

## 🐛 Troubleshooting

**Auth not working?**
- Check that schema migration ran successfully
- Verify handle_new_user() trigger exists
- Check browser console for errors

**Can't see data?**
- Verify business context is set
- Check RLS policies
- Verify user is authenticated

**RPC function not found?**
- Run db/supabase-migration.sql
- Check Supabase Dashboard > Database > Functions

## 📞 Support

Need help? Check the documentation:
- [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)
- [db/MIGRATION_GUIDE.md](db/MIGRATION_GUIDE.md)
- [RPC_SETUP_GUIDE.md](RPC_SETUP_GUIDE.md)

## 📜 License

Proprietary - All rights reserved

---

**Built with ❤️ using React + Vite + Supabase**
