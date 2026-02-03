-- Add service_details JSONB column for service-type-specific fields
-- Allows storing different data for Hotels, Flights, Transport, etc.

-- Add service_details column
ALTER TABLE query_services
ADD COLUMN IF NOT EXISTS service_details jsonb DEFAULT '{}'::jsonb;

-- Add index for better performance on JSON queries
CREATE INDEX IF NOT EXISTS idx_query_services_details ON query_services USING gin(service_details);

-- Add comment for documentation
COMMENT ON COLUMN query_services.service_details IS 'Service-specific details stored as JSON
- Hotel: {check_in, check_out, hotel_name, room_type, rooms, meal_plan, star_rating}
- Flight: {departure_date, return_date, airline, flight_number, class, from_city, to_city, baggage}
- Transport: {pickup_datetime, dropoff_datetime, pickup_location, dropoff_location, vehicle_type, driver_info}
- Visa: {visa_type, nationality, processing_time, validity}
- Activity: {activity_name, duration, location, includes}
- Guide: {guide_name, languages, duration, meeting_point}
- Insurance: {insurance_type, coverage_amount, provider, policy_number}';

-- Add helper function to extract service details for display
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
