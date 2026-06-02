import { describe, expect, it } from 'vitest';
import { add, money, multiply, profit, profitMarginPct, sum, toNumber } from './money';

describe('money layer', () => {
	it('adds without float drift', () => {
		// The classic 0.1 + 0.2 trap.
		expect(toNumber(add(money(0.1), money(0.2)))).toBe(0.3);
	});

	it('sums a list precisely', () => {
		const total = sum([money(10.1), money(20.2), money(30.3)]);
		expect(toNumber(total)).toBe(60.6);
	});

	it('multiplies by quantity', () => {
		expect(toNumber(multiply(money(199.99), 3))).toBe(599.97);
	});

	it('computes profit', () => {
		expect(toNumber(profit(money(1500), money(1200)))).toBe(300);
	});

	it('computes profit margin percent', () => {
		expect(profitMarginPct(money(2000), money(1500))).toBe(25);
	});

	it('returns zero margin when selling price is zero', () => {
		expect(profitMarginPct(money(0), money(1500))).toBe(0);
	});
});
