-- =====================================================
-- VENDOR MANAGEMENT & ACCOUNTING SYSTEM - PHASE 1
-- Migration: 001_vendor_management_system
-- Description: Database structure for vendor transactions and accounting
-- Date: 2026-01-28
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: UPDATE VENDORS TABLE
-- =====================================================

-- Add new columns to vendors table
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS swift_code TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method_preference TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS total_business DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pending DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_profit DECIMAL(12, 2) DEFAULT 0;

-- =====================================================
-- STEP 2: CREATE VENDOR_TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendor_transactions (
  -- Primary Key
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Foreign Keys
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.query_services(id) ON DELETE RESTRICT,
  passenger_id UUID REFERENCES public.passengers(id) ON DELETE SET NULL,

  -- Transaction Details
  transaction_date DATE DEFAULT CURRENT_DATE NOT NULL,
  service_description TEXT NOT NULL,
  service_type TEXT NOT NULL,
  city TEXT,

  -- Currency & Amounts
  currency TEXT DEFAULT 'PKR' NOT NULL CHECK (currency IN ('PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP')),
  exchange_rate_to_pkr DECIMAL(10, 4) DEFAULT 1.0 NOT NULL,
  purchase_amount_original DECIMAL(12, 2) NOT NULL CHECK (purchase_amount_original >= 0),
  purchase_amount_pkr DECIMAL(12, 2) NOT NULL CHECK (purchase_amount_pkr >= 0),
  selling_amount_original DECIMAL(12, 2) NOT NULL CHECK (selling_amount_original >= 0),
  selling_amount_pkr DECIMAL(12, 2) NOT NULL CHECK (selling_amount_pkr >= 0),
  profit_pkr DECIMAL(12, 2) GENERATED ALWAYS AS (selling_amount_pkr - purchase_amount_pkr) STORED,

  -- Payment Tracking
  payment_status TEXT DEFAULT 'PENDING' NOT NULL CHECK (payment_status IN ('PENDING', 'PAID', 'PARTIAL', 'OVERPAID')),
  amount_paid DECIMAL(12, 2) DEFAULT 0 CHECK (amount_paid >= 0),
  payment_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  payment_notes TEXT,
  receipt_url TEXT,

  -- Other
  booking_reference TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Vendor transactions indexes
CREATE INDEX IF NOT EXISTS idx_vendor_trans_vendor_id ON public.vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_query_id ON public.vendor_transactions(query_id);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_service_id ON public.vendor_transactions(service_id);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_status ON public.vendor_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_date ON public.vendor_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_passenger_id ON public.vendor_transactions(passenger_id);

-- =====================================================
-- STEP 4: CREATE TRIGGER FUNCTION TO AUTO-UPDATE VENDOR TOTALS
-- =====================================================

-- Function to update vendor totals
CREATE OR REPLACE FUNCTION update_vendor_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_id UUID;
BEGIN
  -- Determine which vendor_id to update
  IF TG_OP = 'DELETE' THEN
    v_vendor_id := OLD.vendor_id;
  ELSE
    v_vendor_id := NEW.vendor_id;
  END IF;

  -- Update vendor totals
  UPDATE public.vendors
  SET
    total_business = COALESCE((
      SELECT SUM(purchase_amount_pkr)
      FROM public.vendor_transactions
      WHERE vendor_id = v_vendor_id
    ), 0),

    total_paid = COALESCE((
      SELECT SUM(amount_paid)
      FROM public.vendor_transactions
      WHERE vendor_id = v_vendor_id
    ), 0),

    total_pending = COALESCE((
      SELECT SUM(purchase_amount_pkr - amount_paid)
      FROM public.vendor_transactions
      WHERE vendor_id = v_vendor_id
        AND payment_status != 'PAID'
    ), 0),

    total_profit = COALESCE((
      SELECT SUM(profit_pkr)
      FROM public.vendor_transactions
      WHERE vendor_id = v_vendor_id
    ), 0),

    updated_at = NOW()
  WHERE id = v_vendor_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: CREATE TRIGGER
-- =====================================================

-- Drop trigger if exists (to allow re-running migration)
DROP TRIGGER IF EXISTS trigger_update_vendor_totals ON public.vendor_transactions;

-- Create trigger
CREATE TRIGGER trigger_update_vendor_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.vendor_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_totals();

-- =====================================================
-- STEP 6: CREATE UPDATED_AT TRIGGER FOR VENDOR_TRANSACTIONS
-- =====================================================

DROP TRIGGER IF EXISTS update_vendor_transactions_updated_at ON public.vendor_transactions;

CREATE TRIGGER update_vendor_transactions_updated_at
  BEFORE UPDATE ON public.vendor_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 7: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on vendor_transactions table
ALTER TABLE public.vendor_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_transactions
DROP POLICY IF EXISTS "All authenticated users can view vendor transactions" ON public.vendor_transactions;
CREATE POLICY "All authenticated users can view vendor transactions" ON public.vendor_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert vendor transactions" ON public.vendor_transactions;
CREATE POLICY "All authenticated users can insert vendor transactions" ON public.vendor_transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update vendor transactions" ON public.vendor_transactions;
CREATE POLICY "All authenticated users can update vendor transactions" ON public.vendor_transactions
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can delete vendor transactions" ON public.vendor_transactions;
CREATE POLICY "All authenticated users can delete vendor transactions" ON public.vendor_transactions
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VENDOR MANAGEMENT SYSTEM - PHASE 1';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Vendors table updated with new columns';
  RAISE NOTICE '✓ Vendor_transactions table created';
  RAISE NOTICE '✓ Performance indexes created';
  RAISE NOTICE '✓ Auto-update trigger configured';
  RAISE NOTICE '✓ Row Level Security enabled';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Ready for vendor transaction management!';
  RAISE NOTICE '========================================';
END $$;
