# Database Schema

This directory contains the database schema for the Billoo Travel Management System (Supabase/PostgreSQL).

## Files

| File | Purpose |
|------|---------|
| **complete-schema.sql** | Single authoritative schema - use this for all deployments |

The `supabase/migrations/` directory at project root contains incremental migrations used during development. The `complete-schema.sql` file is the consolidated, up-to-date version of all migrations.

## How to Deploy

### Fresh Installation

1. Go to your Supabase project dashboard > **SQL Editor**
2. Paste the contents of `complete-schema.sql`
3. Click **Run**

The schema is idempotent (safe to run multiple times) using `IF NOT EXISTS` and `DROP ... IF EXISTS` throughout.

### Using Supabase CLI

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push database/complete-schema.sql
```

## Tables (17)

### Core Tables

| Table | Description |
|-------|-------------|
| **users** | User accounts and roles (admin, manager, agent, finance, viewer) |
| **queries** | Travel inquiries with 10-stage workflow, pricing, and profit calculations |
| **passengers** | Passenger profiles with passport and document details |
| **vendors** | Suppliers with banking, credit, and accounting totals |
| **invoices** | Customer invoices with payment tracking |
| **payments** | Payment records for customers and vendors |

### Query Workflow Tables

| Table | Description |
|-------|-------------|
| **query_services** | Service breakdown per query (flights, hotels, visa, etc.) with booking/delivery status |
| **query_proposals** | Proposal versions with pricing snapshots and customer responses |
| **query_passengers** | Many-to-many junction linking queries to passengers |
| **vendor_transactions** | Financial tracking of vendor payments with multi-currency support |

### Supporting Tables

| Table | Description |
|-------|-------------|
| **activities** | Audit trail of all actions |
| **documents** | File attachment metadata (stored in Supabase Storage) |
| **reminders** | Follow-up tasks and notifications |
| **email_templates** | Email templates with variable substitution |
| **communications** | Call, email, SMS, WhatsApp history |
| **invoice_items** | Line items for invoices |
| **user_preferences** | User settings (theme, notifications, timezone) |

## Key Features

- **10-Stage Query Workflow**: New Query → Responded → Working on Proposal → Proposal Sent → Revisions → Finalized & Booking → Services Booked → In Delivery → Completed → Cancelled
- **Computed Columns**: `profit` and `profit_margin` are auto-calculated at the DB level
- **Auto-Generated IDs**: `QRY-YYYYMMDD-XXXX` for queries, `INV-YYYYMMDD-XXXX` for invoices
- **Vendor Totals Trigger**: `total_business`, `total_paid`, `total_pending`, `total_profit` auto-update when transactions change
- **Booking Sync Trigger**: Service booking status auto-updates when vendor payment status changes
- **Row Level Security**: All 17 tables have RLS policies
- **Multi-Currency**: PKR, SAR, USD, AED, EUR, GBP with exchange rate tracking

## TypeScript Types

The corresponding TypeScript types are in:
- `src/types/database.ts` (auto-generated Supabase types)
- `src/types/proposals.ts` (proposal workflow types)
- `src/types/query-workflow.ts` (query workflow types)
