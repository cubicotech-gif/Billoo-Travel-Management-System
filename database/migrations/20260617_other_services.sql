-- Other services on quotations (Polio cert, insurance, …) + multi-currency lines.
-- 1) Adds 'other' to the line_type CHECKs.
-- 2) Widens the line currency CHECK to include USD (USD components were already
--    priced in-app but the constraint still only allowed SAR/PKR).
-- Safe & additive: existing rows are unaffected.

ALTER TABLE public.quotation_lines DROP CONSTRAINT IF EXISTS quotation_lines_line_type_check;
ALTER TABLE public.quotation_lines
	ADD CONSTRAINT quotation_lines_line_type_check
	CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket', 'other'));

ALTER TABLE public.quotation_lines DROP CONSTRAINT IF EXISTS quotation_lines_currency_check;
ALTER TABLE public.quotation_lines
	ADD CONSTRAINT quotation_lines_currency_check
	CHECK (currency IN ('SAR', 'PKR', 'USD'));

-- The bookings line table mirrors the same shape.
ALTER TABLE public.booking_items DROP CONSTRAINT IF EXISTS booking_items_line_type_check;
ALTER TABLE public.booking_items
	ADD CONSTRAINT booking_items_line_type_check
	CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket', 'other'));

ALTER TABLE public.booking_items DROP CONSTRAINT IF EXISTS booking_items_currency_check;
ALTER TABLE public.booking_items
	ADD CONSTRAINT booking_items_currency_check
	CHECK (currency IN ('SAR', 'PKR', 'USD'));

-- ROLLBACK (run manually if needed):
-- ALTER TABLE public.quotation_lines DROP CONSTRAINT IF EXISTS quotation_lines_line_type_check;
-- ALTER TABLE public.quotation_lines ADD CONSTRAINT quotation_lines_line_type_check
--   CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket'));
-- ALTER TABLE public.quotation_lines DROP CONSTRAINT IF EXISTS quotation_lines_currency_check;
-- ALTER TABLE public.quotation_lines ADD CONSTRAINT quotation_lines_currency_check
--   CHECK (currency IN ('SAR', 'PKR'));
-- (and the equivalent reverts on booking_items)
