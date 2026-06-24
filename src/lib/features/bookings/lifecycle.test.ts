import { describe, expect, it } from 'vitest';
import {
	computeBookingStatus,
	latestServiceDate,
	lifecycleSummary,
	owedTotal,
	paidTotal,
	tripEndDate
} from './lifecycle';

describe('computeBookingStatus', () => {
	it('routes paid + trip-ahead to check-in left', () => {
		expect(computeBookingStatus(true, false)).toBe('Payment Done - Check-in Left');
	});
	it('routes unpaid + trip-ahead to payment-pending check-in left', () => {
		expect(computeBookingStatus(false, false)).toBe('Payment Pending - Check-in Left');
	});
	it('routes unpaid + trip-over to the travel-done payments column (not Completed)', () => {
		expect(computeBookingStatus(false, true)).toBe('Payment Pending - Travel Done');
	});
	it('completes only when paid in full AND the trip is over', () => {
		expect(computeBookingStatus(true, true)).toBe('Completed');
	});
});

describe('money helpers', () => {
	it('sums only received (paid) payments, to the penny', () => {
		expect(
			paidTotal([
				{ status: 'paid', amount: 100000 },
				{ status: 'pending', amount: 50000 },
				{ status: 'paid', amount: 25000.5 }
			])
		).toBe(125000.5);
	});

	it('owed = actual sell minus discount, floored at zero', () => {
		expect(owedTotal({ actual_sell_pkr: 500000, discount_pkr: 20000 })).toBe(480000);
		expect(owedTotal({ actual_sell_pkr: 10000, discount_pkr: 99999 })).toBe(0);
	});
});

describe('trip end date', () => {
	it('takes the latest hotel check-out / service date from item meta', () => {
		expect(
			latestServiceDate([
				{ meta: { check_in: '2026-03-03', check_out: '2026-03-08' } },
				{ meta: { date: '2026-03-10' } },
				{ meta: {} }
			])
		).toBe('2026-03-10');
	});

	it('falls back to the query return date, then travel date', () => {
		expect(tripEndDate([], { return_date: '2026-04-01', travel_date: '2026-03-20' })).toBe(
			'2026-04-01'
		);
		expect(tripEndDate([], { return_date: null, travel_date: '2026-03-20' })).toBe('2026-03-20');
	});
});

describe('lifecycleSummary', () => {
	const booking = { actual_sell_pkr: 500000, discount_pkr: 0 };
	const items = [{ meta: { check_out: '2026-05-10' } }];
	const query = { return_date: null, travel_date: null };

	it('is Payment Pending - Check-in Left when half paid and trip ahead', () => {
		const s = lifecycleSummary(
			booking,
			items,
			[{ status: 'paid', amount: 250000 }],
			query,
			'2026-05-01'
		);
		expect(s.balance).toBe(250000);
		expect(s.computed).toBe('Payment Pending - Check-in Left');
	});

	it('completes once fully paid and the trip date has passed', () => {
		const s = lifecycleSummary(
			booking,
			items,
			[{ status: 'paid', amount: 500000 }],
			query,
			'2026-05-20'
		);
		expect(s.balance).toBe(0);
		expect(s.tripEnded).toBe(true);
		expect(s.computed).toBe('Completed');
	});

	it('drops a still-owed booking into Travel Done after the trip', () => {
		const s = lifecycleSummary(
			booking,
			items,
			[{ status: 'paid', amount: 100000 }],
			query,
			'2026-05-20'
		);
		expect(s.computed).toBe('Payment Pending - Travel Done');
	});
});
