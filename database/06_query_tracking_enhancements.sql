-- Migration: Add Query Tracking Enhancements
-- Description: Adds query source, service type, tentative plan, response tracking, and internal notes

-- Add new columns to queries table
ALTER TABLE queries
ADD COLUMN IF NOT EXISTS query_source TEXT,
ADD COLUMN IF NOT EXISTS service_type TEXT,
ADD COLUMN IF NOT EXISTS tentative_plan TEXT,
ADD COLUMN IF NOT EXISTS internal_reminders TEXT,
ADD COLUMN IF NOT EXISTS is_responded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_given TEXT,
ADD COLUMN IF NOT EXISTS is_tentative_dates BOOLEAN DEFAULT false;

-- Add check constraints for valid values
ALTER TABLE queries
DROP CONSTRAINT IF EXISTS queries_query_source_check;

ALTER TABLE queries
ADD CONSTRAINT queries_query_source_check
CHECK (query_source IN ('Phone Call', 'WhatsApp', 'Walk-in', 'Website', 'Email', 'Referral') OR query_source IS NULL);

ALTER TABLE queries
DROP CONSTRAINT IF EXISTS queries_service_type_check;

ALTER TABLE queries
ADD CONSTRAINT queries_service_type_check
CHECK (service_type IN (
  'Umrah Package',
  'Umrah Plus Package',
  'Hajj Package',
  'Leisure Tourism',
  'Ticket Booking',
  'Visa Service',
  'Transport Service',
  'Hotel Only',
  'Other'
) OR service_type IS NULL);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_queries_is_responded ON queries(is_responded);
CREATE INDEX IF NOT EXISTS idx_queries_query_source ON queries(query_source);
CREATE INDEX IF NOT EXISTS idx_queries_service_type ON queries(service_type);

-- Add comments
COMMENT ON COLUMN queries.query_source IS 'How the query was received: Phone Call, WhatsApp, Walk-in, Website, Email, Referral';
COMMENT ON COLUMN queries.service_type IS 'Type of service requested: Umrah Package, Hajj Package, Leisure Tourism, etc.';
COMMENT ON COLUMN queries.tentative_plan IS 'Customer message or query details pasted from WhatsApp/other sources';
COMMENT ON COLUMN queries.internal_reminders IS 'Team-only internal notes, budget constraints, follow-up dates';
COMMENT ON COLUMN queries.is_responded IS 'Whether the team has responded to this query';
COMMENT ON COLUMN queries.response_given IS 'What was communicated to the customer';
COMMENT ON COLUMN queries.is_tentative_dates IS 'Whether travel dates are tentative/not confirmed yet';
