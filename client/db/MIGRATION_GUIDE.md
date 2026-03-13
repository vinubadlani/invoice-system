# 📊 Data Migration Guide

migrate all your old database data to the new Supabase instance.

## 🎯 Migration Overview

Your old database contains:
- **6 Users** (ajay1236@gmail.com, bt22cse162@gmail.com, ajaykbadlani@gmail.com, etc.)
- **6 Businesses** (SIO Offline, Sierra India Organics, etc.)
- **250+ Parties** (customers/suppliers)
- **430+ Items** (products/inventory)
- **250+ Invoices** (sales/purchase)
- **10+ Payments**
- **9 Expenses**
- Bank accounts and transactions

---

## ✅ Prerequisites

1. ✅ Schema migration completed ([db/supabase-migration.sql](supabase-migration.sql))
2. ✅ Database tables, RPC functions, and triggers created
3. ✅ `.env` file configured with Supabase credentials

---

## 🚀 Migration Options

### Option 1: Python Script (RECOMMENDED) ✨

**Best for:** Complete automated migration

```bash
# Install dependencies
pip install supabase-py python-dotenv

# Add service key to .env
echo "SUPABASE_SERVICE_KEY=your_service_role_key_here" >> .env

# Run migration
python db/migrate-backup.py
```

**Features:**
- ✅ Automatically parses backup file
- ✅ Migrates ALL data (users, businesses, parties, items, invoices, etc.)
- ✅ Handles foreign key relationships
- ✅ Batch processing for large datasets
- ✅ Verification step
- ✅ Error handling

**Get Service Role Key:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `nbgnmpnjxuragmbiieeo`
3. Settings → API → `service_role` key
4. Copy and add to `.env`

---

### Option 2: Node.js Script

**Best for:** JavaScript developers

```bash
# Already installed
npm install @supabase/supabase-js

# Update service key in migrate-data.js
node db/migrate-data.js
```

**Note:** Currently migrates users and businesses only. You'll need to add migration functions for other tables.

---

### Option 3: Manual SQL Migration

**Best for:** Custom control

1. **Update User IDs:**
   - First, have all users sign up through your app
   - Get their new UUIDs from `public.users` table
   - Update the SQL file with new user IDs

2. **Run SQL script:**
   ```sql
   -- In Supabase SQL Editor
   -- Copy contents from db/data-migration.sql
   -- Execute
   ```

**Pros:**
- Full control over what to migrate
- Can selectively migrate data

**Cons:**
- Manual and time-consuming
- Requires user ID mapping
- Only partial migration script provided

---

### Option 4: Fresh Start (Easiest)

**Best for:** Clean slate

1. Users sign up via the app
2. They create their businesses
3. They add parties, items as needed
4. Old data kept as backup

**Pros:**
- No migration complexity
- Fresh, clean data
- Modern workflows

**Cons:**
- Lose historical data
- Need to re-enter information

---

## 📋 Step-by-Step: Python Migration

### Step 1: Prepare Environment

```bash
# Create virtual environment (optional)
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install supabase-py python-dotenv
```

### Step 2: Configure Service Key

Add to your `.env` file:
```env
VITE_SUPABASE_URL=https://nbgnmpnjxuragmbiieeo.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_mMMRhUd2hMRaOBmhl9XzDQ_g06gpNjw
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_SERVICE_KEY_HERE
```

### Step 3: Run Migration

```bash
python db/migrate-backup.py
```

### Step 4: Verify Data

The script will show:
```
📊 Verification Results:
  users                 6 rows
  businesses            6 rows
  parties             250 rows
  items               430 rows
  invoices            250 rows
  ...
```

---

## ⚙️ Configuration

### User ID Mapping

The old database has these user IDs:

| Email | Old User ID | Name |
|-------|-------------|------|
| ajay1236@gmail.com | `88605097-6ecc-41cd-96bc-56c5f2188b23` | admin |
| bt22cse162@gmail.com | `8e69039c-2ea7-4f2d-b4b5-4ea2d393c952` | vinay |
| ajaykbadlani@gmail.com | `511384da-f53f-4302-99a9-70733d6d27bd` | Ajay Kumar |
| truelyayurvedic@gmail.com | `ee1632d3-4aee-4c38-b66e-6f7a8ac2376f` | SIO OLD UPTO 2023 |
| hafizasif1109@gmail.com | `6ac541a2-5c3e-41a1-a951-cdbfde146000` | Asif Mahmood |
| vinubadlani@gmail.com | `6cc56a9e-b3ea-4958-a67f-7a632824b93c` | vinay |

