/**
 * Full PostgreSQL backup importer for the invoice system.
 *
 * Parses COPY blocks from the backup and upserts all invoice-domain tables into
 * Supabase using a service role key.
 *
 * Usage:
 *   node db/migrate-data.js
 *   node db/migrate-data.js --yes
 *   node db/migrate-data.js --table items --table invoices
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BACKUP_FILE = path.join(__dirname, 'db_cluster-25-09-2025@20-07-06.backup', 'db_cluster-25-09-2025@20-07-06.backup')
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://nbgnmpnjxuragmbiieeo.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

const TABLE_ORDER = [
  'users',
  'businesses',
  'parties',
  'items',
  'invoices',
  'sales_items',
  'payments',
  'expenses',
  'bank_accounts',
  'bank_transactions',
]

const TABLE_BATCH_SIZES = {
  users: 200,
  businesses: 100,
  parties: 200,
  items: 200,
  invoices: 50,
  sales_items: 200,
  payments: 200,
  expenses: 200,
  bank_accounts: 100,
  bank_transactions: 200,
}

const COLUMN_TYPES = {
  users: { id: 'uuid', email: 'text', full_name: 'text', created_at: 'timestamp' },
  businesses: {
    id: 'uuid', user_id: 'uuid', name: 'text', address: 'text', city: 'text', state: 'text',
    pincode: 'text', phone: 'text', email: 'text', gstin: 'text', pan: 'text',
    terms_conditions: 'text', created_at: 'timestamp', invoice_template: 'text',
  },
  parties: {
    id: 'uuid', business_id: 'uuid', name: 'text', mobile: 'text', email: 'text', gstin: 'text', pan: 'text',
    type: 'text', opening_balance: 'numeric', balance_type: 'text', address: 'text', city: 'text', state: 'text',
    pincode: 'text', created_at: 'timestamp',
  },
  items: {
    id: 'uuid', business_id: 'uuid', name: 'text', code: 'text', hsn_code: 'text', gst_percent: 'numeric',
    unit: 'text', sales_price: 'numeric', purchase_price: 'numeric', opening_stock: 'integer', description: 'text', created_at: 'timestamp',
  },
  invoices: {
    id: 'uuid', business_id: 'uuid', invoice_no: 'text', date: 'date', party_name: 'text', gstin: 'text',
    state: 'text', address: 'text', items: 'json', total_tax: 'numeric', round_off: 'numeric', net_total: 'numeric',
    payment_received: 'numeric', balance_due: 'numeric', type: 'text', created_at: 'timestamp', party_id: 'uuid',
    status: 'text', due_date: 'date', payment_method: 'text', subtotal: 'numeric', discount_amount: 'numeric',
    discount_percent: 'numeric', updated_at: 'timestamp',
  },
  sales_items: {
    id: 'uuid', invoice_id: 'uuid', business_id: 'uuid', item_name: 'text', item_code: 'text', hsn_code: 'text',
    quantity: 'numeric', unit: 'text', rate: 'numeric', amount: 'numeric', gst_percent: 'numeric', gst_amount: 'numeric',
    total_amount: 'numeric', created_at: 'timestamp',
  },
  payments: {
    id: 'uuid', business_id: 'uuid', date: 'date', party_name: 'text', type: 'text', invoice_no: 'text', amount: 'numeric',
    mode: 'text', remarks: 'text', created_at: 'timestamp',
  },
  expenses: {
    id: 'uuid', business_id: 'uuid', category: 'text', description: 'text', amount: 'numeric', date: 'date',
    receipt_url: 'text', created_at: 'timestamp', updated_at: 'timestamp',
  },
  bank_accounts: {
    id: 'uuid', business_id: 'uuid', bank_name: 'text', account_number: 'text', ifsc_code: 'text', account_type: 'text',
    branch_name: 'text', account_holder_name: 'text', opening_balance: 'numeric', current_balance: 'numeric', is_active: 'boolean',
    created_at: 'timestamp', updated_at: 'timestamp',
  },
  bank_transactions: {
    id: 'uuid', business_id: 'uuid', date: 'date', bank_name: 'text', account_no: 'text', type: 'text', amount: 'numeric',
    purpose: 'text', created_at: 'timestamp',
  },
}

function parseArgs() {
  const args = process.argv.slice(2)
  const selectedTables = []
  let yes = false
  let batchSize = 0

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--yes') {
      yes = true
      continue
    }
    if (arg === '--table') {
      const table = args[index + 1]
      if (!TABLE_ORDER.includes(table)) {
        throw new Error(`Unsupported table: ${table}`)
      }
      selectedTables.push(table)
      index += 1
      continue
    }
    if (arg === '--batch-size') {
      batchSize = Number(args[index + 1] || 0)
      index += 1
      continue
    }
  }

  return {
    yes,
    batchSize,
    tables: selectedTables.length > 0 ? selectedTables : TABLE_ORDER,
  }
}

function decodeCopyValue(rawValue) {
  if (rawValue === '\\N') return null

  let result = ''
  for (let index = 0; index < rawValue.length; index += 1) {
    const char = rawValue[index]
    if (char !== '\\') {
      result += char
      continue
    }

    index += 1
    const escape = rawValue[index]
    result += ({
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
      v: '\v',
      '\\': '\\',
    }[escape] ?? escape)
  }
  return result
}

function convertValue(tableName, columnName, value) {
  if (value == null) return null
  const type = COLUMN_TYPES[tableName]?.[columnName] || 'text'
  if (type === 'integer') return Number.parseInt(value, 10)
  if (type === 'numeric') return Number.parseFloat(value)
  if (type === 'boolean') return ['t', 'true', '1'].includes(String(value).toLowerCase())
  if (type === 'json') return JSON.parse(value)
  return value
}

function parseCopyBlock(content, tableName) {
  const pattern = new RegExp(`COPY public\\.${tableName} \\((.*?)\\) FROM stdin;\\n([\\s\\S]*?)\\n\\\\\\.`, 'm')
  const match = content.match(pattern)
  if (!match) return []

  const columns = match[1].split(',').map((column) => column.trim())
  return match[2]
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const values = line.split('\t')
      if (values.length !== columns.length) {
        throw new Error(`Column/value mismatch in ${tableName}: expected ${columns.length}, got ${values.length}`)
      }
      return Object.fromEntries(columns.map((column, index) => [column, convertValue(tableName, column, decodeCopyValue(values[index]))]))
    })
}

function chunkRows(rows, batchSize) {
  const chunks = []
  for (let index = 0; index < rows.length; index += batchSize) {
    chunks.push(rows.slice(index, index + batchSize))
  }
  return chunks
}

async function upsertBatch(supabase, tableName, rows) {
  const { error } = await supabase.from(tableName).upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

async function migrateTable(supabase, tableName, rows, batchSize) {
  if (rows.length === 0) {
    console.log(`⏭️  ${tableName}: no rows`)
    return { success: 0, failed: 0 }
  }

  let success = 0
  let failed = 0
  console.log(`\n📤 Importing ${tableName}: ${rows.length} rows`)

  for (const [batchIndex, batch] of chunkRows(rows, batchSize).entries()) {
    try {
      await upsertBatch(supabase, tableName, batch)
      success += batch.length
      console.log(`  ✅ batch ${batchIndex + 1}: ${batch.length} rows`)
    } catch (batchError) {
      console.log(`  ⚠️  batch ${batchIndex + 1} failed, retrying row-by-row: ${batchError.message}`)
      for (const row of batch) {
        try {
          await upsertBatch(supabase, tableName, [row])
          success += 1
        } catch (rowError) {
          failed += 1
          console.log(`    ❌ ${tableName} row ${row.id ?? 'unknown-id'}: ${rowError.message}`)
        }
      }
    }
  }

  console.log(`  📊 ${tableName}: ${success} imported, ${failed} failed`)
  return { success, failed }
}

async function verifyCounts(supabase, expectedCounts, tables) {
  const mismatches = []
  console.log('\n🔍 Verifying target counts')
  console.log('='.repeat(60))
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true })
    if (error) throw error
    const actual = count || 0
    const expected = expectedCounts[table]
    const status = actual >= expected ? 'OK' : 'MISMATCH'
    console.log(`  ${table.padEnd(18)} source=${String(expected).padEnd(5)} target=${String(actual).padEnd(5)} ${status}`)
    if (actual < expected) mismatches.push(table)
  }
  console.log('='.repeat(60))
  return mismatches
}

async function main() {
  const args = parseArgs()

  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY is required to import all data.')
  }
  if (!fs.existsSync(BACKUP_FILE)) {
    throw new Error(`Backup file not found: ${BACKUP_FILE}`)
  }

  const content = fs.readFileSync(BACKUP_FILE, 'utf8')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const parsedRows = Object.fromEntries(args.tables.map((table) => [table, parseCopyBlock(content, table)]))
  const counts = Object.fromEntries(args.tables.map((table) => [table, parsedRows[table].length]))
  const totalRows = Object.values(counts).reduce((sum, value) => sum + value, 0)

  console.log('='.repeat(70))
  console.log(' Full Backup Import')
  console.log('='.repeat(70))
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`)
  console.log(`📁 Backup file : ${BACKUP_FILE}`)
  console.log(`📦 Tables      : ${args.tables.join(', ')}`)
  console.log('\n📊 Source rows')
  for (const table of args.tables) {
    console.log(`  ${table.padEnd(18)} ${counts[table]}`)
  }
  console.log(`  ${'total'.padEnd(18)} ${totalRows}`)

  if (!args.yes) {
    process.stdout.write('\nProceed with full import? (yes/no): ')
    const answer = await new Promise((resolve) => {
      process.stdin.once('data', (buffer) => resolve(String(buffer).trim().toLowerCase()))
    })
    if (!['yes', 'y'].includes(answer)) {
      console.log('❌ Import cancelled')
      process.exit(1)
    }
  }

  let totalSuccess = 0
  let totalFailed = 0
  for (const table of args.tables) {
    const batchSize = args.batchSize || TABLE_BATCH_SIZES[table] || 100
    const result = await migrateTable(supabase, table, parsedRows[table], batchSize)
    totalSuccess += result.success
    totalFailed += result.failed
  }

  const mismatches = await verifyCounts(supabase, counts, args.tables)
  console.log('\n✅ Import finished')
  console.log(`   Imported rows: ${totalSuccess}`)
  console.log(`   Failed rows  : ${totalFailed}`)
  if (mismatches.length > 0) {
    console.log(`   Count mismatches: ${mismatches.join(', ')}`)
    process.exit(1)
  }
  process.exit(totalFailed === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(`❌ ${error.message}`)
  process.exit(1)
})
