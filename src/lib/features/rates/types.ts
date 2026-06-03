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

/**
 * Collapse the date-stamped rate history to the latest row per logical item
 * (item_type + name + city), keeping only active rates. This is what the
 * quotation calculator should choose from.
 */
export function latestRates(rates: RateCard[]): RateCard[] {
	const byKey = new Map<string, RateCard>();
	for (const r of rates) {
		if (!r.active) continue;
		const key = `${r.item_type}|${r.name}|${r.city ?? ''}`;
		const existing = byKey.get(key);
		if (!existing || r.rate_date > existing.rate_date) byKey.set(key, r);
	}
	return [...byKey.values()];
}
