-- =====================================================
-- rate_cards.hotel_id (Rate Intelligence — builder wiring)
-- =====================================================
-- Low-risk additive column: links a rate card to a canonical hotel. Nullable,
-- ON DELETE SET NULL, so existing rate_cards keep working (the canonical hotel
-- name is still written for backward compatibility). Run once.
-- =====================================================

ALTER TABLE public.rate_cards
	ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rate_cards_hotel_id ON public.rate_cards (hotel_id);
