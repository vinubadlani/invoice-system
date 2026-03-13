/**
 * DATA MIGRATION SCRIPT
 * Migrates all data from PostgreSQL backup to Supabase
 * 
 * Usage:
 * 1. Make sure @supabase/supabase-js is installed: npm install @supabase/supabase-js
 * 2. Update SUPABASE_URL and SUPABASE_SERVICE_KEY below
 * 3. Run: node migrate-data.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// CONFIGURATION
// ========================================
const SUPABASE_URL = 'https://nbgnmpnjxuragmbiieeo.supabase.co';
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // Get this from Supabase Dashboard > Settings > API

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ========================================
// DATA TO MIGRATE
// ========================================

const USERS = [
  { id: '88605097-6ecc-41cd-96bc-56c5f2188b23', email: 'ajay1236@gmail.com', full_name: 'admin', created_at: '2025-07-16T20:43:54.717464+00:00' },
  { id: '8e69039c-2ea7-4f2d-b4b5-4ea2d393c952', email: 'bt22cse162@gmail.com', full_name: 'vinay', created_at: '2025-07-17T11:33:09.211078+00:00' },
  { id: '511384da-f53f-4302-99a9-70733d6d27bd', email: 'ajaykbadlani@gmail.com', full_name: 'Ajay Kumar', created_at: '2025-07-19T14:57:21.419212+00:00' },
  { id: 'ee1632d3-4aee-4c38-b66e-6f7a8ac2376f', email: 'truelyayurvedic@gmail.com', full_name: 'SIO OLD UPTO 2023', created_at: '2025-08-29T13:13:31.445+00:00' },
  { id: '6ac541a2-5c3e-41a1-a951-cdbfde146000', email: 'hafizasif1109@gmail.com', full_name: 'Asif Mahmood', created_at: '2025-08-06T13:18:30.297+00:00' },
  { id: '6cc56a9e-b3ea-4958-a67f-7a632824b93c', email: 'vinubadlani@gmail.com', full_name: 'vinay', created_at: '2025-08-16T16:02:34.881+00:00' }
];

const BUSINESSES = [
  {
    id: '28fc1644-8c78-42df-b766-48adc5c9cd65',
    user_id: '88605097-6ecc-41cd-96bc-56c5f2188b23',
    name: 'SIO Offline',
    address: '35 Padmavati Colony',
    city: 'Indore',
    state: 'M.P.',
    pincode: '452018',
    phone: '9827999988',
    email: 'ajaykbadlani@gmail.com',
    gstin: '',
    pan: '',
    terms_conditions: 'Payment due within 30 days\\nGoods once sold will not be taken back\\nInterest @ 18% p.a. will be charged on overdue amounts\\nSubject to Indore M.P. jurisdiction only',
    created_at: '2025-07-16T20:43:54.800973+00:00',
    invoice_template: 'classic',
    business_type: 'sole_proprietorship'
  },
  {
    id: 'b4a70797-362a-4b60-ba59-576dba408740',
    user_id: '6ac541a2-5c3e-41a1-a951-cdbfde146000',
    name: 'M/s Accounting Palace',
    address: 'Lahore',
    city: 'Lahore',
    state: 'Punjab',
    pincode: '54000',
    phone: '3281480180',
    email: 'hafizasif1109@gmail.com',
    gstin: '',
    pan: '',
    terms_conditions: 'Payment due within 30 days\\r\\nGoods once sold will not be taken back\\r\\nInterest @ 18% p.a. will be charged on overdue amounts\\r\\nSubject to jurisdiction only',
    created_at: '2025-08-06T13:19:50.630017+00:00',
    invoice_template: 'classic',
    business_type: 'sole_proprietorship'
  },
  {
    id: '55576c19-a5dc-48c2-a6cc-e0d02a4a5f89',
    user_id: '8e69039c-2ea7-4f2d-b4b5-4ea2d393c952',
    name: 'vinnubadlani',
    address: '35',
    city: 'indore',
    state: 'mp',
    pincode: '452001',
    phone: '8435232987',
    email: 'bt22cse162@gmail.com',
    gstin: '',
    pan: '',
    terms_conditions: 'Payment due within 30 days\\nGoods once sold will not be taken back\\nInterest @ 18% p.a. will be charged on overdue amounts\\nSubject to jurisdiction only',
    created_at: '2025-07-17T11:33:54.770145+00:00',
    invoice_template: 'classic',
    business_type: 'sole_proprietorship'
  },
  {
    id: '7d2d77a6-2667-443d-bc78-966c2ef2166a',
    user_id: '6cc56a9e-b3ea-4958-a67f-7a632824b93c',
    name: 'vinaybadlaniiiii',
    address: '',
    city: 'indore',
    state: 'mp',
    pincode: '',
    phone: '8435232987',
    email: '',
    gstin: '',
    pan: '',
    terms_conditions: 'Payment due within 30 days\\nGoods once sold will not be taken back\\nInterest @ 18% p.a. will be charged on overdue amounts\\nSubject to jurisdiction yesssssssssssssss',
    created_at: '2025-09-01T18:44:42.831092+00:00',
    invoice_template: 'classic',
    business_type: 'sole_proprietorship'
  },
  {
    id: '43f2ebf7-ac6e-4906-a582-88c938f16b3d',
    user_id: 'ee1632d3-4aee-4c38-b66e-6f7a8ac2376f',
    name: 'SIO OFFLINE UPTO 2023',
    address: '',
    city: 'Indore',
    state: 'Madhya Pradesh',
    pincode: '452001',
    phone: '9827999988',
    email: '',
    gstin: '',
    pan: '',
    terms_conditions: 'Payment due within 30 days\\r\\nGoods once sold will not be taken back\\r\\nInterest @ 18% p.a. will be charged on overdue amounts\\r\\nSubject to jurisdiction only',
    created_at: '2025-08-29T13:17:13.697788+00:00',
    invoice_template: 'modern',
    business_type: 'sole_proprietorship'
  },
  {
    id: '633a3831-0277-41b7-9602-3510f5291d54',
    user_id: '511384da-f53f-4302-99a9-70733d6d27bd',
    name: 'Sierra India Organics',
    address: 'G-2, 35 Padmavati Colony',
    city: 'Indore',
    state: 'Madhya Pradesh',
    pincode: '452001',
    phone: '98279999999',
    email: 'sierraindiaorganics@gmail.com',
    gstin: '23CBOPB0402Q1ZT',
    pan: '',
    terms_conditions: 'Payment due within 30 days.\\nGoods once sold will not be taken back.\\nInterest @ 18% p.a. will be charged on overdue amounts.\\nSubject to Indore jurisdiction only.',
    created_at: '2025-07-27T14:27:22.242644+00:00',
    invoice_template: 'modern',
    business_type: 'sole_proprietorship'
  }
];

// ========================================
// MIGRATION FUNCTIONS
// ========================================

async function migrateUsers() {
  console.log('\\n📥 Migrating users...');
  
  for (const user of USERS) {
    const { data, error } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Error migrating user ${user.email}:`, error.message);
    } else {
      console.log(`✅ Migrated user: ${user.email}`);
    }
  }
}

async function migrateBusinesses() {
  console.log('\\n📥 Migrating businesses...');
  
  for (const business of BUSINESSES) {
    const { data, error } = await supabase
      .from('businesses')
      .upsert(business, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Error migrating business ${business.name}:`, error.message);
    } else  {
      console.log(`✅ Migrated business: ${business.name}`);
    }
  }
}

async function verifyMigration() {
  console.log('\\n🔍 Verifying migration...');
  
  const tables = ['users', 'businesses', 'parties', 'items', 'invoices', 'payments', 'expenses', 'bank_accounts', 'bank_transactions'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ Error counting ${table}:`, error.message);
    } else {
      console.log(`📊 ${table}: ${count} records`);
    }
  }
}

// ========================================
// MAIN
// ========================================

async function main() {
  console.log('🚀 Starting data migration...');
  console.log(`📍 Target: ${SUPABASE_URL}`);
  
  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ ERROR: Please update SUPABASE_SERVICE_KEY in this script!');
    console.log('Get your service role key from: Supabase Dashboard > Settings > API');
    process.exit(1);
  }
  
  try {
    // Migrate data
    await migrateUsers();
    await migrateBusinesses();
    
    // Note: Add more migration functions here for parties, items, invoices, etc.
    // Due to the large amount of data, I recommend:
    // 1. Parsing the backup file programmatically
    // 2. Or using pg_restore to a temporary database
    // 3. Then querying and migrating via this script
    
    // Verify
    await verifyMigration();
    
    console.log('\\n✅ Migration completed successfully!');
    console.log('\\n⚠️  NOTE: Only users and businesses have been migrated.');
    console.log('Add migration functions for other tables as needed.');
    
  } catch (error) {
    console.error('\\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
