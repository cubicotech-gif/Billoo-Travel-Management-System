-- Add vendor_id foreign key relationship to query_services table
-- This enables proper joins between query_services and vendors tables

-- Step 1: Add vendor_id column (nullable initially for migration)
ALTER TABLE query_services
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL;

-- Step 2: Rename old columns to avoid conflicts
-- Rename 'type' to 'service_type' to match our TypeScript interface
ALTER TABLE query_services
RENAME COLUMN type TO service_type;

-- Rename 'description' to 'service_description' to match our TypeScript interface
ALTER TABLE query_services
RENAME COLUMN description TO service_description;

-- Step 3: Try to match existing vendor text names to vendor IDs
-- This is a best-effort migration - it will only work if vendor names match exactly
UPDATE query_services qs
SET vendor_id = v.id
FROM vendors v
WHERE LOWER(TRIM(qs.vendor)) = LOWER(TRIM(v.name))
  AND qs.vendor_id IS NULL;

-- Step 4: For any remaining unmatched services, try to create a default vendor or leave null
-- We'll leave vendor_id as NULL for now - users can manually assign vendors

-- Step 5: Add index for better performance on joins
CREATE INDEX IF NOT EXISTS idx_query_services_vendor_id ON query_services(vendor_id);

-- Step 6: Update column comments for documentation
COMMENT ON COLUMN query_services.vendor_id IS 'Foreign key to vendors table - replaces vendor text field';
COMMENT ON COLUMN query_services.vendor IS 'DEPRECATED: Use vendor_id instead. Kept for backward compatibility.';

-- Step 7: Add quantity column if it doesn't exist (needed for our integration)
ALTER TABLE query_services
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1 CHECK (quantity > 0);

-- Step 8: Update existing records to have quantity = 1
UPDATE query_services
SET quantity = 1
WHERE quantity IS NULL;

-- Step 9: Add index for quantity
CREATE INDEX IF NOT EXISTS idx_query_services_quantity ON query_services(quantity);

-- Note: We're NOT dropping the old 'vendor' text column for backward compatibility
-- In a future migration, after verifying all data is migrated, you can:
-- ALTER TABLE query_services DROP COLUMN vendor;
