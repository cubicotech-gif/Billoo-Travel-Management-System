-- =====================================================
-- Passenger document vault: expand document types
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- documents.expiry_date already exists in the base schema.
-- =====================================================

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_document_type_check CHECK (
	document_type IN (
		'passport', 'cnic', 'visa', 'photo', 'vaccination', 'mahram',
		'ticket', 'voucher', 'invoice', 'receipt', 'other'
	)
);
