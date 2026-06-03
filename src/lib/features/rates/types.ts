import type { Currency, Database, RateItemType } from '$lib/database.types';

export type RateCard = Database['public']['Tables']['rate_cards']['Row'];
export type NewRateCard = Database['public']['Tables']['rate_cards']['Insert'];
export type RateCardUpdate = Database['public']['Tables']['rate_cards']['Update'];

export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row'];
export type NewExchangeRate = Database['public']['Tables']['exchange_rates']['Insert'];

// Per-type configuration: currency, the unit a price is quoted in, and which
// optional fields apply. Drives the rates admin form and (later) the calculator.
export interface RateTypeConfig {
	type: RateItemType;
	label: string;
	currency: Currency;
	unit: string;
	hasCity: boolean; // hotels are split Makkah / Madinah
	hasOccupancy: boolean; // hotels: persons per room
}

export const RATE_TYPES: RateTypeConfig[] = [
	{ type: 'hotel', label: 'Hotels', currency: 'SAR', unit: 'per room / night', hasCity: true, hasOccupancy: true },
	{ type: 'transfer', label: 'Transfer', currency: 'SAR', unit: 'per vehicle', hasCity: false, hasOccupancy: false },
	{ type: 'visa', label: 'Visa', currency: 'SAR', unit: 'per person', hasCity: false, hasOccupancy: false },
	{ type: 'airline', label: 'Tickets', currency: 'PKR', unit: 'per adult', hasCity: false, hasOccupancy: false }
];

export const RATE_TYPE_BY_KEY: Record<RateItemType, RateTypeConfig> = Object.fromEntries(
	RATE_TYPES.map((c) => [c.type, c])
) as Record<RateItemType, RateTypeConfig>;

export const HOTEL_CITIES = ['Makkah', 'Madinah'] as const;
