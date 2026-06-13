import type { Currency } from '$lib/database.types';
import type { RateObservation } from './observations';

// Pure filter/sort core for the Hotel Rates explorer. Kept free of Svelte and
// Supabase so it can be unit tested.

export interface EnrichedObs extends RateObservation {
	hotelName: string;
	hotelCity: string;
	vendorName: string;
	needsVerify: boolean;
}

export interface ObsFilters {
	vendorId: string; // '' = all
	hotelId: string; // '' = all
	city: string; // '' = all
	roomType: string; // '' = all
	mealPlan: string; // '' = all
	source: string; // '' = all
	status: 'all' | 'live' | 'invalidated' | 'verify';
	from: string; // ISO date; '' = no lower bound
	to: string; // ISO date; '' = no upper bound
	search: string;
}

export const EMPTY_FILTERS: ObsFilters = {
	vendorId: '',
	hotelId: '',
	city: '',
	roomType: '',
	mealPlan: '',
	source: '',
	status: 'live',
	from: '',
	to: '',
	search: ''
};

export type ObsSortKey = 'rate' | 'captured_at' | 'check_in' | 'hotel' | 'vendor';
export interface ObsSort {
	key: ObsSortKey;
	dir: 'asc' | 'desc';
}

export function enrichObservations(
	obs: RateObservation[],
	hotels: Map<string, { name: string; city: string }>,
	vendorName: (id: string | null) => string
): EnrichedObs[] {
	return obs.map((o) => {
		const h = hotels.get(o.hotel_id);
		return {
			...o,
			hotelName: h?.name ?? 'Unknown hotel',
			hotelCity: h?.city ?? '',
			vendorName: vendorName(o.vendor_id),
			needsVerify: (o.notes ?? '').startsWith('VERIFY:')
		};
	});
}

export function filterObservations(rows: EnrichedObs[], f: ObsFilters): EnrichedObs[] {
	const search = f.search.trim().toLowerCase();
	return rows.filter((r) => {
		if (f.vendorId && r.vendor_id !== f.vendorId) return false;
		if (f.hotelId && r.hotel_id !== f.hotelId) return false;
		if (f.city && r.hotelCity !== f.city) return false;
		if (f.roomType && r.room_type !== f.roomType) return false;
		if (f.mealPlan && r.meal_plan !== f.mealPlan) return false;
		if (f.source && r.source !== f.source) return false;
		if (f.status === 'live' && r.invalidated) return false;
		if (f.status === 'invalidated' && !r.invalidated) return false;
		if (f.status === 'verify' && !r.needsVerify) return false;
		// Date-band overlap: keep rows whose [check_in, check_out] intersects the window.
		if (f.from && r.check_out && r.check_out < f.from) return false;
		if (f.to && r.check_in && r.check_in > f.to) return false;
		if (search) {
			const hay = `${r.hotelName} ${r.vendorName} ${r.notes ?? ''} ${r.room_type ?? ''}`.toLowerCase();
			if (!hay.includes(search)) return false;
		}
		return true;
	});
}

// --- Nested grouping: Hotel → Vendor → Room line → date bands (seasons) ------
//
// The flat table grew one row per (room × meal × season × vendor), so a single
// hotel sprawled across 8–10 lines. The explorer instead collapses to one card
// per hotel, grouped by vendor, with each room line listing its seasons. Pure so
// it can be unit tested; the Svelte panel just renders the tree.

const ROOM_ORDER: Record<string, number> = { double: 0, triple: 1, quad: 2, sharing: 3, custom: 4 };
const MEAL_ORDER: Record<string, number> = { RO: 0, BB: 1, HB: 2, FB: 3 };

export interface RateBand {
	id: string;
	rate: number;
	currency: Currency;
	from: string | null;
	to: string | null;
	needsVerify: boolean;
	invalidated: boolean;
	capturedAt: string;
}
export interface RoomLine {
	roomType: string | null;
	occupancy: number | null;
	mealPlan: string;
	bands: RateBand[];
}
export interface ExplorerVendorGroup {
	vendorId: string | null;
	vendor: string;
	rooms: RoomLine[];
	cheapest: number;
}
export interface HotelGroup {
	hotelId: string;
	hotelName: string;
	hotelCity: string;
	bandCount: number;
	cheapest: number;
	vendors: ExplorerVendorGroup[];
}

