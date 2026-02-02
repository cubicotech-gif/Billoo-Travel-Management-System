-- Integration: Vendor Management & Query Workflow Systems
-- This migration creates the necessary triggers and functions to sync data between the two systems

-- 1. Create function to sync service booking status when vendor payment is made
CREATE OR REPLACE FUNCTION sync_service_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When vendor payment status changes to PAID, update service booking status
  IF NEW.payment_status = 'PAID' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'PAID') THEN
    UPDATE query_services
    SET booking_status = 'payment_sent',
        updated_at = now()
    WHERE id = NEW.service_id;
  END IF;

  -- When vendor payment status changes to PARTIAL, update service booking status
  IF NEW.payment_status = 'PARTIAL' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'PARTIAL') THEN
    UPDATE query_services
    SET booking_status = 'payment_sent',
        updated_at = now()
    WHERE id = NEW.service_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger on vendor_transactions to sync with query_services
DROP TRIGGER IF EXISTS trigger_sync_booking_status ON vendor_transactions;
CREATE TRIGGER trigger_sync_booking_status
  AFTER UPDATE OF payment_status ON vendor_transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_service_booking_status();

-- 3. Create function to auto-update vendor ledger balances when transaction changes
CREATE OR REPLACE FUNCTION update_vendor_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate vendor's total balance
  UPDATE vendors
  SET updated_at = now()
  WHERE id = NEW.vendor_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to update vendor balance
DROP TRIGGER IF EXISTS trigger_update_vendor_balance ON vendor_transactions;
CREATE TRIGGER trigger_update_vendor_balance
  AFTER INSERT OR UPDATE OR DELETE ON vendor_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_balance();

-- 5. Add service_id to vendor_transactions if not exists (link to query service)
ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES query_services(id) ON DELETE SET NULL;

-- 6. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_service_id ON vendor_transactions(service_id);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_query_id ON vendor_transactions(query_id);
CREATE INDEX IF NOT EXISTS idx_query_services_vendor_id ON query_services(vendor_id);

-- 7. Add helpful comments
COMMENT ON COLUMN vendor_transactions.service_id IS 'Link to the specific service this transaction is for';
COMMENT ON TRIGGER trigger_sync_booking_status ON vendor_transactions IS 'Auto-sync service booking status when vendor payment is made';
COMMENT ON TRIGGER trigger_update_vendor_balance ON vendor_transactions IS 'Auto-update vendor balance when transactions change';
