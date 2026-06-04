-- Vendor WhatsApp group link (Billoo works with vendors via shared WA groups).
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.

ALTER TABLE public.vendors
	ADD COLUMN IF NOT EXISTS whatsapp_group TEXT;
