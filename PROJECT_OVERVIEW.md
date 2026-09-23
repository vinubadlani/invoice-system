# HisabKitab — Invoicing & Accounting System

## What this is

A web-based invoicing and basic accounting application for small/medium businesses in India ("Hisab Kitaab" = Hindi for "bookkeeping"). It lets a business owner manage customers/suppliers, products, sales and purchase invoices, payments, bank transactions, expenses, and view financial reports — all backed by Supabase (PostgreSQL + Auth).

Built with **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Zustand**, and **Supabase**.

## Core domain

Everything is scoped to a **business** (`businesses` table), and a business belongs to a **user** (`users` / Supabase Auth). One login can own/manage multiple businesses, switched via `BusinessSelector` / `BusinessContext`.

### Main entities (Postgres tables)
- `users` — user profiles (synced with Supabase Auth)
- `businesses` — company profile: name, address, GSTIN, PAN, terms & conditions, chosen invoice template
- `parties` — customers and suppliers ("Debtor"/"Creditor"/"Expense" type), with opening balances, GSTIN, state (for GST place-of-supply logic)
- `items` — products/services: HSN code, GST %, unit, sales/purchase price, opening stock
- `invoices` — sales **and** purchase invoices/bills (one table, differentiated by type), with GST fields
- `sales_items` — line items belonging to an invoice
- `payments` — payment-in / payment-out records against parties
- `bank_accounts` / `bank_transactions` — bank account registry and deposits/withdrawals/expenses ledger
- `expenses` — categorized business expenses

Row Level Security (RLS) policies restrict each business's data to its owning user (`scripts/setup-rls-policies.sql`).

## Features (by app route)

| Route | Purpose |
|---|---|
| `/dashboard` | Overview/home screen after login |
| `/sales`, `/sales-entry` | List and create sales invoices |
| `/purchases`, `/purchase-entry` | List and create purchase invoices/bills |
| `/party` | Manage customers & suppliers, ledgers, balances |
| `/item` | Manage products/services and stock |
| `/payments` | Record and track payment-in/payment-out |
| `/bank` | Bank accounts + deposit/withdrawal/expense transactions |
| `/expenses` | Log and categorize business expenses |
| `/ledger` | Party-wise or account-wise transaction ledger |
| `/reports` | Business analytics/reports (sales, GST, P&L-style summaries) |
| `/print`, `/invoice-downloads` | Print/PDF generation for invoices |
| `/upload`, `/download-templates` | Bulk import via Excel/CSV (see `ExcelUploader.tsx`, `SalesBulkUploadDialog.tsx`) and downloadable import templates |
| `/settings` | Business profile, invoice templates, preferences |
| `/chat` | In-app assistant (`ChatBot.tsx`) — currently a rule-based fallback, not a live LLM (`app/api/ai-assistant/route.ts` returns canned navigation help) |
| `/auth/*` | Login, signup, forgot password, email verification (Supabase Auth) |
| `/landing` | Public marketing/landing page |

Invoices can be rendered/exported as PDFs (`jspdf`, `jspdf-autotable`, `InvoiceRenderer.tsx`, `A4SinglePageInvoice.tsx`) using selectable templates (`InvoiceTemplates.tsx`, `CustomTemplatesManager.tsx`, `TemplateEditor.tsx`, backed by `app/api/templates/*` routes and `lib/template-renderer.ts`).

## Architecture notes

- **`app/`** is the live Next.js application (App Router). A parallel **`src/`** directory contains an older/legacy React (Create-React-App style, `.js` pages with names like `Quotation`, `CreditNote`, `DebitNote`, `Godown`, `Inventory`) that is **not wired into the active app** — appears to be a prior iteration kept around, not part of the current build.
- **Data access**: `lib/supabase.ts` / `lib/supabaseClient.ts` set up the Supabase client; `lib/api.ts` and `lib/rpc-api.ts` wrap CRUD and Postgres RPC calls; `lib/cache-store.ts` provides client-side caching (`useOptimizedData`) to avoid redundant fetches; `lib/session-manager.ts` and `lib/auth.ts` handle auth/session state.
- **State/context**: `app/context/AppContext.tsx` (domain types + app-wide state) and `app/context/BusinessContext.tsx` (currently selected business, persisted to `localStorage`) wrap the app via `app/layout.tsx`.
- **UI system**: `components/ui/*` is a full shadcn/ui kit (51 primitives: dialogs, tables, forms, toasts, etc.) on top of Radix UI + Tailwind.
- **Database migrations/scripts** live in `db/` and `scripts/` — raw SQL for table creation, RLS policies, RPC hardening, schema fixes, and one-off data migrations, plus a Python/Node migration helper.

## Known gaps / things to be aware of

- The AI Assistant / Chat feature is a **static fallback**, not connected to a real LLM.
- The `src/` directory duplicates most routes in an older stack — worth confirming with the team whether it can be deleted.
- Per saved project memory: this app has previously hidden older records from list/search screens via hardcoded row caps — worth re-checking any new listing page for the same pattern.
