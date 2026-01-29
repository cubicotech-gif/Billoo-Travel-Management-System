-- Migration: Update queries status constraint to allow workflow stage values
-- Description: Updates the CHECK constraint on queries.status to allow all workflow stage values

-- First, check current constraint (for reference)
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'queries'::regclass
-- AND conname LIKE '%status%';

-- Remove old status constraint if it exists
ALTER TABLE queries
DROP CONSTRAINT IF EXISTS queries_status_check;

-- Add new constraint with ALL workflow status values
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

-- Set default status for new queries
ALTER TABLE queries
ALTER COLUMN status SET DEFAULT 'New Query - Not Responded';

-- Update any existing queries with old status values to new values
-- Note: Run these one at a time and check if any rows are affected

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
) AND status ILIKE '%new%';

UPDATE queries
SET status = 'Working on Proposal'
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
) AND status ILIKE '%working%';

UPDATE queries
SET status = 'Proposal Sent'
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
) AND status ILIKE '%proposal%';

UPDATE queries
SET status = 'Completed'
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
) AND status ILIKE '%complet%';

-- Verify constraint is updated
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'queries'::regclass
AND conname = 'queries_status_check';

-- Check if any queries still have invalid status values
SELECT id, query_number, status
FROM queries
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

-- If the above query returns any rows, manually update them:
-- UPDATE queries SET status = 'New Query - Not Responded' WHERE id = 'xxx';
