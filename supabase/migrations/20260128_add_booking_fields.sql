-- Migration: Add booking fields to query_services table
-- Description: Adds booking status, confirmation, and voucher fields to support Query Phase B

-- Add booking fields to query_services table
ALTER TABLE query_services
ADD COLUMN IF NOT EXISTS booking_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS booked_date timestamptz,
ADD COLUMN IF NOT EXISTS booking_confirmation text,
ADD COLUMN IF NOT EXISTS voucher_url text,
ADD COLUMN IF NOT EXISTS booking_notes text,
ADD COLUMN IF NOT EXISTS payment_skipped boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS skip_payment_reason text;

-- Add index for faster booking status queries
CREATE INDEX IF NOT EXISTS idx_services_booking_status
ON query_services(booking_status);

CREATE INDEX IF NOT EXISTS idx_services_query_booking
ON query_services(query_id, booking_status);

-- Create booking_vouchers storage bucket (if not exists)
-- Run this in Supabase dashboard SQL editor or via storage API:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('booking-vouchers', 'booking-vouchers', true)
-- ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for booking vouchers
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload booking vouchers
-- CREATE POLICY "Users can upload booking vouchers"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'booking-vouchers');

-- Allow authenticated users to view booking vouchers
-- CREATE POLICY "Users can view booking vouchers"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'booking-vouchers');

-- Allow authenticated users to delete their booking vouchers
-- CREATE POLICY "Users can delete booking vouchers"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'booking-vouchers');

-- Add comments for documentation
COMMENT ON COLUMN query_services.booking_status IS 'Booking status: pending, payment_sent, confirmed, cancelled';
COMMENT ON COLUMN query_services.booked_date IS 'Date when booking was confirmed';
COMMENT ON COLUMN query_services.booking_confirmation IS 'Booking confirmation number (PNR, reference, etc.)';
COMMENT ON COLUMN query_services.voucher_url IS 'URL to booking voucher/confirmation document';
COMMENT ON COLUMN query_services.booking_notes IS 'Additional notes about the booking';
COMMENT ON COLUMN query_services.payment_skipped IS 'True if vendor payment was skipped';
COMMENT ON COLUMN query_services.skip_payment_reason IS 'Reason for skipping payment';
