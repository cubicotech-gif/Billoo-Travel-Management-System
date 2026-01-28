-- Query Proposals Table
-- Tracks all proposal versions sent to customers with complete audit trail

CREATE TABLE IF NOT EXISTS query_proposals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id uuid REFERENCES queries(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL,
  proposal_text text NOT NULL,

  -- Snapshot of services at proposal time (prevents data loss if services change)
  services_snapshot jsonb NOT NULL,

  -- Pricing details
  total_amount decimal(12,2) NOT NULL,
  cost_amount decimal(12,2), -- Our total cost
  profit_amount decimal(12,2), -- Our profit
  profit_percentage decimal(5,2), -- Profit %

  -- Delivery details
  sent_date timestamp with time zone NOT NULL DEFAULT now(),
  sent_via text[] DEFAULT '{}', -- ['whatsapp', 'email', 'sms']
  validity_days integer DEFAULT 7,
  valid_until date,

  -- Status tracking
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'rejected', 'revised', 'expired')),

  -- Customer response
  customer_response text,
  customer_feedback text,
  response_date timestamp with time zone,

  -- Metadata
  created_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Ensure version numbers are unique per query
  UNIQUE(query_id, version_number)
);

-- Indexes for performance
CREATE INDEX idx_proposals_query ON query_proposals(query_id);
CREATE INDEX idx_proposals_status ON query_proposals(status);
CREATE INDEX idx_proposals_sent_date ON query_proposals(sent_date DESC);

-- Enable RLS
ALTER TABLE query_proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view proposals for their organization"
  ON query_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM queries q
      WHERE q.id = query_proposals.query_id
    )
  );

CREATE POLICY "Users can create proposals"
  ON query_proposals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM queries q
      WHERE q.id = query_proposals.query_id
    )
  );

CREATE POLICY "Users can update proposals"
  ON query_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM queries q
      WHERE q.id = query_proposals.query_id
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_query_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER query_proposals_updated_at
  BEFORE UPDATE ON query_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_query_proposals_updated_at();

-- Function to get next version number for a query
CREATE OR REPLACE FUNCTION get_next_proposal_version(p_query_id uuid)
RETURNS integer AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM query_proposals
  WHERE query_id = p_query_id;

  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Update queries table to add new status values and proposal tracking fields
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'proposal_sent_date') THEN
    ALTER TABLE queries ADD COLUMN proposal_sent_date timestamp with time zone;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'finalized_date') THEN
    ALTER TABLE queries ADD COLUMN finalized_date timestamp with time zone;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'current_proposal_version') THEN
    ALTER TABLE queries ADD COLUMN current_proposal_version integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'advance_payment_amount') THEN
    ALTER TABLE queries ADD COLUMN advance_payment_amount decimal(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'queries' AND column_name = 'advance_payment_date') THEN
    ALTER TABLE queries ADD COLUMN advance_payment_date timestamp with time zone;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE query_proposals IS 'Tracks all proposal versions sent to customers with complete history';
COMMENT ON COLUMN query_proposals.services_snapshot IS 'JSON snapshot of all services at the time proposal was sent';
COMMENT ON COLUMN query_proposals.sent_via IS 'Array of delivery methods used (whatsapp, email, sms)';
COMMENT ON COLUMN query_proposals.validity_days IS 'Number of days the proposal is valid for';
COMMENT ON FUNCTION get_next_proposal_version IS 'Returns the next version number for a query proposal';
