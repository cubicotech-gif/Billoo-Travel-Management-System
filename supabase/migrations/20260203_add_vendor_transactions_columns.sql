-- Add missing columns to vendor_transactions table for query workflow integration
-- Fixes: "Could not find the 'transaction_type' column" error

-- Add transaction_type column
ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'SERVICE_BOOKING'
CHECK (transaction_type IN ('SERVICE_BOOKING', 'PAYMENT', 'REFUND', 'ADJUSTMENT'));

-- Add service_id foreign key (links to query_services)
ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES query_services(id) ON DELETE SET NULL;

-- Add query_id foreign key (links to queries)
ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS query_id uuid REFERENCES queries(id) ON DELETE CASCADE;

-- Add service_description for easy reference
ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS service_description text;

-- Add purchase amounts with currency support
ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS purchase_amount_original decimal(12,2);

ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS purchase_amount_pkr decimal(12,2);

ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'PKR';

-- Add payment tracking fields
ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS amount_paid decimal(12,2) DEFAULT 0;

ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'PENDING'
CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED'));

-- Add payment details
ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone;

ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS payment_reference text;

ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS receipt_url text;

-- Add transaction_date if not exists
ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS transaction_date timestamp with time zone DEFAULT now();

-- Add notes field
ALTER TABLE vendor_transactions
ADD COLUMN IF NOT EXISTS notes text;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_service_id ON vendor_transactions(service_id);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_query_id ON vendor_transactions(query_id);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_payment_status ON vendor_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_transaction_type ON vendor_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_transaction_date ON vendor_transactions(transaction_date DESC);

-- Add comments for documentation
COMMENT ON COLUMN vendor_transactions.transaction_type IS 'Type of transaction: SERVICE_BOOKING, PAYMENT, REFUND, or ADJUSTMENT';
COMMENT ON COLUMN vendor_transactions.service_id IS 'Foreign key to query_services - links transaction to a specific service';
COMMENT ON COLUMN vendor_transactions.query_id IS 'Foreign key to queries - links transaction to a query';
COMMENT ON COLUMN vendor_transactions.service_description IS 'Description of the service for easy reference';
COMMENT ON COLUMN vendor_transactions.purchase_amount_original IS 'Purchase amount in original currency';
COMMENT ON COLUMN vendor_transactions.purchase_amount_pkr IS 'Purchase amount converted to PKR';
COMMENT ON COLUMN vendor_transactions.currency IS 'Currency code (PKR, USD, SAR, AED, etc.)';
COMMENT ON COLUMN vendor_transactions.amount_paid IS 'Total amount paid so far';
COMMENT ON COLUMN vendor_transactions.payment_status IS 'Payment status: PENDING, PARTIAL, PAID, or REFUNDED';
COMMENT ON COLUMN vendor_transactions.payment_date IS 'Date when payment was made';
COMMENT ON COLUMN vendor_transactions.payment_method IS 'Method of payment (Cash, Bank Transfer, Card, Cheque, etc.)';
COMMENT ON COLUMN vendor_transactions.payment_reference IS 'Payment reference or transaction ID';
COMMENT ON COLUMN vendor_transactions.receipt_url IS 'URL to payment receipt or proof of payment';
