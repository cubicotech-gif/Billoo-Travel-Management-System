-- Create query_services table from scratch
-- This table stores all services added to a query (hotels, flights, transport, etc.)

-- First, check if the table exists, if not create it
CREATE TABLE IF NOT EXISTS query_services (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  query_id uuid NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,

  -- Service information
  service_type text NOT NULL,
  service_description text NOT NULL,
  service_date date,
  quantity integer DEFAULT 1 CHECK (quantity > 0),

  -- Pricing
  cost_price decimal(12,2) DEFAULT 0 CHECK (cost_price >= 0),
  selling_price decimal(12,2) DEFAULT 0 CHECK (selling_price >= 0),

  -- Legacy vendor field (for backward compatibility)
  vendor text,

  -- Service-specific details stored as JSON
  service_details jsonb DEFAULT '{}'::jsonb,

  -- Booking tracking
  booking_status text DEFAULT 'pending' CHECK (booking_status IN ('pending', 'payment_sent', 'confirmed', 'cancelled')),
  booked_date date,
  booking_confirmation text,
  voucher_url text,

  -- Delivery tracking
  delivery_status text DEFAULT 'not_started' CHECK (delivery_status IN ('not_started', 'in_progress', 'delivered', 'issue')),

  -- Additional fields
  pnr text,
  booking_reference text,
  notes text,

  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_query_services_query_id ON query_services(query_id);
CREATE INDEX IF NOT EXISTS idx_query_services_vendor_id ON query_services(vendor_id);
CREATE INDEX IF NOT EXISTS idx_query_services_service_type ON query_services(service_type);
CREATE INDEX IF NOT EXISTS idx_query_services_booking_status ON query_services(booking_status);
CREATE INDEX IF NOT EXISTS idx_query_services_delivery_status ON query_services(delivery_status);
CREATE INDEX IF NOT EXISTS idx_query_services_service_date ON query_services(service_date);
CREATE INDEX IF NOT EXISTS idx_query_services_created_at ON query_services(created_at DESC);

-- Create GIN index for JSONB service_details for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_query_services_service_details ON query_services USING gin(service_details);

-- Add comments for documentation
COMMENT ON TABLE query_services IS 'Services added to queries - hotels, flights, transport, activities, etc.';
COMMENT ON COLUMN query_services.query_id IS 'Foreign key to queries table';
COMMENT ON COLUMN query_services.vendor_id IS 'Foreign key to vendors table - which vendor provides this service';
COMMENT ON COLUMN query_services.service_type IS 'Type of service: Hotel, Flight, Transport, Visa, Activity, Guide, Insurance, Other';
COMMENT ON COLUMN query_services.service_description IS 'Description of the service';
COMMENT ON COLUMN query_services.service_date IS 'Date when service is provided';
COMMENT ON COLUMN query_services.quantity IS 'Quantity of this service (e.g., 2 rooms, 4 passengers)';
COMMENT ON COLUMN query_services.cost_price IS 'Cost price - what we pay to vendor (per unit)';
COMMENT ON COLUMN query_services.selling_price IS 'Selling price - what customer pays (per unit)';
COMMENT ON COLUMN query_services.vendor IS 'DEPRECATED: Legacy vendor name text field. Use vendor_id instead.';
COMMENT ON COLUMN query_services.service_details IS 'Service-specific details as JSON:
  - Hotel: {check_in, check_out, hotel_name, room_type, rooms, meal_plan, star_rating}
  - Flight: {departure_date, return_date, airline, flight_number, class, from_city, to_city, baggage}
  - Transport: {pickup_datetime, dropoff_datetime, pickup_location, dropoff_location, vehicle_type, driver_info}
  - Visa: {visa_type, nationality, processing_time, validity}
  - Activity: {activity_name, duration, location, includes}
  - Guide: {guide_name, languages, duration, meeting_point}
  - Insurance: {insurance_type, provider, coverage_amount, policy_number}';
COMMENT ON COLUMN query_services.booking_status IS 'Booking status: pending, payment_sent, confirmed, cancelled';
COMMENT ON COLUMN query_services.booked_date IS 'Date when service was booked with vendor';
COMMENT ON COLUMN query_services.booking_confirmation IS 'Vendor booking confirmation number';
COMMENT ON COLUMN query_services.voucher_url IS 'URL to booking voucher or confirmation document';
COMMENT ON COLUMN query_services.delivery_status IS 'Delivery status: not_started, in_progress, delivered, issue';
COMMENT ON COLUMN query_services.pnr IS 'PNR number (mainly for flights)';
COMMENT ON COLUMN query_services.booking_reference IS 'General booking reference';
COMMENT ON COLUMN query_services.notes IS 'Additional notes about this service';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_query_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_query_services_updated_at ON query_services;
CREATE TRIGGER trigger_update_query_services_updated_at
  BEFORE UPDATE ON query_services
  FOR EACH ROW
  EXECUTE FUNCTION update_query_services_updated_at();

-- Enable Row Level Security (if you want to restrict access)
ALTER TABLE query_services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth setup)
CREATE POLICY "Users can view all query_services"
  ON query_services FOR SELECT
  USING (true);

CREATE POLICY "Users can insert query_services"
  ON query_services FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update query_services"
  ON query_services FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete query_services"
  ON query_services FOR DELETE
  USING (true);

-- Create helper function to get service detail text
CREATE OR REPLACE FUNCTION get_service_detail_text(service_details jsonb, service_type text)
RETURNS text AS $$
BEGIN
  CASE service_type
    WHEN 'Hotel' THEN
      RETURN CONCAT(
        COALESCE(service_details->>'hotel_name', ''),
        CASE WHEN service_details->>'room_type' IS NOT NULL
          THEN ' - ' || service_details->>'room_type'
          ELSE '' END,
        CASE WHEN service_details->>'meal_plan' IS NOT NULL
          THEN ' (' || service_details->>'meal_plan' || ')'
          ELSE '' END
      );
    WHEN 'Flight' THEN
      RETURN CONCAT(
        COALESCE(service_details->>'airline', 'Flight'),
        CASE WHEN service_details->>'from_city' IS NOT NULL
          THEN ': ' || service_details->>'from_city'
          ELSE '' END,
        CASE WHEN service_details->>'to_city' IS NOT NULL
          THEN ' → ' || service_details->>'to_city'
          ELSE '' END
      );
    WHEN 'Transport' THEN
      RETURN CONCAT(
        COALESCE(service_details->>'vehicle_type', 'Transport'),
        CASE WHEN service_details->>'pickup_location' IS NOT NULL
          THEN ': ' || service_details->>'pickup_location'
          ELSE '' END
      );
    ELSE
      RETURN '';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_service_detail_text IS 'Helper function to extract readable text from service_details JSON';
