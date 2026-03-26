-- Phase Q2: Document Checklists for Query Workflow
-- Migration: 20260327_document_checklists.sql

-- 1. Add new document_type values to documents table CHECK constraint
-- First drop the existing constraint then re-add with expanded values
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN ('passport', 'passport_photo', 'cnic', 'vaccination', 'visa', 'ticket', 'voucher', 'hotel_voucher', 'transport_voucher', 'invoice', 'receipt', 'insurance', 'other'));

-- 2. Create document_checklists table
CREATE TABLE IF NOT EXISTS public.document_checklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.passengers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'passport', 'passport_photo', 'cnic', 'vaccination', 'visa',
    'ticket', 'hotel_voucher', 'transport_voucher', 'insurance', 'other'
  )),
  status TEXT DEFAULT 'missing' CHECK (status IN ('missing', 'uploaded', 'verified', 'expired', 'rejected')),
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  required BOOLEAN DEFAULT TRUE,
  notes TEXT,
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(query_id, passenger_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_doc_checklist_query ON public.document_checklists(query_id);
CREATE INDEX IF NOT EXISTS idx_doc_checklist_passenger ON public.document_checklists(passenger_id);
CREATE INDEX IF NOT EXISTS idx_doc_checklist_status ON public.document_checklists(status);

ALTER TABLE public.document_checklists ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create
DROP POLICY IF EXISTS "Authenticated users can manage document checklists" ON public.document_checklists;
CREATE POLICY "Authenticated users can manage document checklists" ON public.document_checklists
  FOR ALL USING (auth.role() = 'authenticated');

-- Use existing update_updated_at_column function for auto-timestamp
DROP TRIGGER IF EXISTS update_document_checklists_updated_at ON public.document_checklists;
CREATE TRIGGER update_document_checklists_updated_at
  BEFORE UPDATE ON public.document_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
