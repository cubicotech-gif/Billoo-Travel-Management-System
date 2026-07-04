import { describe, expect, it } from 'vitest';
import {
	aggregatePassengers,
	collectedTotal,
	queryOwed,
	queryProfit,
	sumN,
	type RawBooking,
	type RawQuery
} from './calc';

describe('queryOwed / queryProfit', () => {
	const b: RawBooking = { actualSellPkr: 500000, actualCostPkr: 380000, discountPkr: 20000 };

	it('owed = sell − discount when booked', () => {
		expect(queryOwed(b, 999)).toBe(480000);
	});
	it('owed floors at zero and never goes negative', () => {
		expect(queryOwed({ actualSellPkr: 10000, actualCostPkr: 0, discountPkr: 99999 }, 0)).toBe(0);
	});
	it('owed falls back to the headline price without a booking', () => {
		expect(queryOwed(undefined, 123456)).toBe(123456);
	});
	it('profit = (sell − discount) − cost', () => {
		expect(queryProfit(b)).toBe(100000);
	});
	it('profit is zero without a booking', () => {
		expect(queryProfit(undefined)).toBe(0);
	});
});

describe('aggregatePassengers', () => {
	const queries: RawQuery[] = [
		{ id: 'q1', passengerId: 'p1', clientName: 'Ali', queryNumber: 'QRY-1', sellingPrice: 0 },
		{ id: 'q2', passengerId: 'p1', clientName: 'Ali', queryNumber: 'QRY-2', sellingPrice: 0 },
		{ id: 'q3', passengerId: null, clientName: 'Walk-in', queryNumber: 'QRY-3', sellingPrice: 100000 }
	];
	const bookings = new Map<string, RawBooking>([
		['q1', { actualSellPkr: 300000, actualCostPkr: 250000, discountPkr: 0 }],
		['q2', { actualSellPkr: 200000, actualCostPkr: 150000, discountPkr: 10000 }]
	]);
	const paid = new Map<string, number>([
		['q1', 300000],
		['q2', 50000],
		['q3', 40000]
	]);

	it('groups a passengers two trips into one row with a trip breakup', () => {
		const rows = aggregatePassengers(queries, bookings, paid);
		const ali = rows.find((r) => r.passengerId === 'p1')!;
		expect(ali.trips).toBe(2);
		// billed = 300000 + (200000 - 10000) = 490000
		expect(ali.billed).toBe(490000);
		expect(ali.paid).toBe(350000);
		expect(ali.balance).toBe(140000);
		// profit = 50000 + (190000 - 150000) = 90000
		expect(ali.profit).toBe(90000);
		expect(ali.tripList).toHaveLength(2);
	});

	it('keeps unlinked queries as their own row', () => {
		const rows = aggregatePassengers(queries, bookings, paid);
		const walkin = rows.find((r) => r.passengerId === null)!;
		expect(walkin.billed).toBe(100000);
		expect(walkin.balance).toBe(60000);
	});

	it('reconciles: each group total equals the sum of its trip breakup', () => {
		for (const r of aggregatePassengers(queries, bookings, paid)) {
			expect(r.billed).toBe(sumN(r.tripList.map((t) => t.billed)));
			expect(r.paid).toBe(sumN(r.tripList.map((t) => t.paid)));
			expect(r.profit).toBe(sumN(r.tripList.map((t) => t.profit)));
		}
	});
});

describe('collectedTotal', () => {
	const payments = [
		{ queryId: 'q1', amount: 300000 },
		{ queryId: 'q2', amount: 50000 },
		{ queryId: 'qc', amount: 99999 } // cancelled
	];
	it('sums paid amounts but excludes cancelled queries', () => {
		expect(collectedTotal(payments, new Set(['qc']))).toBe(350000);
	});
	it('is penny-safe over many small amounts', () => {
		const many = Array.from({ length: 10 }, () => ({ queryId: 'q', amount: 0.1 }));
		expect(collectedTotal(many, new Set())).toBe(1);
	});
});
