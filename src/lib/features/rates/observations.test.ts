import { describe, expect, it } from 'vitest';
import {
	buildObservations,
	groupHotelObservations,
	latestHotelRoomRates,
	type ObsStay,
	type RateObservation
} from './observations';
import { roomTypeEnum } from '$features/quotations/edit-map';

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
const vname = (id: string | null) => (id ? `Vendor ${id}` : 'Own / unspecified');

const ctx = { quotationId: 'q1', queryId: 'qry1', capturedBy: 'user1' };

const stay = (over: Partial<ObsStay> = {}): ObsStay => ({
	hotelId: 'h1',
	vendorId: 'v1',
	checkIn: '2026-04-04',
	checkOut: '2026-04-08',
	nights: 4,
	mealPlan: 'BB',
	rooms: [{ roomType: 'quad', occupancy: 4, cost: 290 }],
	...over
});

describe('workshop rate capture', () => {
	it('maps room-type labels to the observation enum', () => {
		expect(roomTypeEnum('Double')).toBe('double');
		expect(roomTypeEnum('Sharing')).toBe('sharing');
		expect(roomTypeEnum('Quint')).toBe('custom');
	});

	it('captures one observation per priced room on a complete stay', () => {
		const rows = buildObservations(
			[stay({ rooms: [
				{ roomType: 'double', occupancy: 2, cost: 290 },
				{ roomType: 'quad', occupancy: 4, cost: 290 }
			] })],
			ctx
		);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			hotel_id: 'h1',
			room_type: 'double',
			vendor_id: 'v1',
			check_in: '2026-04-04',
			check_out: '2026-04-08',
			rate: 290,
			currency: 'SAR',
			meal_plan: 'BB',
			source: 'workshop_capture',
			quotation_id: 'q1',
			query_id: 'qry1',
			captured_by: 'user1'
		});
	});

	it('skips incomplete lines: no hotel, no dates, zero cost', () => {
		expect(buildObservations([stay({ hotelId: '' })], ctx)).toHaveLength(0);
		expect(buildObservations([stay({ checkOut: '' })], ctx)).toHaveLength(0);
		expect(buildObservations([stay({ nights: 0 })], ctx)).toHaveLength(0);
		expect(buildObservations([stay({ rooms: [{ roomType: 'quad', occupancy: 4, cost: 0 }] })], ctx)).toHaveLength(0);
	});

	it('nullable vendor, defaults meal plan to RO for unknown values', () => {
		const rows = buildObservations([stay({ vendorId: '', mealPlan: 'XX' })], ctx);
		expect(rows[0]?.vendor_id).toBeNull();
		expect(rows[0]?.meal_plan).toBe('RO');
	});
});

describe('hotel observation grouping (rate panel)', () => {
	it('groups by vendor, sorts by room then meal, flags VERIFY and dedupes', () => {
		const groups = groupHotelObservations(
			[
				obs({ vendor_id: 'v2', room_type: 'double', meal_plan: 'BB', rate: 400 }),
				obs({ vendor_id: 'v1', room_type: 'quad', meal_plan: 'RO', rate: 290 }),
				obs({ vendor_id: 'v1', room_type: 'double', meal_plan: 'RO', rate: 250, notes: 'VERIFY: band-2 unclear' }),
				// duplicate of the quad row but older → dropped
				obs({ vendor_id: 'v1', room_type: 'quad', meal_plan: 'RO', rate: 290, captured_at: '2026-06-01T00:00:00Z' })
			],
			vname
		);
		expect(groups.map((g) => g.vendor)).toEqual(['Vendor v1', 'Vendor v2']);
		// v1 sorted: double before quad
		expect(groups[0]?.rows.map((r) => r.roomType)).toEqual(['double', 'quad']);
		expect(groups[0]?.rows[0]?.needsVerify).toBe(true);
		expect(groups[0]?.rows).toHaveLength(2); // duplicate quad collapsed
	});

	it('labels a null vendor as own/unspecified and skips invalidated rows', () => {
		const groups = groupHotelObservations(
			[obs({ vendor_id: null }), obs({ vendor_id: 'v1', invalidated: true })],
			vname
		);
		expect(groups).toHaveLength(1);
		expect(groups[0]?.vendor).toBe('Own / unspecified');
	});
});

describe('latestHotelRoomRates (builder prefill)', () => {
	it('keeps the newest cost per room/occupancy for the hotel, sorted by occupancy', () => {
		const rows = latestHotelRoomRates(
			[
				obs({ id: 'a', room_type: 'quad', occupancy: 4, rate: 290, captured_at: '2026-06-01T00:00:00Z' }),
				obs({ id: 'b', room_type: 'quad', occupancy: 4, rate: 310, captured_at: '2026-06-12T00:00:00Z' }),
				obs({ id: 'c', room_type: 'double', occupancy: 2, rate: 500, captured_at: '2026-06-10T00:00:00Z' })
			],
			'h1'
		);
		expect(rows.map((r) => r.occupancy)).toEqual([2, 4]);
		expect(rows.find((r) => r.occupancy === 4)?.cost).toBe(310); // newer wins
	});

	it('ignores other hotels and invalidated rows, and needs a hotelId', () => {
		const data = [
			obs({ id: 'a', hotel_id: 'h1', rate: 290 }),
			obs({ id: 'b', hotel_id: 'h2', rate: 999 }),
			obs({ id: 'c', hotel_id: 'h1', invalidated: true, rate: 1 })
		];
		expect(latestHotelRoomRates(data, 'h1').map((r) => r.cost)).toEqual([290]);
		expect(latestHotelRoomRates(data, '')).toEqual([]);
	});
});