**Migration preserves these IDs** so all relationships work correctly.

---

## 🔧 Troubleshooting

### Error: "SUPABASE_SERVICE_KEY not set"
- Add service role key to `.env` file
- Get it from Supabase Dashboard → Settings → API

### Error: "Unique constraint violation"
- Data already exists in table
- Re-run with `upsert` mode (already enabled)

### Error: "Foreign key constraint violation"
- Check that users table migrated first
- Migration script follows correct order

### Error: "Row Level Security policy violation"
- Service role key bypasses RLS
- Check you're using service_role key, not anon key

### Partial Migration
If only some data migrated:
```bash
# Check what migrated
python -c "from migrate_backup import verify_migration; verify_migration()"
```

---

## 📊 Data Structure

### Businesses (6 total)
1. **SIO Offline** - Indore (User: admin)
2. **M/s Accounting Palace** - Lahore (User: Asif Mahmood)
3. **vinnubadlani** - Indore (User: vinay)
4. **vinaybadlaniiiii** - Indore (User: vinay)
5. **SIO OFFLINE UPTO 2023** - Indore (User: SIO OLD UPTO 2023)
6. **Sierra India Organics** - Indore (User: Ajay Kumar)

### Sample Items (430+ total)
- Herbal powders (Ashwagandha, Amla, Safed Musli, etc.)
- Ayurvedic products
- Brass items (Lotus Diya sets)
- Packaging materials

### Sample Parties (250+ total)
- **Customers:** Burhan Bhai, Dr. M.S. Naveed, Nishtha Ayurvedic, etc.
- **Suppliers:** H. Mohammed Hussain, AA Thread Company, etc.
- **E-commerce:** Amazon, Meesho, etc.

---

## ✅ Post-Migration Checklist

After migration:

- [ ] Verify user count matches (6 users)
- [ ] Verify business count matches (6 businesses)
- [ ] Check sample party exists
- [ ] Check sample item exists
- [ ] Check sample invoice exists
- [ ] Test RPC functions work
- [ ] Test authentication
- [ ] Test business context
- [ ] Test data in UI

---

## 🔐 Security Notes

**Service Role Key:**
- ⚠️ **NEVER commit service_role key to Git**
- ⚠️ **NEVER expose in frontend code**
- ✅ Only use for backend/migration scripts
- ✅ Store in `.env` (already in `.gitignore`)

**Row Level Security:**
- Migration temporarily needs RLS bypass
- Data is secure after migration
- Users can only see their own data

---

## 💡 Tips

1. **Backup First:** Supabase has automatic backups, but export current state before migration

2. **Test Environment:** Consider testing on a Supabase preview branch first

3. **Selective Migration:** If you don't need all data, modify the Python script to skip certain tables

4. **Incremental Migration:** Can run multiple times - `upsert` prevents duplicates

5. **Performance:** Large datasets may take 5-10 minutes. Be patient!

---

## 🆘 Need Help?

### Common Issues

**"Cannot connect to Supabase"**
- Check SUPABASE_URL is correct
-Check internet connection
- Verify project isn't paused

**"Permission denied"**
- Using wrong API key (use service_role, not anon)
- RLS policies blocking (service_role bypasses this)

**"Data looks wrong"**
- Check backup file path is correct
- Ensure backup file isn't corrupted
- Verify backup file format (should be plain SQL text)

---

## 📝 Next Steps

After successful migration:

1. **Test the app:** Visit http://localhost:5173/auth-test
2. **Sign in:** Use existing user credentials
3. **Verify data:** Check parties, items, invoices pages
4. **Create new records:** Test that RPC functions work
5. **Check relationships:** Verify business context works

---

## 🎉 Success!

Once migration is complete, you'll have:
- ✅ All users migrated
- ✅ All businesses preserved
- ✅ All parties (customers/suppliers)
- ✅ All items (inventory)
- ✅ All invoices (sales history)
- ✅ All relationships intact
- ✅ Authentication working
- ✅ RPC functions operational

Your app is now fully migrated to Supabase! 🚀

---

**Last Updated:** March 11, 2026  
**Migration Tool:** Python 3.8+ with supabase-py  
**Database:** PostgreSQL → Supabase PostgreSQL
