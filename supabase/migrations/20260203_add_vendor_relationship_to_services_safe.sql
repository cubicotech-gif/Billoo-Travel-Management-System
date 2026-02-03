-- Safe migration: Add vendor_id relationship to query_services
-- This version checks for existing columns before making changes

-- Step 1: Add vendor_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_services' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE query_services
    ADD COLUMN vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Safely rename 'type' to 'service_type' only if 'type' exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_services' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_services' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE query_services
    RENAME COLUMN type TO service_type;
  END IF;
END $$;

-- Step 3: Safely rename 'description' to 'service_description' only if 'description' exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_services' AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_services' AND column_name = 'service_description'
  ) THEN
    ALTER TABLE query_services
    RENAME COLUMN description TO service_description;
  END IF;
END $$;

-- Step 4: Try to match existing vendor text names to vendor IDs
UPDATE query_services qs
SET vendor_id = v.id
FROM vendors v
WHERE LOWER(TRIM(qs.vendor)) = LOWER(TRIM(v.name))
  AND qs.vendor_id IS NULL
  AND qs.vendor IS NOT NULL;

-- Step 5: Add quantity column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'query_services' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE query_services
    ADD COLUMN quantity integer DEFAULT 1 CHECK (quantity > 0);
  END IF;
END $$;

-- Step 6: Update existing records to have quantity = 1
UPDATE query_services
SET quantity = 1
WHERE quantity IS NULL;

-- Step 7: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_query_services_vendor_id ON query_services(vendor_id);
CREATE INDEX IF NOT EXISTS idx_query_services_quantity ON query_services(quantity);

-- Step 8: Add comments
COMMENT ON COLUMN query_services.vendor_id IS 'Foreign key to vendors table - links service to vendor';
COMMENT ON COLUMN query_services.quantity IS 'Quantity of this service (e.g., number of rooms, passengers, etc.)';
