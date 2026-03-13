#!/usr/bin/env python3
"""
PostgreSQL Backup to Supabase Migration Script
Automatically parses PostgreSQL COPY data and migrates to Supabase

Requirements:
    pip install supabase-py python-dotenv

Usage:
    python migrate-backup.py
"""

import re
import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', 'https://nbgnmpnjxuragmbiieeo.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', '')  # Add this to .env file

BACKUP_FILE = Path(__file__).parent / 'db_cluster-25-09-2025@20-07-06.backup' / 'db_cluster-25-09-2025@20-07-06.backup'

# Table migration order (respects foreign key constraints)
TABLE_ORDER = [
    'users',
    'businesses',
    'parties',
    'items',
    'invoices',
    'sales_items',
    'payments',
    'expenses',
    'bank_accounts',
    'bank_transactions'
]

def parse_copy_statement(content: str, table_name: str) -> list:
    """Parse PostgreSQL COPY statement and extract data"""
    print(f"\\n📖 Parsing table: {table_name}")
    
    # Find COPY statement for this table
    pattern = rf'COPY public\.{table_name} \((.*?)\) FROM stdin;(.*?)\\\\\\.'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print(f"⚠️  No data found for table: {table_name}")
        return []
    
    columns = [col.strip() for col in match.group(1).split(',')]
    data_block = match.group(2).strip()
    
    # Parse rows
    rows = []
    for line in data_block.split('\\n'):
        if not line.strip():
            continue
        
        values = line.split('\\t')
        if len(values) != len(columns):
            continue
        
        row = {}
        for col, val in zip(columns, values):
            # Convert \\N to None (NULL in PostgreSQL)
            if val == '\\N':
                row[col] = None
            else:
                row[col] = val
        
        rows.append(row)
    
    print(f"✅ Parsed {len(rows)} rows from {table_name}")
    return rows

def migrate_table(supabase: Client, table_name: str, rows: list, batch_size: int = 100):
    """Migrate data to Supabase table"""
    if not rows:
        print(f"⏭️  Skipping {table_name} (no data)")
        return
    
    print(f"\\n📤 Migrating {table_name}...")
    total = len(rows)
    success = 0
    errors = 0
    
    # Migrate in batches
    for i in range(0, total, batch_size):
        batch = rows[i:i + batch_size]
        
        try:
            response = supabase.table(table_name).upsert(batch).execute()
            success += len(batch)
            print(f"  ✅ Batch {i//batch_size + 1}: {len(batch)} rows migrated")
        except Exception as e:
            errors += len(batch)
            print(f"  ❌ Batch {i//batch_size + 1} failed: {str(e)}")
    
    print(f"\\n📊 {table_name} migration complete: {success} success, {errors} errors out of {total} total")

def disable_rls(supabase: Client):
    """Temporarily disable RLS for migration"""
    print("\\n🔓 Disabling RLS for migration...")
    
    for table in TABLE_ORDER:
        try:
            supabase.rpc(f'rpc_disable_rls_{table}').execute()
        except:
            pass  # RLS control may not be available via RPC

def enable_rls(supabase: Client):
    """Re-enable RLS after migration"""
    print("\\n🔒 Re-enabling RLS...")
    
    for table in TABLE_ORDER:
        try:
            supabase.rpc(f'rpc_enable_rls_{table}').execute()
        except:
            pass

def verify_migration(supabase: Client):
    """Verify migrated data"""
    print("\\n🔍 Verifying migration...")
    print("=" * 50)
    
    for table in TABLE_ORDER:
        try:
            response = supabase.table(table).select('*', count='exact').limit(1).execute()
            count = response.count
            print(f"  {table:<20} {count:>6} rows")
        except Exception as e:
            print(f"  {table:<20} ERROR: {str(e)}")
    
    print("=" * 50)

def main():
    print("=" * 60)
    print(" PostgreSQL Backup to Supabase Migration")
    print("=" * 60)
    
    # Check configuration
    if not SUPABASE_SERVICE_KEY:
        print("\\n❌ ERROR: SUPABASE_SERVICE_KEY not set!")
        print("Add it to your .env file:")
        print("SUPABASE_SERVICE_KEY=your_service_role_key_here")
        print("\\nGet it from: Supabase Dashboard > Settings > API > service_role key")
        return
    
    if not BACKUP_FILE.exists():
        print(f"\\n❌ ERROR: Backup file not found at: {BACKUP_FILE}")
        return
    
    print(f"\\n📍 Supabase URL: {SUPABASE_URL}")
    print(f"📁 Backup file: {BACKUP_FILE}")
    
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Read backup file
    print("\\n📖 Reading backup file...")
    with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"✅ Backup file loaded ({len(content)} bytes)")
    
    # Parse and migrate each table
    all_data = {}
    for table in TABLE_ORDER:
        try:
            rows = parse_copy_statement(content, table)
            all_data[table] = rows
        except Exception as e:
            print(f"❌ Error parsing {table}: {str(e)}")
            all_data[table] = []
    
    # Confirm migration
    total_rows = sum(len(rows) for rows in all_data.values())
    print(f"\\n📊 Total rows to migrate: {total_rows}")
    
    confirm = input("\\n⚠️  Proceed with migration? (yes/no): ")
    if confirm.lower() not in ['yes', 'y']:
        print("❌ Migration cancelled")
        return
    
    # Migrate data
    try:
        for table in TABLE_ORDER:
            if all_data[table]:
                migrate_table(supabase, table, all_data[table])
        
        # Verify
        verify_migration(supabase)
        
        print("\\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print  (f"\\n❌ Migration failed: {str(e)}")
        raise

if __name__ == '__main__':
    main()
