import { describe, expect, it } from 'vitest';
import { groupIntoLanes, isBooked, laneFor, toCard, totalOutstanding } from './lanes';
import type { Query } from '$features/queries/types';

function q(partial: Partial<Query>): Query {
	return {
		status: 'Booking',
		booking_status: 'Pending Payment',
		selling_price: 100000,
		advance_payment_amount: 0,
		is_deleted: false,
		...partial
	} as Query;
}

describe('operations lanes', () => {
	it('treats a query as booked only in the Booking stage with a booking status', () => {
		expect(isBooked(q({}))).toBe(true);
		expect(isBooked(q({ status: 'Quoted' }))).toBe(false);
		expect(isBooked(q({ booking_status: null }))).toBe(false);
	});

	it('routes each booking status to the correct lane', () => {
		expect(laneFor('Pending Payment')).toBe('payments');
		expect(laneFor('Partial Payment')).toBe('payments');
		expect(laneFor('Check-in Done - Payment Pending')).toBe('payments');
		expect(laneFor('Payment Done - Check-in Pending')).toBe('checkins');
		expect(laneFor('Completed')).toBe('completed');
	});

	it('computes a floored outstanding balance', () => {
		expect(toCard(q({ selling_price: 100000, advance_payment_amount: 40000 })).balance).toBe(60000);
		// over-payment never goes negative
		expect(toCard(q({ selling_price: 100000, advance_payment_amount: 120000 })).balance).toBe(0);
	});

	it('orders payments oldest-first and check-ins by soonest travel', () => {
		const lanes = groupIntoLanes([
			q({ id: 'pay-new', booking_status: 'Pending Payment', stage_changed_at: '2026-06-10' }),
			q({ id: 'pay-old', booking_status: 'Pending Payment', stage_changed_at: '2026-06-01' }),
			q({ id: 'chk-late', booking_status: 'Payment Done - Check-in Pending', travel_date: '2026-07-20' }),
			q({ id: 'chk-soon', booking_status: 'Payment Done - Check-in Pending', travel_date: '2026-06-20' })
		]);
		expect(lanes.payments.map((c) => c.query.id)).toEqual(['pay-old', 'pay-new']);
		expect(lanes.checkins.map((c) => c.query.id)).toEqual(['chk-soon', 'chk-late']);
	});

	it('groups only booked, non-deleted deals and tallies outstanding', () => {
		const lanes = groupIntoLanes([
			q({ booking_status: 'Pending Payment', selling_price: 100000, advance_payment_amount: 30000 }),
			q({ booking_status: 'Payment Done - Check-in Pending' }),
			q({ booking_status: 'Completed' }),
			q({ status: 'Quoted' }), // not booked → excluded
			q({ booking_status: 'Pending Payment', is_deleted: true }) // deleted → excluded
		]);
		expect(lanes.payments).toHaveLength(1);
		expect(lanes.checkins).toHaveLength(1);
		expect(lanes.completed).toHaveLength(1);
		expect(totalOutstanding(lanes)).toBe(70000);
	});
});