export function groupObservationsByHotel(rows: EnrichedObs[]): HotelGroup[] {
	const hotels = new Map<string, { meta: EnrichedObs; vendors: Map<string, EnrichedObs[]> }>();
	for (const r of rows) {
		let h = hotels.get(r.hotel_id);
		if (!h) {
			h = { meta: r, vendors: new Map() };
			hotels.set(r.hotel_id, h);
		}
		const vkey = r.vendor_id ?? '';
		const list = h.vendors.get(vkey);
		if (list) list.push(r);
		else h.vendors.set(vkey, [r]);
	}

	const out: HotelGroup[] = [];
	for (const h of hotels.values()) {
		const vendors: ExplorerVendorGroup[] = [];
		let hotelMin = Infinity;
		let bandCount = 0;
		for (const obsList of h.vendors.values()) {
			// Bucket a vendor's rows into room lines (room + occupancy + meal).
			const lines = new Map<string, RoomLine>();
			let vendorMin = Infinity;
			for (const o of obsList) {
				const lk = `${o.room_type ?? ''}|${o.occupancy ?? ''}|${o.meal_plan}`;
				let line = lines.get(lk);
				if (!line) {
					line = { roomType: o.room_type, occupancy: o.occupancy, mealPlan: o.meal_plan, bands: [] };
					lines.set(lk, line);
				}
				line.bands.push({
					id: o.id,
					rate: Number(o.rate),
					currency: o.currency,
					from: o.check_in,
					to: o.check_out,
					needsVerify: o.needsVerify,
					invalidated: o.invalidated,
					capturedAt: o.captured_at
				});
				bandCount += 1;
				if (!o.invalidated && Number(o.rate) > 0) vendorMin = Math.min(vendorMin, Number(o.rate));
			}
			const roomLines = [...lines.values()];
			for (const line of roomLines) {
				line.bands.sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''));
			}
			roomLines.sort(
				(a, b) =>
					(ROOM_ORDER[a.roomType ?? ''] ?? 9) - (ROOM_ORDER[b.roomType ?? ''] ?? 9) ||
					(MEAL_ORDER[a.mealPlan] ?? 9) - (MEAL_ORDER[b.mealPlan] ?? 9)
			);
			const first = obsList[0];
			vendors.push({
				vendorId: first?.vendor_id ?? null,
				vendor: first?.vendorName ?? 'Own / unspecified',
				rooms: roomLines,
				cheapest: vendorMin === Infinity ? 0 : vendorMin
			});
			if (vendorMin !== Infinity) hotelMin = Math.min(hotelMin, vendorMin);
		}
		vendors.sort((a, b) => a.vendor.localeCompare(b.vendor));
		out.push({
			hotelId: h.meta.hotel_id,
			hotelName: h.meta.hotelName,
			hotelCity: h.meta.hotelCity,
			bandCount,
			cheapest: hotelMin === Infinity ? 0 : hotelMin,
			vendors
		});
	}
	out.sort((a, b) => a.hotelName.localeCompare(b.hotelName));
	return out;
}

export function sortObservations(rows: EnrichedObs[], s: ObsSort): EnrichedObs[] {
	const dir = s.dir === 'asc' ? 1 : -1;
	const out = [...rows];
	out.sort((a, b) => {
		let cmp = 0;
		switch (s.key) {
			case 'rate':
				cmp = Number(a.rate) - Number(b.rate);
				break;
			case 'captured_at':
				cmp = a.captured_at.localeCompare(b.captured_at);
				break;
			case 'check_in':
				cmp = (a.check_in ?? '').localeCompare(b.check_in ?? '');
				break;
			case 'hotel':
				cmp = a.hotelName.localeCompare(b.hotelName);
				break;
			case 'vendor':
				cmp = a.vendorName.localeCompare(b.vendorName);
				break;
		}
		return cmp * dir;
	});
	return out;
}
