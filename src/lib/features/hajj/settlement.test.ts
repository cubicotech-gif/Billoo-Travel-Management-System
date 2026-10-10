import { describe, expect, it } from 'vitest';
import { isUntouchedPlan, planPayments, planSettlement, type SettlementSource } from './settlement';
import type { HajjAddon, HajjCatalogue, HajjTravellerAddonRow } from './types';

const catalogues = [
	{ id: 'sar', currency: 'SAR' },
	{ id: 'usd', currency: 'USD' }
] as HajjCatalogue[];
const addons = [
	{
		id: 'gmcS',
		catalogue_id: 'sar',
		pricing_kind: 'pooled_vehicle',
		unit_price: 35000,
		capacity: 6
	},
	{ id: 'gmcU', catalogue_id: 'usd', pricing_kind: 'pooled_vehicle', unit_price: 9600, capacity: 6 }
] as unknown as HajjAddon[];

const line = (
	id: string,
	traveller: string,
	addon = 'gmcS',
	over: Partial<HajjTravellerAddonRow> = {}
): HajjTravellerAddonRow =>
	({
		id,
		traveller_id: traveller,
		addon_id: addon,
		qty: 1,
		cost_override: null,
		sell_price: null,
		pool_cost: null,
		pool_sharers: null,
		pool_vehicle: null,
		created_at: '',
		updated_at: '',
		...over
	}) as HajjTravellerAddonRow;

const q = (id: string, status = 'Booking', at = '2026-10-01T00:00:00Z') => ({
	id,
	status,
	stage_changed_at: at,
	created_at: at,
	is_deleted: false
});

const src = (over: Partial<SettlementSource>): SettlementSource => ({
	lines: [],
	travellers: [],
	queries: [],
	addons,
	catalogues,
	...over
});

describe('planSettlement', () => {
	it('settles confirmed (Booking) lines and pools singles across clients', () => {
		const out = planSettlement(
			src({
				lines: [line('l1', 't1'), line('l2', 't2')],
				travellers: [
					{ id: 't1', query_id: 'q1' },
					{ id: 't2', query_id: 'q2' }
				],
				queries: [q('q1'), q('q2')]
			})
		);
		expect(out.changes.map((c) => [c.lineId, c.pool_cost, c.pool_sharers])).toEqual([
			['l1', 17500, 2],
			['l2', 17500, 2]
		]);
	});

	it('ignores a quote that is not confirmed, so it never lowers anyone else’s price', () => {
		const out = planSettlement(
			src({
				lines: [line('l1', 't1'), line('l2', 't2')],
				travellers: [
					{ id: 't1', query_id: 'q1' },
					{ id: 't2', query_id: 'q2' }
				],
				queries: [q('q1'), q('q2', 'Quoted')]
			})
		);
		expect(out.changes).toEqual([
			{ lineId: 'l1', queryId: 'q1', pool_cost: 35000, pool_sharers: 1, pool_vehicle: 'SAR-1' }
		]);
	});

	it('clears a settled share when its query leaves the Booking stage', () => {
		const out = planSettlement(
			src({
				lines: [
					line('l1', 't1', 'gmcS', { pool_cost: 17500, pool_sharers: 2, pool_vehicle: 'SAR-1' })
				],
				travellers: [{ id: 't1', query_id: 'q1' }],
				queries: [q('q1', 'Cancelled')]
			})
		);
		expect(out.changes).toEqual([
			{ lineId: 'l1', queryId: 'q1', pool_cost: null, pool_sharers: null, pool_vehicle: null }
		]);
	});

	it('reports only lines whose settlement actually changed', () => {
		const out = planSettlement(
			src({
				lines: [
					line('l1', 't1', 'gmcS', { pool_cost: 35000, pool_sharers: 1, pool_vehicle: 'SAR-1' })
				],
				travellers: [{ id: 't1', query_id: 'q1' }],
				queries: [q('q1')]
			})
		);
		expect(out.changes).toEqual([]);
	});

	it('leaves a manually-costed line out of the pool', () => {
		const out = planSettlement(
			src({
				lines: [line('l1', 't1', 'gmcS', { cost_override: 20000 }), line('l2', 't2')],
				travellers: [
					{ id: 't1', query_id: 'q1' },
					{ id: 't2', query_id: 'q2' }
				],
				queries: [q('q1'), q('q2')]
			})
		);
		expect(out.changes.map((c) => c.lineId)).toEqual(['l2']);
		expect(out.changes[0]?.pool_cost).toBe(35000);
	});

	it('keeps a family on its own vehicle and pools USD apart from SAR', () => {
		const out = planSettlement(
			src({
				lines: [line('f1', 'ta'), line('f2', 'tb'), line('s1', 'tc'), line('u1', 'td', 'gmcU')],
				travellers: [
					{ id: 'ta', query_id: 'fam' },
					{ id: 'tb', query_id: 'fam' },
					{ id: 'tc', query_id: 'solo' },
					{ id: 'td', query_id: 'usd' }
				],
				queries: [q('fam'), q('solo'), q('usd')]
			})
		);
		const by = Object.fromEntries(out.changes.map((c) => [c.lineId, c]));
		expect(by.f1?.pool_cost).toBe(17500);
		expect(by.s1?.pool_cost).toBe(35000); // not added to the family's vehicle
		expect(by.u1?.pool_cost).toBe(9600);
	});
});

describe('planPayments', () => {
	it('splits the total 50 / 50, due at booking and on 15 November 2026', () => {
		expect(planPayments(9_000_000, '2026-10-10')).toEqual([
			{ label: '50% — At the time of booking', amount: 4_500_000, due_date: '2026-10-10' },
			{ label: '50% — By 15 November 2026', amount: 4_500_000, due_date: '2026-11-15' }
		]);
	});

	it('always adds up exactly, even with an odd paisa', () => {
		const out = planPayments(100.01, '2026-10-10');
		expect(Math.round(out.reduce((s, p) => s + p.amount * 100, 0))).toBe(10001);
	});

	it('plans nothing when nothing is payable', () => {
		expect(planPayments(0, '2026-10-10')).toEqual([]);
	});
});

describe('isUntouchedPlan', () => {
	const plan = (...s: string[]) => s.map((status, i) => ({ status, label: `50% — Step ${i}` }));

	it('is true for the auto-generated plan with nothing paid', () => {
		expect(isUntouchedPlan(plan('pending', 'pending'), 2)).toBe(true);
	});

	it('is false once any instalment is paid', () => {
		expect(isUntouchedPlan(plan('paid', 'pending'), 2)).toBe(false);
	});

	it('is false for a schedule staff built themselves', () => {
		expect(
			isUntouchedPlan(
				[
					{ status: 'pending', label: 'Deposit' },
					{ status: 'pending', label: 'Balance' }
				],
				2
			)
		).toBe(false);
	});

	it('is false when the number of instalments differs', () => {
		expect(isUntouchedPlan(plan('pending'), 2)).toBe(false);
		expect(isUntouchedPlan([], 2)).toBe(false);
	});
});
