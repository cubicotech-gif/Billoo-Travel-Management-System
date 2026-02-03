-- Fix Vendors Table Schema - Add Missing Columns
-- Fixes: "Could not find the 'default_currency' column" error

-- Add missing columns for vendor management
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'PKR',
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS swift_code text,
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS credit_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method_preference text,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS total_business decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_paid decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pending decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_profit decimal(12,2) DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_is_deleted ON vendors(is_deleted);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(type);
CREATE INDEX IF NOT EXISTS idx_vendors_default_currency ON vendors(default_currency);

-- Add comments for documentation
COMMENT ON COLUMN vendors.default_currency IS 'Default currency for this vendor (PKR, USD, SAR, AED, etc.)';
COMMENT ON COLUMN vendors.whatsapp_number IS 'WhatsApp contact number for vendor';
COMMENT ON COLUMN vendors.credit_days IS 'Number of credit days allowed by vendor';
COMMENT ON COLUMN vendors.payment_method_preference IS 'Preferred payment method (Cash, Bank Transfer, etc.)';
COMMENT ON COLUMN vendors.is_deleted IS 'Soft delete flag - true if vendor is deleted';
COMMENT ON COLUMN vendors.is_active IS 'Whether vendor is currently active for new bookings';
COMMENT ON COLUMN vendors.total_business IS 'Total business value with this vendor';
COMMENT ON COLUMN vendors.total_paid IS 'Total amount paid to this vendor';
COMMENT ON COLUMN vendors.total_pending IS 'Total pending amount to this vendor';
COMMENT ON COLUMN vendors.total_profit IS 'Total profit earned from this vendor';

-- Update existing vendors to be active if not set
UPDATE vendors
SET is_active = true, is_deleted = false
WHERE is_active IS NULL OR is_deleted IS NULL;
