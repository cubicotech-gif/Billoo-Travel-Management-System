-- Query-Passenger Junction Table
-- This establishes a many-to-many relationship between queries and passengers
-- Run this in your Supabase SQL Editor

-- Create query_passengers junction table
CREATE TABLE IF NOT EXISTS query_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Mark the main/lead passenger
  passenger_type VARCHAR(20) DEFAULT 'adult' CHECK (passenger_type IN ('adult', 'child', 'infant')),
  seat_preference VARCHAR(50), -- Window, Aisle, etc.
  meal_preference VARCHAR(50), -- Vegetarian, Non-veg, Halal, etc.
  special_requirements TEXT, -- Wheelchair, Medical conditions, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Ensure unique combination of query and passenger
  UNIQUE(query_id, passenger_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_query_passengers_query ON query_passengers(query_id);
CREATE INDEX IF NOT EXISTS idx_query_passengers_passenger ON query_passengers(passenger_id);
CREATE INDEX IF NOT EXISTS idx_query_passengers_primary ON query_passengers(is_primary);

-- Add RLS (Row Level Security) policies
ALTER TABLE query_passengers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view query_passengers
CREATE POLICY "Authenticated users can view query_passengers"
ON query_passengers FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert query_passengers
CREATE POLICY "Authenticated users can insert query_passengers"
ON query_passengers FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update query_passengers
CREATE POLICY "Authenticated users can update query_passengers"
ON query_passengers FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete query_passengers
CREATE POLICY "Authenticated users can delete query_passengers"
ON query_passengers FOR DELETE
TO authenticated
USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_query_passengers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_query_passengers_updated_at
BEFORE UPDATE ON query_passengers
FOR EACH ROW
EXECUTE FUNCTION update_query_passengers_updated_at();

-- Add helpful comment
COMMENT ON TABLE query_passengers IS 'Junction table linking queries to passengers. Allows multiple passengers per booking/query and tracks passenger-specific details like seat preferences and special requirements.';

-- Create helpful view for query passengers with full details
CREATE OR REPLACE VIEW query_passengers_detailed AS
SELECT
  qp.id,
  qp.query_id,
  qp.passenger_id,
  qp.is_primary,
  qp.passenger_type,
  qp.seat_preference,
  qp.meal_preference,
  qp.special_requirements,
  qp.created_at,
  qp.updated_at,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.passport_number,
  p.passport_expiry,
  p.date_of_birth,
  p.nationality,
  q.query_number,
  q.destination,
  q.travel_date,
  q.return_date,
  q.status
FROM query_passengers qp
JOIN passengers p ON qp.passenger_id = p.id
JOIN queries q ON qp.query_id = q.id;

COMMENT ON VIEW query_passengers_detailed IS 'Convenient view showing query-passenger relationships with full passenger and query details.';
