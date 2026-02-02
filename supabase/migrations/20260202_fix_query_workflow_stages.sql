-- Fix Query Workflow Stages - Complete Database Migration
-- This migration adds all necessary fields for the 10-stage query workflow

-- 1. Remove old status constraint if it exists
ALTER TABLE queries
DROP CONSTRAINT IF EXISTS queries_status_check;

-- 2. Add new constraint with ALL 10 status values
ALTER TABLE queries
ADD CONSTRAINT queries_status_check
CHECK (status IN (
  'New Query - Not Responded',
  'Responded - Awaiting Reply',
  'Working on Proposal',
  'Proposal Sent',
  'Revisions Requested',
  'Finalized & Booking',
  'Services Booked',
  'In Delivery',
  'Completed',
  'Cancelled'
));

-- 3. Add stage tracking fields to queries table
ALTER TABLE queries
ADD COLUMN IF NOT EXISTS proposal_sent_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS finalized_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS customer_feedback text,
ADD COLUMN IF NOT EXISTS stage_notes jsonb DEFAULT '{}'::jsonb;

-- 4. Add booking fields to query_services table
ALTER TABLE query_services
ADD COLUMN IF NOT EXISTS booking_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS booked_date date,
ADD COLUMN IF NOT EXISTS booking_confirmation text,
ADD COLUMN IF NOT EXISTS voucher_url text,
ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'not_started';

-- 5. Add constraints for booking_status and delivery_status
ALTER TABLE query_services
DROP CONSTRAINT IF EXISTS query_services_booking_status_check;

ALTER TABLE query_services
ADD CONSTRAINT query_services_booking_status_check
CHECK (booking_status IN ('pending', 'payment_sent', 'confirmed', 'cancelled'));

ALTER TABLE query_services
DROP CONSTRAINT IF EXISTS query_services_delivery_status_check;

ALTER TABLE query_services
ADD CONSTRAINT query_services_delivery_status_check
CHECK (delivery_status IN ('not_started', 'in_progress', 'delivered', 'issue'));

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_proposal_sent_date ON queries(proposal_sent_date);
CREATE INDEX IF NOT EXISTS idx_queries_completed_date ON queries(completed_date);
CREATE INDEX IF NOT EXISTS idx_services_booking_status ON query_services(booking_status);
CREATE INDEX IF NOT EXISTS idx_services_delivery_status ON query_services(delivery_status);

-- 7. Update existing queries to valid status if needed
UPDATE queries
SET status = 'New Query - Not Responded'
WHERE status NOT IN (
  'New Query - Not Responded',
  'Responded - Awaiting Reply',
  'Working on Proposal',
  'Proposal Sent',
  'Revisions Requested',
  'Finalized & Booking',
  'Services Booked',
  'In Delivery',
  'Completed',
  'Cancelled'
);

-- 8. Update timestamp for queries table if not exists
ALTER TABLE queries
ALTER COLUMN updated_at SET DEFAULT now();

COMMENT ON COLUMN queries.proposal_sent_date IS 'Timestamp when proposal was sent to customer';
COMMENT ON COLUMN queries.finalized_date IS 'Timestamp when customer finalized/accepted proposal';
COMMENT ON COLUMN queries.completed_date IS 'Timestamp when query was marked as completed';
COMMENT ON COLUMN queries.customer_feedback IS 'Customer feedback on proposals';
COMMENT ON COLUMN queries.stage_notes IS 'JSON object containing notes for each stage';

COMMENT ON COLUMN query_services.booking_status IS 'Booking status: pending, payment_sent, confirmed, cancelled';
COMMENT ON COLUMN query_services.booked_date IS 'Date when service was booked';
COMMENT ON COLUMN query_services.booking_confirmation IS 'Vendor booking confirmation number';
COMMENT ON COLUMN query_services.voucher_url IS 'URL to uploaded booking voucher/document';
COMMENT ON COLUMN query_services.delivery_status IS 'Delivery status: not_started, in_progress, delivered, issue';
