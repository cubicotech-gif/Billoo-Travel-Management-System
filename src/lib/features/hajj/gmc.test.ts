import { describe, expect, it } from 'vitest';
import { settleGmc, type GmcLine } from './gmc';

let n = 0;
const line = (queryId: string, over: Partial<GmcLine> = {}): GmcLine => ({
	lineId: `l${String(++n).padStart(3, '0')}`,
	queryId,
	currency: 'SAR',
	vehiclePrice: 35000,
	capacity: 6,
	confirmedAt: '2026-10-01T00:00:00Z',
	...over
});
const by = (a: ReturnType<typeof settleGmc>) => Object.fromEntries(a.map((x) => [x.lineId, x]));

describe('settleGmc', () => {
	it('charges a lone traveller the whole vehicle', () => {
		const l = line('q1');
		expect(settleGmc([l])[0]).toMatchObject({
			cost: 35000,
			sharers: 1,
			scope: 'shared',
			vehicle: 'SAR-1'
		});
	});

	it('pools single travellers from different clients and packages', () => {
		const a = line('q1');
		const b = line('q2');
		const c = line('q3');
		const r = by(settleGmc([a, b, c]));
		for (const l of [a, b, c]) expect(r[l.lineId]).toMatchObject({ sharers: 3, scope: 'shared' });
		const total = [a, b, c].reduce((s, l) => s + Math.round((r[l.lineId]?.cost ?? 0) * 100), 0);
		expect(total).toBe(3_500_000);
	});

	it('keeps a family on its own vehicle, split among its own members only', () => {
		const f1 = line('fam');
		const f2 = line('fam');
		const single = line('q9');
		const r = by(settleGmc([f1, f2, single]));
		expect(r[f1.lineId]).toMatchObject({ cost: 17500, sharers: 2, scope: 'family' });
		expect(r[f2.lineId]).toMatchObject({ cost: 17500, sharers: 2, scope: 'family' });
		// the single is NOT added to the family's vehicle
		expect(r[single.lineId]).toMatchObject({ cost: 35000, sharers: 1, scope: 'shared' });
	});

	it('treats one GMC taker inside a bigger family as a single', () => {
		// only one member of the family took the GMC: they pool with other singles
		const mine = line('fam');
		const other = line('q2');
		const r = by(settleGmc([mine, other]));
		expect(r[mine.lineId]).toMatchObject({ cost: 17500, sharers: 2, scope: 'shared' });
	});

	it('fills vehicles of 6 in the order confirmed, the 7th starting a new vehicle', () => {
		const lines = Array.from({ length: 7 }, (_, i) =>
			line(`q${i}`, { confirmedAt: `2026-10-0${i + 1}T00:00:00Z` })
		);
		const r = by(settleGmc(lines));
		expect(
			lines.slice(0, 6).every((l) => r[l.lineId]?.vehicle === 'SAR-1' && r[l.lineId]?.sharers === 6)
		).toBe(true);
		expect(r[lines[6]!.lineId]).toMatchObject({ vehicle: 'SAR-2', sharers: 1, cost: 35000 });
	});

	it('orders the pool by confirmation time, not input order', () => {
		const early = line('q1', { confirmedAt: '2026-09-01T00:00:00Z' });
		const lateLines = Array.from({ length: 6 }, (_, i) =>
			line(`late${i}`, { confirmedAt: `2026-10-0${i + 1}T00:00:00Z` })
		);
		const r = by(settleGmc([...lateLines, early]));
		// the earliest confirmed is in vehicle 1; the last of the six is pushed to vehicle 2
		expect(r[early.lineId]?.vehicle).toBe('SAR-1');
		expect(r[lateLines[5]!.lineId]?.vehicle).toBe('SAR-2');
	});

	it('gives a family bigger than one vehicle a second vehicle', () => {
		const fam = Array.from({ length: 7 }, () => line('big'));
		const r = settleGmc(fam);
		const total = r.reduce((s, x) => s + Math.round(x.cost * 100), 0);
		expect(total).toBe(2 * 3_500_000);
		expect(r.every((x) => x.scope === 'family' && x.sharers === 7)).toBe(true);
	});

	it('keeps USD and SAR vehicles in separate pools', () => {
		const s = line('q1');
		const u = line('q2', { currency: 'USD', vehiclePrice: 9600 });
		const r = by(settleGmc([s, u]));
		expect(r[s.lineId]).toMatchObject({ cost: 35000, sharers: 1, vehicle: 'SAR-1' });
		expect(r[u.lineId]).toMatchObject({ cost: 9600, sharers: 1, vehicle: 'USD-1' });
	});

	it('shares of every vehicle add up to its price exactly (odd cents)', () => {
		const lines = [
			line('a', { vehiclePrice: 100 }),
			line('b', { vehiclePrice: 100 }),
			line('c', { vehiclePrice: 100 })
		];
		const total = settleGmc(lines).reduce((s, x) => s + Math.round(x.cost * 100), 0);
		expect(total).toBe(10000);
	});

	it('does nothing with no lines', () => {
		expect(settleGmc([])).toEqual([]);
	});
});
