-- Diagnostic query: Check existing columns in query_services table
-- Run this to see what columns currently exist

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'query_services'
ORDER BY ordinal_position;

-- Check if specific columns exist
SELECT
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_services' AND column_name = 'type') as has_type_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_services' AND column_name = 'service_type') as has_service_type_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_services' AND column_name = 'description') as has_description_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_services' AND column_name = 'service_description') as has_service_description_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_services' AND column_name = 'vendor') as has_vendor_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_services' AND column_name = 'vendor_id') as has_vendor_id_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_services' AND column_name = 'quantity') as has_quantity_column,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'query_services' AND column_name = 'service_details') as has_service_details_column;
