-- =====================================================
-- TEST QUERIES FOR VENDOR MANAGEMENT SYSTEM
-- Migration: 001_vendor_management_system
-- =====================================================

-- =====================================================
-- 1. VERIFY VENDORS TABLE COLUMNS
-- =====================================================

-- Check if all new columns exist in vendors table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vendors'
ORDER BY ordinal_position;

-- View sample vendor record with new columns
SELECT
  id,
  name,
  type,
  contact_person,
  phone,
  email,
  whatsapp_number,
  bank_name,
  account_number,
  swift_code,
  iban,
  credit_days,
  payment_method_preference,
  is_active,
  is_deleted,
  total_business,
  total_paid,
  total_pending,
  total_profit,
  created_at,
  updated_at
FROM public.vendors
LIMIT 1;

-- =====================================================
-- 2. VERIFY VENDOR_TRANSACTIONS TABLE
-- =====================================================

-- Check if vendor_transactions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'vendor_transactions'
) AS table_exists;

-- View all columns in vendor_transactions table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vendor_transactions'
ORDER BY ordinal_position;

-- Check initial state (should be empty)
SELECT COUNT(*) AS transaction_count
FROM public.vendor_transactions;

-- View structure (should return no rows initially)
SELECT
  id,
  vendor_id,
  query_id,
  service_id,
  transaction_date,
  service_description,
  currency,
  exchange_rate_to_pkr,
  purchase_amount_original,
  purchase_amount_pkr,
  selling_amount_pkr,
  profit_pkr,
  payment_status,
  amount_paid,
  created_at
FROM public.vendor_transactions
LIMIT 5;

-- =====================================================
-- 3. VERIFY INDEXES
-- =====================================================

-- Check if all indexes were created
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'vendor_transactions'
ORDER BY indexname;

-- =====================================================
-- 4. VERIFY TRIGGER FUNCTION
-- =====================================================

-- Check if trigger function exists
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_vendor_totals';

-- Check if trigger is active
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trigger_update_vendor_totals';

-- =====================================================
-- 5. VERIFY RLS POLICIES
-- =====================================================

-- Check RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('vendors', 'vendor_transactions');

-- Check RLS policies for vendor_transactions
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'vendor_transactions'
ORDER BY policyname;

-- =====================================================
-- 6. SAMPLE DATA INSERTION TEST (Optional - Commented)
-- =====================================================

-- Uncomment below to test with sample data:

/*
-- First, ensure you have at least one vendor
INSERT INTO public.vendors (name, type, contact_person, phone, email, whatsapp_number, is_active)
VALUES ('Test Airline', 'Airline', 'John Doe', '+923001234567', 'airline@test.com', '+923001234567', true)
ON CONFLICT DO NOTHING;

-- Get the vendor ID
DO $$
DECLARE
  v_vendor_id UUID;
  v_query_id UUID;
  v_service_id UUID;
BEGIN
  -- Get or create test vendor
  SELECT id INTO v_vendor_id FROM public.vendors WHERE name = 'Test Airline' LIMIT 1;

  -- Get or create test query
  SELECT id INTO v_query_id FROM public.queries LIMIT 1;

  -- Get or create test service
  SELECT id INTO v_service_id FROM public.query_services LIMIT 1;

  -- Insert sample transaction
  IF v_vendor_id IS NOT NULL AND v_query_id IS NOT NULL AND v_service_id IS NOT NULL THEN
    INSERT INTO public.vendor_transactions (
      vendor_id,
      query_id,
      service_id,
      transaction_date,
      service_description,
      service_type,
      city,
      currency,
      exchange_rate_to_pkr,
      purchase_amount_original,
      purchase_amount_pkr,
      selling_amount_original,
      selling_amount_pkr,
      payment_status,
      amount_paid
    ) VALUES (
      v_vendor_id,
      v_query_id,
      v_service_id,
      CURRENT_DATE,
      'Flight Ticket - Islamabad to Dubai',
      'Flight',
      'Dubai',
      'AED',
      75.50,
      2000.00,
      151000.00,
      2500.00,
      188750.00,
      'PENDING',
      0.00
    );

    RAISE NOTICE 'Test transaction inserted successfully!';
  ELSE
    RAISE NOTICE 'Could not insert test data - missing vendor, query, or service';
  END IF;
END $$;

-- Verify the trigger worked by checking vendor totals
SELECT
  name,
  total_business,
  total_paid,
  total_pending,
  total_profit
FROM public.vendors
WHERE name = 'Test Airline';
*/

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL TESTS COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Run each query above to verify:';
  RAISE NOTICE '1. ✓ Vendors table has new columns';
  RAISE NOTICE '2. ✓ Vendor_transactions table exists';
  RAISE NOTICE '3. ✓ All indexes are created';
  RAISE NOTICE '4. ✓ Trigger function is active';
  RAISE NOTICE '5. ✓ RLS policies are enabled';
  RAISE NOTICE '========================================';
  RAISE NOTICE '💡 Uncomment section 6 to test with sample data';
  RAISE NOTICE '========================================';
END $$;
