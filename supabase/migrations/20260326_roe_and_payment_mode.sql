-- =====================================================
-- Migration: ROE (Rate of Exchange) columns + payment_mode + passenger credit
-- Date: 2026-03-26
-- Safe to run multiple times (idempotent)
-- =====================================================

-- =============================================
-- 1. ALTER transactions — ROE columns
-- =============================================

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12, 2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'PKR' CHECK (original_currency IN ('PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP'));
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4);

-- =============================================
-- 2. ALTER transactions — payment_mode for vendor collective payments
-- =============================================

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'specific' CHECK (payment_mode IN ('collective', 'specific'));

-- =============================================
-- 3. ALTER invoice_items — ROE columns
-- =============================================

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'PKR';
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4);
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS purchase_price_original DECIMAL(12, 2);
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS selling_price_original DECIMAL(12, 2);

-- =============================================
-- 4. ALTER invoices — ROE reference
-- =============================================

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'PKR';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12, 2);

-- =============================================
-- 5. ALTER passengers — credit balance
-- =============================================

ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(12, 2) DEFAULT 0;
