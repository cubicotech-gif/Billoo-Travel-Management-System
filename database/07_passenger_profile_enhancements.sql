-- Migration: Passenger Profile System Enhancement
-- Description: Adds comprehensive passenger identity, contact, financial tracking fields

-- Add identity fields
ALTER TABLE passengers
ADD COLUMN IF NOT EXISTS cnic TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add contact fields
ALTER TABLE passengers
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Add status & tracking fields
ALTER TABLE passengers
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(10,2) DEFAULT 0;

-- Update nationality default if not already set
ALTER TABLE passengers
ALTER COLUMN nationality SET DEFAULT 'Pakistani';

-- Create indexes for filtering and searching
CREATE INDEX IF NOT EXISTS idx_passengers_is_vip ON passengers(is_vip);
CREATE INDEX IF NOT EXISTS idx_passengers_is_active ON passengers(is_active);
CREATE INDEX IF NOT EXISTS idx_passengers_cnic ON passengers(cnic);
CREATE INDEX IF NOT EXISTS idx_passengers_outstanding_balance ON passengers(outstanding_balance);

-- Add check constraint for CNIC format (optional, can be enforced in application)
ALTER TABLE passengers
DROP CONSTRAINT IF EXISTS passengers_cnic_format_check;

-- Add comments
COMMENT ON COLUMN passengers.cnic IS 'Pakistani CNIC number (format: 42101-1234567-8)';
COMMENT ON COLUMN passengers.whatsapp_number IS 'WhatsApp contact number (may differ from primary phone)';
COMMENT ON COLUMN passengers.alternate_phone IS 'Alternative phone number';
COMMENT ON COLUMN passengers.address IS 'Full residential address';
COMMENT ON COLUMN passengers.emergency_contact_name IS 'Emergency contact person name';
COMMENT ON COLUMN passengers.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN passengers.is_vip IS 'VIP/priority customer flag';
COMMENT ON COLUMN passengers.is_active IS 'Active/Inactive customer status';
COMMENT ON COLUMN passengers.total_trips IS 'Total number of completed trips';
COMMENT ON COLUMN passengers.total_revenue IS 'Total revenue generated from this passenger';
COMMENT ON COLUMN passengers.outstanding_balance IS 'Pending payment amount';
