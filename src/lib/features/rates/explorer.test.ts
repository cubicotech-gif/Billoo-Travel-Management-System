import { describe, expect, it } from 'vitest';
import {
	enrichObservations,
	filterObservations,
	groupObservationsByHotel,
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

	it('groups into Hotel → Vendor → room line with date bands', () => {
		const groups = groupObservationsByHotel(
			enrich([
				obs({ id: 'a', hotel_id: 'h1', vendor_id: 'v1', room_type: 'double', occupancy: 2, meal_plan: 'RO', rate: 575, check_in: '2026-06-17', check_out: '2026-07-01' }),
				obs({ id: 'b', hotel_id: 'h1', vendor_id: 'v1', room_type: 'double', occupancy: 2, meal_plan: 'RO', rate: 670, check_in: '2026-07-13', check_out: '2026-07-20' }),
				obs({ id: 'c', hotel_id: 'h1', vendor_id: 'v1', room_type: 'quad', occupancy: 4, meal_plan: 'RO', rate: 700, check_in: '2026-06-27', check_out: '2026-07-01' }),
				obs({ id: 'd', hotel_id: 'h1', vendor_id: null, room_type: 'triple', occupancy: 3, meal_plan: 'RO', rate: 770, check_in: '2026-07-10', check_out: '2026-07-16' })
			])
		);
		expect(groups).toHaveLength(1);
		const h = groups[0]!;
		expect(h.hotelName).toBe('Hilton Suites');
		expect(h.bandCount).toBe(4);
		expect(h.cheapest).toBe(575);
		// Two vendors, "Own" sorts before "Vendor v1"
		expect(h.vendors.map((v) => v.vendor)).toEqual(['Own', 'Vendor v1']);
		const v1 = h.vendors.find((v) => v.vendor === 'Vendor v1')!;
		// Double (2 bands) sorts before quad (1 band)
		expect(v1.rooms.map((r) => r.roomType)).toEqual(['double', 'quad']);
		expect(v1.rooms[0]?.bands.map((b) => b.from)).toEqual(['2026-06-17', '2026-07-13']);
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
