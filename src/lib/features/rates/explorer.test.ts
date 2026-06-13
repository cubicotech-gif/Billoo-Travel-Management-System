import { describe, expect, it } from 'vitest';
import {
	enrichObservations,
	filterObservations,
	sortObservations,
	EMPTY_FILTERS,
	type EnrichedObs
} from './explorer';
import type { RateObservation } from './observations';

function obs(p: Partial<RateObservation>): RateObservation {
	return {
		id: 'o1',
		hotel_id: 'h1',
		room_type: 'quad',
		occupancy: 4,
		vendor_id: 'v1',
		check_in: '2026-06-30',
		check_out: '2026-08-20',
		rate: 290,
		currency: 'SAR',
		meal_plan: 'RO',
		source: 'rate_sheet_import',
		query_id: null,
		quotation_id: null,
		captured_at: '2026-06-13T00:00:00Z',
		captured_by: null,
		invalidated: false,
		invalidated_reason: null,
		notes: null,
		...p
	} as RateObservation;
}

const hotels = new Map([
	['h1', { name: 'Hilton Suites', city: 'makkah' }],
	['h2', { name: 'Anwar Al Madinah', city: 'madinah' }]
]);
const vname = (id: string | null) => (id ? `Vendor ${id}` : 'Own');

function enrich(rows: RateObservation[]): EnrichedObs[] {
	return enrichObservations(rows, hotels, vname);
}

describe('rate explorer filtering', () => {
	it('enriches with hotel/vendor names and verify flag', () => {
		const [r] = enrich([obs({ notes: 'VERIFY: check band' })]);
		expect(r?.hotelName).toBe('Hilton Suites');
		expect(r?.hotelCity).toBe('makkah');
		expect(r?.vendorName).toBe('Vendor v1');
		expect(r?.needsVerify).toBe(true);
	});

	it('filters by vendor, city, meal and verify status', () => {
		const rows = enrich([
			obs({ id: 'a', vendor_id: 'v1', meal_plan: 'RO' }),
			obs({ id: 'b', vendor_id: 'v2', meal_plan: 'BB', hotel_id: 'h2' }),
			obs({ id: 'c', vendor_id: 'v1', meal_plan: 'RO', notes: 'VERIFY: x' })
		]);
		expect(filterObservations(rows, { ...EMPTY_FILTERS, vendorId: 'v1' }).map((r) => r.id)).toEqual(['a', 'c']);
		expect(filterObservations(rows, { ...EMPTY_FILTERS, city: 'madinah' }).map((r) => r.id)).toEqual(['b']);
		expect(filterObservations(rows, { ...EMPTY_FILTERS, status: 'verify' }).map((r) => r.id)).toEqual(['c']);
	});

	it('excludes invalidated rows when status=live', () => {
		const rows = enrich([obs({ id: 'a' }), obs({ id: 'b', invalidated: true })]);
		expect(filterObservations(rows, EMPTY_FILTERS).map((r) => r.id)).toEqual(['a']);
		expect(filterObservations(rows, { ...EMPTY_FILTERS, status: 'all' }).map((r) => r.id)).toEqual(['a', 'b']);
	});

	it('keeps only date-bands overlapping the window', () => {
		const rows = enrich([
			obs({ id: 'jun', check_in: '2026-06-01', check_out: '2026-06-30' }),
			obs({ id: 'sep', check_in: '2026-09-01', check_out: '2026-09-30' })
		]);
		const r = filterObservations(rows, { ...EMPTY_FILTERS, from: '2026-08-01', to: '2026-12-31' });
		expect(r.map((x) => x.id)).toEqual(['sep']);
	});

	it('sorts by rate ascending and captured descending', () => {
		const rows = enrich([
			obs({ id: 'lo', rate: 100, captured_at: '2026-06-10T00:00:00Z' }),
			obs({ id: 'hi', rate: 300, captured_at: '2026-06-12T00:00:00Z' })
		]);
		expect(sortObservations(rows, { key: 'rate', dir: 'asc' }).map((r) => r.id)).toEqual(['lo', 'hi']);
		expect(sortObservations(rows, { key: 'captured_at', dir: 'desc' }).map((r) => r.id)).toEqual(['hi', 'lo']);
	});
});
