-- =====================================================
-- ROLLBACK FOR VENDOR MANAGEMENT SYSTEM - PHASE 1
-- Migration: 001_vendor_management_system
-- Description: Undo all changes made by the vendor management migration
-- Date: 2026-01-28
-- ⚠️  WARNING: This will delete all vendor transaction data!
-- =====================================================

-- =====================================================
-- STEP 1: DROP TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_vendor_totals ON public.vendor_transactions;
DROP TRIGGER IF EXISTS update_vendor_transactions_updated_at ON public.vendor_transactions;

-- =====================================================
-- STEP 2: DROP TRIGGER FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS update_vendor_totals();

-- =====================================================
-- STEP 3: DROP INDEXES
-- =====================================================

DROP INDEX IF EXISTS public.idx_vendor_trans_vendor_id;
DROP INDEX IF EXISTS public.idx_vendor_trans_query_id;
DROP INDEX IF EXISTS public.idx_vendor_trans_service_id;
DROP INDEX IF EXISTS public.idx_vendor_trans_status;
DROP INDEX IF EXISTS public.idx_vendor_trans_date;
DROP INDEX IF EXISTS public.idx_vendor_trans_passenger_id;

-- =====================================================
-- STEP 4: DROP VENDOR_TRANSACTIONS TABLE
-- =====================================================

DROP TABLE IF EXISTS public.vendor_transactions CASCADE;

-- =====================================================
-- STEP 5: REMOVE NEW COLUMNS FROM VENDORS TABLE
-- =====================================================

-- Note: We keep is_active as it might be used elsewhere
-- Remove only the new columns added in this migration

ALTER TABLE public.vendors
  DROP COLUMN IF EXISTS whatsapp_number,
  DROP COLUMN IF EXISTS swift_code,
  DROP COLUMN IF EXISTS iban,
  DROP COLUMN IF EXISTS credit_days,
  DROP COLUMN IF EXISTS payment_method_preference,
  DROP COLUMN IF EXISTS is_deleted,
  DROP COLUMN IF EXISTS total_business,
  DROP COLUMN IF EXISTS total_paid,
  DROP COLUMN IF EXISTS total_pending,
  DROP COLUMN IF EXISTS total_profit;

-- Optionally remove is_active if it was added by this migration
-- Uncomment the line below if you want to remove it:
-- ALTER TABLE public.vendors DROP COLUMN IF EXISTS is_active;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify vendor_transactions table is gone
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'vendor_transactions'
) AS vendor_transactions_exists;

-- Verify trigger is gone
SELECT COUNT(*) AS trigger_count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trigger_update_vendor_totals';

-- Verify function is gone
SELECT COUNT(*) AS function_count
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_vendor_totals';

-- Verify vendors table columns
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vendors'
  AND column_name IN (
    'whatsapp_number',
    'swift_code',
    'iban',
    'credit_days',
    'payment_method_preference',
    'is_deleted',
    'total_business',
    'total_paid',
    'total_pending',
    'total_profit'
  );
-- (Should return no rows if rollback was successful)

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ROLLBACK COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Vendor_transactions table dropped';
  RAISE NOTICE '✓ Trigger removed';
  RAISE NOTICE '✓ Trigger function removed';
  RAISE NOTICE '✓ Indexes removed';
  RAISE NOTICE '✓ New vendor columns removed';
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  All vendor transaction data has been deleted';
  RAISE NOTICE '========================================';
END $$;
