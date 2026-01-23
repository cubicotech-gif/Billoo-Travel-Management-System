# Billoo Travel Management System - Database Schema

This directory contains the SQL schema files for the Billoo Travel Management System using Supabase (PostgreSQL).

## Files

### ✅ **complete-schema.sql** (RECOMMENDED)
The complete, corrected, and production-ready schema file that includes:
- All core tables (users, queries, passengers, vendors, invoices, payments)
- All enhanced features (pricing, services, activities, documents, reminders, etc.)
- Correct SQL syntax with all known issues fixed
- Idempotent (safe to run multiple times)
- Complete Row Level Security (RLS) policies
- Performance indexes
- Sample email templates

**This is the file you should use for new deployments or to update your database.**

### Legacy Files (for reference only)
- **schema.sql** - Original base schema
- **enhanced-schema.sql** - Enhanced features (has trigger conflicts)
- **enhanced-schema-fixed.sql** - Enhanced features with trigger fixes

## How to Deploy

### Option 1: Fresh Installation (New Database)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `complete-schema.sql`
5. Click **Run** to execute the schema

### Option 2: Update Existing Database

If you already have a database with the base schema:

1. **Backup your data first!** (Use Supabase Dashboard > Database > Backups)
2. Go to **SQL Editor** in Supabase
3. Copy and paste the contents of `complete-schema.sql`
4. Click **Run** to execute

The schema is designed to be idempotent, meaning:
- It will create tables that don't exist
- It will add missing columns to existing tables
- It will not duplicate or break existing data
- It uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` clauses

### Option 3: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push database/complete-schema.sql
```

## Database Structure

### Core Tables

| Table | Description |
|-------|-------------|
| **users** | User accounts and roles (admin, manager, agent, finance, viewer) |
| **queries** | Travel inquiries and bookings with pricing (cost_price, selling_price, profit) |
| **passengers** | Passenger information including passport details |
| **vendors** | Suppliers with extended fields (bank details, GST, PAN, credit limits) |
| **invoices** | Customer invoices with payment tracking |
| **payments** | Payment records for both customers and vendors |

### Enhanced Feature Tables

| Table | Description |
|-------|-------------|
| **query_services** | Detailed breakdown of services (flights, hotels, etc.) per query |
| **activities** | Activity log for audit trail (who did what, when) |
| **documents** | File attachments (passports, tickets, vouchers, etc.) |
| **reminders** | Task reminders and follow-ups |
| **email_templates** | Email templates with variable substitution |
| **communications** | Communication history (emails, calls, SMS, WhatsApp) |
| **invoice_items** | Line items for invoices |
| **user_preferences** | User settings (theme, notifications, timezone, etc.) |

## Key Features

### 1. Automatic Profit Calculation
The `queries` table includes computed columns:
- `profit` = `selling_price` - `cost_price`
- `profit_margin` = percentage profit margin

### 2. Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:
- Authenticated users can view and manage most records
- Users can only see their own reminders and preferences
- Admin/manager roles can manage email templates

### 3. Auto-Generated IDs
- Query numbers: `QRY-YYYYMMDD-XXXX`
- Invoice numbers: `INV-YYYYMMDD-XXXX`

### 4. Audit Trail
The `activities` table tracks all important actions across the system.

### 5. Updated Timestamps
All main tables have `updated_at` columns that automatically update on modifications.

## Common Issues Fixed

### ✅ User Preferences Table
**Issue:** Foreign key constraint was in wrong order
**Fixed:** Changed from `user_id UUID REFERENCES ... PRIMARY KEY` to `user_id UUID PRIMARY KEY REFERENCES ...`

### ✅ Trigger Conflicts
**Issue:** Running schema multiple times caused trigger conflicts
**Fixed:** Added `DROP TRIGGER IF EXISTS` before each `CREATE TRIGGER`

### ✅ Policy Conflicts
**Issue:** Policies couldn't be recreated on subsequent runs
**Fixed:** Added `DROP POLICY IF EXISTS` before each `CREATE POLICY`

### ✅ JSONB Variables Format
**Issue:** Email template variables had incorrect JSONB syntax
**Fixed:** Changed from `'{"key1", "key2"}'::jsonb` to `'["key1", "key2"]'::jsonb`

## TypeScript Types

The TypeScript types are defined in `src/types/database.ts` and are kept in sync with this schema.

## Sample Email Templates

The schema includes 4 pre-configured email templates:
1. **query_confirmation** - Sent when a new query is received
2. **quotation** - Sent with price quotes
3. **booking_confirmation** - Sent when booking is confirmed
4. **payment_reminder** - Sent for payment reminders

Templates support variable substitution using `{{variable_name}}` syntax.

## Support

For issues or questions:
1. Check the TypeScript types match the schema
2. Ensure you're running the `complete-schema.sql` file
3. Verify RLS policies are not blocking your operations
4. Check Supabase logs for detailed error messages

## License

This schema is part of the Billoo Travel Management System.
