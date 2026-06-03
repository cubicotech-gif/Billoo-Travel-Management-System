import { describe, expect, it } from 'vitest';
import { bookingTotals, itemProfit, type BookingItemAmounts } from './totals';

const items: BookingItemAmounts[] = [
	// Hotel in SAR: quoted 200/250, actual 210/250
	{ currency: 'SAR', quoted_cost: 200, quoted_sell: 250, actual_cost: 210, actual_sell: 250 },
	// Tickets in PKR: quoted 150000/180000, actual 155000/180000
	{ currency: 'PKR', quoted_cost: 150000, quoted_sell: 180000, actual_cost: 155000, actual_sell: 180000 }
];

describe('booking totals', () => {
	it('converts SAR via roe and sums with PKR lines', () => {
		const t = bookingTotals(items, 75);
		// actual cost: 210*75 + 155000 = 15750 + 155000 = 170750
		expect(t.actualCostPkr).toBe(170750);
		// actual sell: 250*75 + 180000 = 18750 + 180000 = 198750
		expect(t.actualSellPkr).toBe(198750);
		expect(t.profitPkr).toBe(28000);
	});

	it('computes variance vs quote (actual profit − quoted profit)', () => {
		const t = bookingTotals(items, 75);
		// quoted cost: 200*75 + 150000 = 165000; quoted sell: 250*75 + 180000 = 198750
		// quoted profit = 33750; actual profit = 28000; variance = -5750
		expect(t.quotedCostPkr).toBe(165000);
		expect(t.variancePkr).toBe(-5750);
	});

	it('per-item profit is in the line currency', () => {
		expect(itemProfit(items[0]!)).toBe(40); // 250 − 210 SAR
		expect(itemProfit(items[1]!)).toBe(25000); // 180000 − 155000 PKR
	});

	it('handles an empty booking as zero', () => {
		const t = bookingTotals([], 75);
		expect(t.actualSellPkr).toBe(0);
		expect(t.profitPkr).toBe(0);
		expect(t.variancePkr).toBe(0);
	});
});
