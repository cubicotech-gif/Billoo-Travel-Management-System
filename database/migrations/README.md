# Vendor Management & Accounting System - Database Migrations

## Overview

This directory contains database migrations for the **Vendor Management & Accounting System**. These migrations are designed for **Phase 1** - establishing the database structure only (no UI).

## Migration Files

### 1. `001_vendor_management_system.sql`
Main migration file that sets up the complete vendor management database structure.

**What it does:**
- ✅ Updates `vendors` table with new accounting columns
- ✅ Creates `vendor_transactions` table for financial tracking
- ✅ Creates performance indexes
- ✅ Sets up auto-update trigger for vendor totals
- ✅ Configures Row Level Security (RLS) policies

### 2. `001_test_queries.sql`
Comprehensive test queries to verify the migration was successful.

**What it does:**
- Verifies all new columns exist
- Checks table structure
- Confirms indexes are created
- Validates trigger function
- Verifies RLS policies
- Includes optional sample data insertion

### 3. `001_rollback.sql`
Rollback script to undo all changes if needed.

**⚠️ WARNING:** Running this will delete all vendor transaction data!

## Database Structure

### Updated Vendors Table

**New Columns Added:**
| Column | Type | Description |
|--------|------|-------------|
| `whatsapp_number` | TEXT | WhatsApp contact number |
| `swift_code` | TEXT | SWIFT code for international transfers |
| `iban` | TEXT | International Bank Account Number |
| `credit_days` | INTEGER | Payment credit period (default: 0) |
| `payment_method_preference` | TEXT | Preferred payment method |
| `is_active` | BOOLEAN | Active status (default: true) |
| `is_deleted` | BOOLEAN | Soft delete flag (default: false) |
| `total_business` | DECIMAL(12,2) | Total purchase amount (auto-updated) |
| `total_paid` | DECIMAL(12,2) | Total amount paid (auto-updated) |
| `total_pending` | DECIMAL(12,2) | Pending payments (auto-updated) |
| `total_profit` | DECIMAL(12,2) | Total profit from vendor (auto-updated) |

**Existing Columns Preserved:**
- `id`, `name`, `type`, `contact_person`, `phone`, `email`, `address`
- `bank_name`, `account_number`, `notes`
- `created_at`, `updated_at`

### New Vendor Transactions Table

**Primary Fields:**
- `id` - UUID primary key
- `vendor_id` - Links to vendor
- `query_id` - Links to query
- `service_id` - Links to service
- `passenger_id` - Optional passenger reference

**Transaction Details:**
- `transaction_date` - Date of transaction
- `service_description` - Description of service
- `service_type` - Type of service
- `city` - City/location

**Currency & Amounts:**
| Field | Type | Description |
|-------|------|-------------|
| `currency` | TEXT | PKR, SAR, USD, AED, EUR, GBP |
| `exchange_rate_to_pkr` | DECIMAL(10,4) | **MANUALLY ENTERED** exchange rate |
| `purchase_amount_original` | DECIMAL(12,2) | Amount in vendor's currency |
| `purchase_amount_pkr` | DECIMAL(12,2) | Converted to PKR |
| `selling_amount_original` | DECIMAL(12,2) | Selling price in original currency |
| `selling_amount_pkr` | DECIMAL(12,2) | Selling price in PKR |
| `profit_pkr` | DECIMAL(12,2) | **AUTO-CALCULATED** profit |

**Payment Tracking:**
- `payment_status` - PENDING, PAID, PARTIAL, OVERPAID
- `amount_paid` - Amount paid so far
- `payment_date` - Date of payment
- `payment_method` - Method of payment
- `payment_reference` - Reference number
- `payment_notes` - Payment notes
- `receipt_url` - Receipt/proof URL

**Other:**
- `booking_reference` - Booking reference number
- `notes` - Additional notes
- `created_at`, `updated_at` - Timestamps

### Performance Indexes

The following indexes are created for optimal query performance:
- `idx_vendor_trans_vendor_id` - Fast vendor lookups
- `idx_vendor_trans_query_id` - Fast query lookups
- `idx_vendor_trans_service_id` - Fast service lookups
- `idx_vendor_trans_status` - Filter by payment status
- `idx_vendor_trans_date` - Date range queries
- `idx_vendor_trans_passenger_id` - Passenger transaction lookups

### Auto-Update Trigger

**Function:** `update_vendor_totals()`

**Trigger:** `trigger_update_vendor_totals`

**When it runs:** After INSERT, UPDATE, or DELETE on `vendor_transactions`

**What it calculates:**
```sql
total_business = SUM(purchase_amount_pkr)
total_paid = SUM(amount_paid)
total_pending = SUM(purchase_amount_pkr - amount_paid) WHERE status != 'PAID'
total_profit = SUM(profit_pkr)
```

## Installation Instructions

### Step 1: Run the Migration

**Using Supabase Dashboard:**
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy the contents of `001_vendor_management_system.sql`
4. Paste and click **Run**
5. Wait for success message

**Using psql (Command Line):**
```bash
psql -h your-supabase-host -U postgres -d postgres -f 001_vendor_management_system.sql
```

**Using Supabase CLI:**
```bash
supabase db reset
# Then apply your migration
```

### Step 2: Verify Installation

Run the test queries from `001_test_queries.sql`:

