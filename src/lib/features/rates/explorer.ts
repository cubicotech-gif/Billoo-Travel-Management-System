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
