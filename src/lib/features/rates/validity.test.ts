import { describe, expect, it } from 'vitest';
import { isRateValid, rateAgeDays, rateExpiresOn } from './validity';

describe('rate validity (3-day window)', () => {
	it('measures rate age in whole days', () => {
		expect(rateAgeDays('2026-06-10', '2026-06-11')).toBe(1);
		expect(rateAgeDays('2026-06-11', '2026-06-11')).toBe(0);
	});

	it('expires three days after entry', () => {
		expect(rateExpiresOn('2026-06-11')).toBe('2026-06-14');
	});

	it('is valid for the entry day and the next two days', () => {
		expect(isRateValid('2026-06-11', '2026-06-11')).toBe(true);
		expect(isRateValid('2026-06-11', '2026-06-13')).toBe(true);
		expect(isRateValid('2026-06-11', '2026-06-14')).toBe(false);
	});

	it('treats future-dated rates as invalid for today', () => {
		expect(isRateValid('2026-06-15', '2026-06-11')).toBe(false);
	});
});
