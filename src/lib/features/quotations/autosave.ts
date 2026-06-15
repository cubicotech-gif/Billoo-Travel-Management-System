import type { RateItemType } from '$lib/database.types';
import type { NewRateCard, RateCard } from '$features/rates/types';
import { isRateValid } from '$features/rates/validity';
import { bestMatch } from './fuzzy';

// Smart rate auto-save. When staff enter rates manually in the Package Builder,
// we persist them to the rate database so they appear next time — vendor-wise,
// per hotel/occupancy — while avoiding duplicates via fuzzy name matching.

export interface RateSnapshot {
	item_type: RateItemType;
	name: string;
	city: string | null;
	occupancy: number | null;
	vendor_id: string | null;
	hotel_id?: string | null;
	currency: 'SAR' | 'USD' | 'PKR';
	unit: string | null;
	cost_price: number;
	selling_price: number;
}

/**
 * Decide which snapshots actually need persisting given the existing pool.
 * A snapshot is saved when no matching item exists, or when the matched item's
 * price changed, or when its latest rate has gone stale (>3 days). Matching
 * existing names are reused as the canonical name to keep the DB de-duplicated.
 * Pure — unit tested.
 */
export function ratesToSave(
	existing: RateCard[],
	snaps: RateSnapshot[],
	asOf?: string
): RateSnapshot[] {
	const out: RateSnapshot[] = [];
	for (const s of snaps) {
		if (s.selling_price <= 0 && s.cost_price <= 0) continue;
		const bucket = existing.filter(
			(r) =>
				r.item_type === s.item_type &&
				(r.city ?? '') === (s.city ?? '') &&
				(r.occupancy ?? null) === (s.occupancy ?? null)
		);
		const match = bestMatch(s.name, bucket, (r) => r.name);
		if (!match) {
			out.push(s);
			continue;
		}
		const priceChanged =
			Number(match.cost_price) !== s.cost_price ||
			Number(match.selling_price) !== s.selling_price;
		const stale = !isRateValid(match.rate_date, asOf);
		const vendorChanged = (match.vendor_id ?? null) !== (s.vendor_id ?? null);
		if (priceChanged || stale || vendorChanged) {
			out.push({ ...s, name: match.name });
		}
	}
	return out;
}

/** Persist the snapshots that need saving. Returns the count inserted. */
export async function persistRates(
	existing: RateCard[],
	snaps: RateSnapshot[],
	asOf?: string
): Promise<number> {
	const toSave = ratesToSave(existing, snaps, asOf);
	if (toSave.length === 0) return 0;
	const { createRate } = await import('$features/rates/api');
	for (const s of toSave) {
		const row: NewRateCard = {
			item_type: s.item_type,
			name: s.name,
			city: s.city,
			occupancy: s.occupancy,
			vendor_id: s.vendor_id,
			hotel_id: s.hotel_id ?? null,
			currency: s.currency,
			unit: s.unit,
			cost_price: s.cost_price,
			selling_price: s.selling_price
		};
		await createRate(row);
	}
	return toSave.length;
}
