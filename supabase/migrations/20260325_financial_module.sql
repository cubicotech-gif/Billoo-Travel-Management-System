-- =====================================================
-- Migration: Workstream 3 — Unified Financial Module
-- Date: 2026-03-25
-- Creates transactions table, alters invoices/invoice_items/activities
-- Safe to run multiple times (idempotent)
-- =====================================================

-- =============================================
-- 1. NEW TABLE: transactions (unified ledger)
-- =============================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_number TEXT UNIQUE,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),

  type TEXT NOT NULL CHECK (type IN (
    'payment_received',
    'payment_to_vendor',
    'refund_to_client',
    'refund_from_vendor',
    'expense',
    'adjustment'
  )),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),

  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'PKR' CHECK (currency IN ('PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'online', 'other')),
  reference_number TEXT,

  passenger_id UUID REFERENCES public.passengers(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,

  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  source_reference_id UUID,
  source_reference_type TEXT,

  description TEXT,
  receipt_url TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_passenger ON public.transactions(passenger_id);
CREATE INDEX IF NOT EXISTS idx_transactions_vendor ON public.transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON public.transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_direction ON public.transactions(direction);

-- RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage transactions" ON public.transactions;
CREATE POLICY "Authenticated users can manage transactions" ON public.transactions
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 2. TRANSACTION NUMBER GENERATOR
-- =============================================

CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  seq_num INTEGER;
BEGIN
  today_str := TO_CHAR(NEW.transaction_date, 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.transactions
  WHERE TO_CHAR(transaction_date, 'YYYYMMDD') = today_str;
  NEW.transaction_number := 'TXN-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_txn_number ON public.transactions;
CREATE TRIGGER trigger_generate_txn_number
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION generate_transaction_number();

-- Updated_at trigger for transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 3. ALTER invoices TABLE
-- =============================================

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_profit DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PKR';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS source_reference_id UUID;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS source_reference_type TEXT;

-- Update status check constraint to add more states
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'pending', 'partial', 'paid', 'overdue', 'cancelled'));

-- =============================================
-- 4. ALTER invoice_items TABLE
-- =============================================

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS selling_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS profit DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS vendor_payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS vendor_amount_paid DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add constraint for vendor_payment_status (safe — only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_vendor_payment_status_check'
  ) THEN
    ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_vendor_payment_status_check
      CHECK (vendor_payment_status IN ('unpaid', 'partially_paid', 'paid'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoice_items_vendor ON public.invoice_items(vendor_id);

-- =============================================
-- 5. UPDATE activities CONSTRAINTS
-- =============================================

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_action_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_action_check
  CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'email_sent', 'payment_received', 'payment_made', 'invoice_created', 'invoice_paid'));

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_entity_type_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_entity_type_check
  CHECK (entity_type IN ('query', 'passenger', 'vendor', 'invoice', 'payment', 'document', 'transaction'));

-- =============================================
-- 6. AUTO-UPDATE INVOICE ON TRANSACTION
-- =============================================

CREATE OR REPLACE FUNCTION update_invoice_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_paid DECIMAL(12,2);
  v_invoice_amount DECIMAL(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  IF v_invoice_id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.transactions
  WHERE invoice_id = v_invoice_id AND type = 'payment_received';

  SELECT amount INTO v_invoice_amount FROM public.invoices WHERE id = v_invoice_id;

  UPDATE public.invoices
  SET
    paid_amount = v_total_paid,
    status = CASE
      WHEN v_total_paid >= v_invoice_amount THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_on_transaction ON public.transactions;
CREATE TRIGGER trigger_update_invoice_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_invoice_on_transaction();
