#!/usr/bin/env python3
"""
Full PostgreSQL backup importer for the invoice system.

Parses COPY blocks from the backup in db/db_cluster-25-09-2025@20-07-06.backup/
and upserts all invoice-domain tables into Supabase using a service role key.

Requirements:
    pip install supabase python-dotenv

Usage:
    python db/migrate-backup.py
    python db/migrate-backup.py --yes
    python db/migrate-backup.py --table items
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client


load_dotenv()

BACKUP_FILE = Path(__file__).parent / "db_cluster-25-09-2025@20-07-06.backup" / "db_cluster-25-09-2025@20-07-06.backup"
SUPABASE_URL = (
    os.getenv("SUPABASE_URL")
    or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    or os.getenv("VITE_SUPABASE_URL")
    or "https://nbgnmpnjxuragmbiieeo.supabase.co"
)
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

TABLE_ORDER = [
    "users",
    "businesses",
    "parties",
    "items",
    "invoices",
    "sales_items",
    "payments",
    "expenses",
    "bank_accounts",
    "bank_transactions",
]

TABLE_BATCH_SIZES = {
    "users": 200,
    "businesses": 100,
    "parties": 200,
    "items": 200,
    "invoices": 50,
    "sales_items": 200,
    "payments": 200,
    "expenses": 200,
    "bank_accounts": 100,
    "bank_transactions": 200,
}

COLUMN_TYPES: dict[str, dict[str, str]] = {
    "users": {
        "id": "uuid",
        "email": "text",
        "full_name": "text",
        "created_at": "timestamp",
    },
    "businesses": {
        "id": "uuid",
        "user_id": "uuid",
        "name": "text",
        "address": "text",
        "city": "text",
        "state": "text",
        "pincode": "text",
        "phone": "text",
        "email": "text",
        "gstin": "text",
        "pan": "text",
        "terms_conditions": "text",
        "created_at": "timestamp",
        "invoice_template": "text",
    },
    "parties": {
        "id": "uuid",
        "business_id": "uuid",
        "name": "text",
        "mobile": "text",
        "email": "text",
        "gstin": "text",
        "pan": "text",
        "type": "text",
        "opening_balance": "numeric",
        "balance_type": "text",
        "address": "text",
        "city": "text",
        "state": "text",
        "pincode": "text",
        "created_at": "timestamp",
    },
    "items": {
        "id": "uuid",
        "business_id": "uuid",
        "name": "text",
        "code": "text",
        "hsn_code": "text",
        "gst_percent": "numeric",
        "unit": "text",
        "sales_price": "numeric",
        "purchase_price": "numeric",
        "opening_stock": "integer",
        "description": "text",
        "created_at": "timestamp",
    },
    "invoices": {
        "id": "uuid",
        "business_id": "uuid",
        "invoice_no": "text",
        "date": "date",
        "party_name": "text",
        "gstin": "text",
        "state": "text",
        "address": "text",
        "items": "json",
        "total_tax": "numeric",
        "round_off": "numeric",
        "net_total": "numeric",
        "payment_received": "numeric",
        "balance_due": "numeric",
        "type": "text",
        "created_at": "timestamp",
        "party_id": "uuid",
        "status": "text",
        "due_date": "date",
        "payment_method": "text",
        "subtotal": "numeric",
        "discount_amount": "numeric",
        "discount_percent": "numeric",
        "updated_at": "timestamp",
    },
    "sales_items": {
        "id": "uuid",
        "invoice_id": "uuid",
        "business_id": "uuid",
        "item_name": "text",
        "item_code": "text",
        "hsn_code": "text",
        "quantity": "numeric",
        "unit": "text",
        "rate": "numeric",
        "amount": "numeric",
        "gst_percent": "numeric",
        "gst_amount": "numeric",
        "total_amount": "numeric",
        "created_at": "timestamp",
    },
    "payments": {
        "id": "uuid",
        "business_id": "uuid",
        "date": "date",
        "party_name": "text",
        "type": "text",
        "invoice_no": "text",
        "amount": "numeric",
        "mode": "text",
        "remarks": "text",
        "created_at": "timestamp",
    },
    "expenses": {
        "id": "uuid",
        "business_id": "uuid",
        "category": "text",
        "description": "text",
        "amount": "numeric",
        "date": "date",
        "receipt_url": "text",
        "created_at": "timestamp",
        "updated_at": "timestamp",
    },
    "bank_accounts": {
        "id": "uuid",
        "business_id": "uuid",
        "bank_name": "text",
        "account_number": "text",
        "ifsc_code": "text",
        "account_type": "text",
        "branch_name": "text",
        "account_holder_name": "text",
        "opening_balance": "numeric",
        "current_balance": "numeric",
        "is_active": "boolean",
        "created_at": "timestamp",
        "updated_at": "timestamp",
    },
    "bank_transactions": {
        "id": "uuid",
        "business_id": "uuid",
        "date": "date",
        "bank_name": "text",
        "account_no": "text",
        "type": "text",
        "amount": "numeric",
        "purpose": "text",
        "created_at": "timestamp",
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import all invoice-system data from a PostgreSQL backup into Supabase.")
    parser.add_argument("--yes", action="store_true", help="Run without interactive confirmation.")
    parser.add_argument("--table", choices=TABLE_ORDER, action="append", help="Limit import to one or more specific tables.")
    parser.add_argument("--batch-size", type=int, default=0, help="Override batch size for all tables.")
    return parser.parse_args()


def decode_copy_value(raw_value: str) -> str | None:
    if raw_value == r"\N":
        return None

    result: list[str] = []
    index = 0
    while index < len(raw_value):
        char = raw_value[index]
        if char != "\\":
            result.append(char)
            index += 1
            continue

        index += 1
        if index >= len(raw_value):
            result.append("\\")
            break

        escape = raw_value[index]
        result.append(
            {
                "b": "\b",
                "f": "\f",
                "n": "\n",
                "r": "\r",
                "t": "\t",
                "v": "\v",
                "\\": "\\",
            }.get(escape, escape)
        )
        index += 1

    return "".join(result)


def convert_value(table_name: str, column_name: str, value: str | None) -> Any:
    if value is None:
        return None

    column_type = COLUMN_TYPES.get(table_name, {}).get(column_name, "text")

    if column_type == "integer":
        return int(value)
    if column_type == "numeric":
        return float(value)
    if column_type == "boolean":
        return value.lower() in {"t", "true", "1"}
    if column_type == "json":
        return json.loads(value)

    return value


def parse_copy_block(content: str, table_name: str) -> list[dict[str, Any]]:
    pattern = rf"COPY public\.{re.escape(table_name)} \((.*?)\) FROM stdin;\n(.*?)\n\\\."
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        return []

    columns = [column.strip() for column in match.group(1).split(",")]
    data_block = match.group(2)
    rows: list[dict[str, Any]] = []

    for line in data_block.splitlines():
        if not line.strip():
            continue
        values = line.split("\t")
        if len(values) != len(columns):
            raise ValueError(f"Column/value mismatch in {table_name}: expected {len(columns)}, got {len(values)}")

        row = {
            column: convert_value(table_name, column, decode_copy_value(value))
            for column, value in zip(columns, values)
        }
        rows.append(row)

    return rows


def load_backup() -> str:
    if not BACKUP_FILE.exists():
        raise FileNotFoundError(f"Backup file not found: {BACKUP_FILE}")
    return BACKUP_FILE.read_text(encoding="utf-8")


def init_supabase() -> Client:
    if not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_KEY is required to import all data.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def chunk_rows(rows: list[dict[str, Any]], batch_size: int) -> list[list[dict[str, Any]]]:
    return [rows[index:index + batch_size] for index in range(0, len(rows), batch_size)]


def upsert_batch(supabase: Client, table_name: str, rows: list[dict[str, Any]]) -> None:
    supabase.table(table_name).upsert(rows, on_conflict="id").execute()


def migrate_table(supabase: Client, table_name: str, rows: list[dict[str, Any]], batch_size: int) -> tuple[int, int]:
    if not rows:
        print(f"⏭️  {table_name}: no rows")
        return (0, 0)

    success = 0
    failed = 0
    print(f"\n📤 Importing {table_name}: {len(rows)} rows")

    for batch_number, batch in enumerate(chunk_rows(rows, batch_size), start=1):
        try:
            upsert_batch(supabase, table_name, batch)
            success += len(batch)
            print(f"  ✅ batch {batch_number}: {len(batch)} rows")
        except Exception as batch_error:
            print(f"  ⚠️  batch {batch_number} failed, retrying row-by-row: {batch_error}")
            for row in batch:
                try:
                    upsert_batch(supabase, table_name, [row])
                    success += 1
                except Exception as row_error:
                    failed += 1
                    row_id = row.get("id", "unknown-id")
                    print(f"    ❌ {table_name} row {row_id}: {row_error}")

    print(f"  📊 {table_name}: {success} imported, {failed} failed")
    return (success, failed)


def verify_counts(supabase: Client, expected_counts: dict[str, int], tables: list[str]) -> list[str]:
    mismatches: list[str] = []
    print("\n🔍 Verifying target counts")
    print("=" * 60)
    for table in tables:
        expected = expected_counts[table]
        response = supabase.table(table).select("id", count="exact").limit(1).execute()
        actual = response.count or 0
        status = "OK" if actual >= expected else "MISMATCH"
        print(f"  {table:<18} source={expected:<5} target={actual:<5} {status}")
        if actual < expected:
            mismatches.append(table)
    print("=" * 60)
    return mismatches


def main() -> int:
    args = parse_args()
    tables = args.table or TABLE_ORDER

    try:
        content = load_backup()
        supabase = init_supabase()
    except Exception as error:
        print(f"❌ {error}")
        return 1

    print("=" * 70)
    print(" Full Backup Import")
    print("=" * 70)
    print(f"📍 Supabase URL: {SUPABASE_URL}")
    print(f"📁 Backup file : {BACKUP_FILE}")
    print(f"📦 Tables      : {', '.join(tables)}")

    parsed_rows = {table: parse_copy_block(content, table) for table in tables}
    counts = {table: len(rows) for table, rows in parsed_rows.items()}
    total_rows = sum(counts.values())

    print("\n📊 Source rows")
    for table in tables:
        print(f"  {table:<18} {counts[table]}")
    print(f"  {'total':<18} {total_rows}")

    if not args.yes:
        confirm = input("\nProceed with full import? (yes/no): ").strip().lower()
        if confirm not in {"yes", "y"}:
            print("❌ Import cancelled")
            return 1

    total_success = 0
    total_failed = 0
    for table in tables:
        batch_size = args.batch_size or TABLE_BATCH_SIZES.get(table, 100)
        success, failed = migrate_table(supabase, table, parsed_rows[table], batch_size)
        total_success += success
        total_failed += failed

    mismatches = verify_counts(supabase, counts, tables)

    print("\n✅ Import finished")
    print(f"   Imported rows: {total_success}")
    print(f"   Failed rows  : {total_failed}")
    if mismatches:
        print(f"   Count mismatches: {', '.join(mismatches)}")
        return 1
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
