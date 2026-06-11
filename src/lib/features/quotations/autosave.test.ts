import { describe, expect, it } from 'vitest';
import { ratesToSave, type RateSnapshot } from './autosave';
import type { RateCard } from '$features/rates/types';

function rate(p: Partial<RateCard>): RateCard {
	return {
		id: 'r1',
		rate_date: '2026-06-11',
		item_type: 'hotel',
		name: 'Hilton Makkah',
		city: 'Makkah',
		vendor_id: 'v1',
		currency: 'SAR',
		cost_price: 200,
		selling_price: 250,
		unit: 'per room / night',
		occupancy: 4,
		active: true,
		notes: null,
		meta: {},
		created_at: '',
		updated_at: '',
		...p
	} as RateCard;
}

const snap = (p: Partial<RateSnapshot>): RateSnapshot => ({
	item_type: 'hotel',
	name: 'Hilton Makkah',
	city: 'Makkah',
	occupancy: 4,
	vendor_id: 'v1',
	currency: 'SAR',
	unit: 'per room / night',
	cost_price: 200,
	selling_price: 250,
	...p
});

describe('rate auto-save decisions', () => {
	const asOf = '2026-06-11';

	it('saves a brand-new hotel rate', () => {
		expect(ratesToSave([], [snap({})], asOf)).toHaveLength(1);
	});

	it('skips an unchanged, still-valid rate (fuzzy name match)', () => {
		const existing = [rate({})];
		expect(ratesToSave(existing, [snap({ name: 'Hiltn Makkah' })], asOf)).toHaveLength(0);
	});

	it('saves when the price changed', () => {
		const existing = [rate({})];
		expect(ratesToSave(existing, [snap({ selling_price: 300 })], asOf)).toHaveLength(1);
	});

	it('saves when the existing rate is stale (>3 days)', () => {
		const existing = [rate({ rate_date: '2026-06-01' })];
		expect(ratesToSave(existing, [snap({})], asOf)).toHaveLength(1);
	});

	it('keeps room types (occupancy) as separate rates', () => {
		const existing = [rate({ occupancy: 4 })];
		// A Double (occupancy 2) for the same hotel is a different bucket → saved.
		const out = ratesToSave(existing, [snap({ occupancy: 2, cost_price: 120, selling_price: 150 })], asOf);
		expect(out).toHaveLength(1);
	});

	it('reuses the canonical existing name to avoid duplicates', () => {
		const existing = [rate({})];
		const out = ratesToSave(existing, [snap({ name: 'hilton makka', selling_price: 999 })], asOf);
		expect(out[0]?.name).toBe('Hilton Makkah');
	});

	it('ignores empty-priced snapshots', () => {
		expect(ratesToSave([], [snap({ cost_price: 0, selling_price: 0 })], asOf)).toHaveLength(0);
	});
});
