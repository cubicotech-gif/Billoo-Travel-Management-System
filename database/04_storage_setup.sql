-- Storage Bucket Setup for Document Management
-- Run this in your Supabase SQL Editor

-- Create storage bucket for documents (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to view their organization's documents
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to update documents
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Add helpful indexes for document queries
CREATE INDEX IF NOT EXISTS idx_documents_entity
ON documents(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_documents_expiry
ON documents(expiry_date)
WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_type
ON documents(document_type);

-- Add comment explaining the storage structure
COMMENT ON TABLE documents IS 'Stores metadata for documents uploaded to Supabase Storage. Files are stored in the "documents" bucket with path structure: entity_type/entity_id/timestamp.extension';