```bash
psql -h your-supabase-host -U postgres -d postgres -f 001_test_queries.sql
```

**Expected Results:**
- ✅ New columns appear in vendors table
- ✅ vendor_transactions table exists (empty initially)
- ✅ All indexes are created
- ✅ Trigger function is active
- ✅ RLS policies are enabled

### Step 3: (Optional) Test with Sample Data

Uncomment section 6 in `001_test_queries.sql` to insert sample data and verify the trigger works correctly.

## Usage Examples

### Example 1: Insert a Transaction

```sql
INSERT INTO public.vendor_transactions (
  vendor_id,
  query_id,
  service_id,
  transaction_date,
  service_description,
  service_type,
  currency,
  exchange_rate_to_pkr,  -- MANUALLY ENTERED
  purchase_amount_original,
  purchase_amount_pkr,
  selling_amount_original,
  selling_amount_pkr,
  payment_status
) VALUES (
  'vendor-uuid-here',
  'query-uuid-here',
  'service-uuid-here',
  '2026-01-28',
  'Flight Ticket - Karachi to Jeddah',
  'Flight',
  'SAR',
  74.50,  -- Today's PKR to SAR rate (manual entry)
  1500.00,  -- 1500 SAR
  111750.00,  -- 1500 * 74.50
  1800.00,  -- 1800 SAR selling price
  134100.00,  -- 1800 * 74.50
  'PENDING'
);
```

**Result:** Vendor's `total_business`, `total_pending`, and `total_profit` are automatically updated!

### Example 2: Record a Payment

```sql
UPDATE public.vendor_transactions
SET
  payment_status = 'PAID',
  amount_paid = 111750.00,
  payment_date = CURRENT_DATE,
  payment_method = 'Bank Transfer',
  payment_reference = 'TXN123456'
WHERE id = 'transaction-uuid-here';
```

**Result:** Vendor's `total_paid` and `total_pending` are automatically updated!

### Example 3: View Vendor Summary

```sql
SELECT
  name,
  type,
  total_business,
  total_paid,
  total_pending,
  total_profit,
  CASE
    WHEN total_business > 0
    THEN ROUND((total_profit / total_business * 100), 2)
    ELSE 0
  END as profit_margin_percentage
FROM public.vendors
WHERE is_deleted = false
  AND is_active = true
ORDER BY total_business DESC;
```

## Important Notes

### Exchange Rate Handling

⚠️ **IMPORTANT:** Exchange rates are **MANUALLY ENTERED** when creating transactions.

- **NO** automatic exchange rate fetching
- **NO** exchange_rates table
- You must enter the current rate yourself
- This gives you full control over accounting

**Example:**
```sql
-- If today 1 USD = 278 PKR, you enter:
exchange_rate_to_pkr = 278.00
purchase_amount_original = 100.00  -- 100 USD
purchase_amount_pkr = 27800.00     -- 100 * 278
```

### Supported Currencies

- **PKR** - Pakistani Rupee (default)
- **SAR** - Saudi Riyal
- **USD** - US Dollar
- **AED** - UAE Dirham
- **EUR** - Euro
- **GBP** - British Pound

### Payment Status Values

- **PENDING** - No payment made yet
- **PAID** - Fully paid
- **PARTIAL** - Partially paid
- **OVERPAID** - Paid more than required

### Data Integrity

The migration includes these safety features:
- ✅ Foreign key constraints with `ON DELETE RESTRICT` prevent accidental deletions
- ✅ Check constraints ensure amounts are non-negative
- ✅ Soft delete flag (`is_deleted`) preserves data history
- ✅ Computed columns automatically calculate profit
- ✅ Triggers keep vendor totals in sync
- ✅ RLS policies ensure data security

## Rollback Instructions

⚠️ **WARNING:** This will permanently delete all vendor transaction data!

**To rollback the migration:**

```bash
psql -h your-supabase-host -U postgres -d postgres -f 001_rollback.sql
```

**This will:**
1. Drop the vendor_transactions table
2. Remove the trigger and function
3. Delete all indexes
4. Remove new columns from vendors table

**Use only if you need to completely undo the migration.**

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution:** The migration is idempotent - you can run it multiple times safely. It uses `IF NOT EXISTS` and `IF EXISTS` clauses.

### Issue: Trigger not updating vendor totals

**Solution:**
1. Check if trigger exists:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_vendor_totals';
```

2. Manually run the function:
```sql
SELECT update_vendor_totals() FROM vendor_transactions LIMIT 1;
```

### Issue: RLS blocking queries

**Solution:** Ensure you're authenticated. RLS policies require `auth.role() = 'authenticated'`.

## Next Steps (Phase 2)

After successful database setup, Phase 2 will include:
- 🎨 UI for vendor management
- 📊 Transaction entry forms
- 💰 Payment recording interface
- 📈 Vendor reports and analytics
- 🔍 Search and filtering
- 📄 Export functionality

## Support

For issues or questions:
1. Review test queries in `001_test_queries.sql`
2. Check verification queries
3. Review trigger function logic
4. Examine RLS policies

## Schema Version

- **Version:** 001
- **Date:** 2026-01-28
- **Phase:** 1 (Database Structure Only)
- **Status:** Production Ready

---

**Ready to track vendor transactions and manage accounting! 🚀**
