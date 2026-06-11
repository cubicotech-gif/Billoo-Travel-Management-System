import { describe, expect, it } from 'vitest';
import { buildObservations, type ObsStay } from './observations';
import { roomTypeEnum } from '$features/quotations/edit-map';

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
