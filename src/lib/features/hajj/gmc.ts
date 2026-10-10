import { splitVehicle } from './calc';
import type { HajjCurrency } from './types';

// GMC settlement across clients. A GMC is one price per vehicle (max `capacity`
// people) split by the headcount actually in it. The rules:
//
//  * A family that takes the GMC shares its own vehicle among its own members
//    only (n takers => ceil(n / capacity) vehicles, split evenly across the n).
//  * Single travellers (one GMC taker on their query) pool ACROSS clients and
//    packages — Mashaer days are identical for everyone — filling vehicles in
//    the order they were confirmed, `capacity` at a time.
//  * A pool is per currency/price: a USD vehicle and a SAR vehicle are different.
//  * Only travellers on confirmed (Booking-stage) queries are counted; a quote
//    that hasn't been confirmed never lowers anyone else's price.

export interface GmcLine {
	/** hajj_traveller_addons.id */
	lineId: string;
	queryId: string;
	currency: HajjCurrency;
	/** Price of one vehicle, in `currency`. */
	vehiclePrice: number;
	capacity: number;
	/** When the query was confirmed (entered the Booking stage), ISO. */
	confirmedAt: string;
}

export interface GmcAssignment {
	lineId: string;
	/** This traveller's final share of the vehicle. */
	cost: number;
	/** How many people share their vehicle. */
	sharers: number;
	/** e.g. 'SAR-3' (shared pool, vehicle 3) or 'SAR-F2' (family vehicle). */
	vehicle: string;
	scope: 'family' | 'shared';
}

export function settleGmc(lines: GmcLine[]): GmcAssignment[] {
	// One pool per currency + vehicle price + capacity.
	const pools = new Map<string, GmcLine[]>();
	for (const l of lines) {
		const key = `${l.currency}|${l.vehiclePrice}|${l.capacity}`;
		const arr = pools.get(key) ?? [];
		arr.push(l);
		pools.set(key, arr);
	}

	const out: GmcAssignment[] = [];
	for (const group of pools.values()) {
		const first = group[0];
		if (!first) continue;
		const { currency, vehiclePrice, capacity } = first;

		const byQuery = new Map<string, GmcLine[]>();
		for (const l of group) {
			const arr = byQuery.get(l.queryId) ?? [];
			arr.push(l);
			byQuery.set(l.queryId, arr);
		}

		// Families first (stable order by confirmation, then query id).
		const families = [...byQuery.entries()]
			.filter(([, ls]) => ls.length >= 2)
			.sort(([a, la], [b, lb]) => cmp(la[0]?.confirmedAt, lb[0]?.confirmedAt) || cmp(a, b));
		families.forEach(([, ls], i) => {
			const shares = splitVehicle(vehiclePrice, capacity, ls.length);
			const ordered = [...ls].sort((x, y) => cmp(x.lineId, y.lineId));
			ordered.forEach((l, j) =>
				out.push({
					lineId: l.lineId,
					cost: shares[j] ?? 0,
					sharers: ls.length,
					vehicle: `${currency}-F${i + 1}`,
					scope: 'family'
				})
			);
		});

		// Singles pool across clients, in the order confirmed.
		const singles = [...byQuery.values()]
			.filter((ls) => ls.length === 1)
			.map((ls) => ls[0] as GmcLine)
			.sort(
				(a, b) =>
					cmp(a.confirmedAt, b.confirmedAt) || cmp(a.queryId, b.queryId) || cmp(a.lineId, b.lineId)
			);
		for (let start = 0; start < singles.length; start += capacity) {
			const chunk = singles.slice(start, start + capacity);
			const shares = splitVehicle(vehiclePrice, capacity, chunk.length);
			chunk.forEach((l, j) =>
				out.push({
					lineId: l.lineId,
					cost: shares[j] ?? 0,
					sharers: chunk.length,
					vehicle: `${currency}-${start / capacity + 1}`,
					scope: 'shared'
				})
			);
		}
	}
	return out;
}

const cmp = (a: string | undefined, b: string | undefined) =>
	(a ?? '') < (b ?? '') ? -1 : (a ?? '') > (b ?? '') ? 1 : 0;
