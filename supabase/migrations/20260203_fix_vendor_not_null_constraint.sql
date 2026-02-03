-- Fix vendor column NOT NULL constraint issue
-- The old 'vendor' TEXT column has NOT NULL constraint but we're using vendor_id now
-- This migration removes the NOT NULL constraint to allow backward compatibility

-- Step 1: Remove NOT NULL constraint from vendor column (if it exists)
ALTER TABLE query_services
ALTER COLUMN vendor DROP NOT NULL;

-- Step 2: Set a default value for existing NULL vendors
UPDATE query_services
SET vendor = 'Unknown Vendor'
WHERE vendor IS NULL;

-- Step 3: Update vendor column from vendor_id for all records that have vendor_id
UPDATE query_services qs
SET vendor = v.name
FROM vendors v
WHERE qs.vendor_id = v.id
  AND (qs.vendor IS NULL OR qs.vendor = 'Unknown Vendor');

-- Add comment explaining the change
COMMENT ON COLUMN query_services.vendor IS 'DEPRECATED: Legacy vendor name field. Use vendor_id foreign key instead. Kept nullable for backward compatibility.';
