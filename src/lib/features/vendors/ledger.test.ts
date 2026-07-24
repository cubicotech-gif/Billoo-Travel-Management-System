import { describe, expect, it } from 'vitest';
import { paymentPkr } from './calc';

describe('paymentPkr', () => {
	it('passes PKR amounts through untouched', () => {
		expect(paymentPkr({ amount: 1_409_900, currency: 'PKR', rate_to_pkr: 1 })).toBe(1_409_900);
	});

	it('converts a SAR payment at its stored rate (Mawasim case)', () => {
		// 240 SAR × 76.5 = 18,360 PKR
		expect(paymentPkr({ amount: 240, currency: 'SAR', rate_to_pkr: 76.5 })).toBe(18_360);
	});

	it('converts a USD payment at its stored rate (DOTW case)', () => {
		// $1,500 × 281 = 421,500 PKR
		expect(paymentPkr({ amount: 1500, currency: 'USD', rate_to_pkr: 281 })).toBe(421_500);
	});

	it('defaults to PKR when currency is missing (legacy rows)', () => {
		expect(paymentPkr({ amount: 5000 })).toBe(5000);
		expect(paymentPkr({ amount: 5000, currency: null })).toBe(5000);
	});

	it('defaults the rate to 1 when absent on a foreign payment', () => {
		expect(paymentPkr({ amount: 100, currency: 'SAR' })).toBe(100);
	});

	it('is penny-safe on fractional conversions', () => {
		// 7,915.5 SAR × 75.4 = 596,828.7 PKR
		expect(paymentPkr({ amount: 7915.5, currency: 'SAR', rate_to_pkr: 75.4 })).toBe(596_828.7);
	});
});
