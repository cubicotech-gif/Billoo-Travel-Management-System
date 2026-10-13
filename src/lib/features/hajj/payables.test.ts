import { describe, expect, it } from 'vitest';
import { costByQuery, payablesSummary, type PayableQuery } from './payables';
import type { HajjAddon, HajjCatalogue, HajjPackage, HajjTraveller } from './types';

const catalogues = [
	{ id: 'usd', currency: 'USD' },
	{ id: 'sar', currency: 'SAR' }
] as HajjCatalogue[];
const price = (o: string, r: string, p: number) => ({ id: o + r, option_id: o, room_type: r, price: p });
const packages = [
	{ id: 'pS', catalogue_id: 'sar', code: 'S', options: [{ id: 'oS', code: 'A', prices: [price('oS', 'Quad', 54500)] }] },
	{ id: 'pU', catalogue_id: 'usd', code: 'U', options: [{ id: 'oU', code: 'A', prices: [price('oU', 'Quad', 14950)] }] }
] as unknown as HajjPackage[];
const addons = [
	{ id: 'qur', catalogue_id: 'sar', pricing_kind: 'per_person', unit_price: 750, capacity: null, room_prices: [] }
] as unknown as HajjAddon[];

const t = (id: string, query_id: string, package_id: string, over: Partial<HajjTraveller> = {}) =>
	({
		id, query_id, package_id, option_code: 'A', room_type: 'Quad', sell_price: 99999,
		ticket_cost_pkr: 80000, ticket_sell_pkr: 90000, addons: [], ...over
	}) as HajjTraveller;

const q = (id: string, status = 'Booking', is_deleted = false): PayableQuery => ({
	id, query_number: `QRY-${id}`, client_name: `Client ${id}`, status, is_deleted
});

const base = { catalogues, packages, addons };

describe('costByQuery', () => {
	it('sums catalogue cost per currency for confirmed queries only', () => {
		const rows = costByQuery({
			...base,
			travellers: [
				t('a', '1', 'pS'),
				t('b', '1', 'pS', {
					addons: [{ id: 'l', traveller_id: 'b', addon_id: 'qur', qty: 1, cost_override: null, sell_price: null } as never]
				}),
				t('c', '1', 'pU'),
				t('d', '2', 'pS')
			],
			queries: [q('1'), q('2', 'Quoted'), q('3', 'Booking', true)]
		});
		expect(rows).toHaveLength(1);
		// 2 SAR packages + 1 Qurbani; selling prices and tickets never count.
		expect(rows[0]?.cost).toEqual({ USD: 14950, SAR: 2 * 54500 + 750 });
		expect(rows[0]?.travellers).toBe(3);
	});
});

describe('costByQuery — other services', () => {
	it('leaves hand-entered other services out (they are not the vendor’s)', () => {
		const rows = costByQuery({
			...base,
			travellers: [
				t('a', '1', 'pS', {
					extras: [{ id: 'x', traveller_id: 'a', label: 'Wheelchair', currency: 'SAR', cost: 200, sell_price: 350, sort_order: 0, created_at: '', updated_at: '' }]
				})
			],
			queries: [q('1')]
		});
		expect(rows[0]?.cost).toEqual({ SAR: 54500 });
	});
});

describe('payablesSummary', () => {
	const rows = costByQuery({
		...base,
		travellers: [t('a', '1', 'pS'), t('b', '2', 'pS'), t('c', '2', 'pU')],
		queries: [q('1'), q('2')]
	});

	it('owed − paid per currency, USD and SAR never merged', () => {
		const { lines } = payablesSummary(rows, [
			{ amount: 30000, currency: 'SAR', query_id: '1' },
			{ amount: 5000, currency: 'USD', query_id: null }
		]);
		expect(lines).toEqual([
			{ currency: 'USD', owed: 14950, paid: 5000, unallocated: 5000, outstanding: 9950 },
			{ currency: 'SAR', owed: 109000, paid: 30000, unallocated: 0, outstanding: 79000 }
		]);
	});

	it('follows each booking’s balance from allocated payments', () => {
		const { queries } = payablesSummary(rows, [
			{ amount: 54500, currency: 'SAR', query_id: '1' },
			{ amount: 10000, currency: 'SAR', query_id: '2' }
		]);
		expect(queries.find((x) => x.queryId === '1')?.balance.SAR).toBe(0);
		expect(queries.find((x) => x.queryId === '2')?.balance).toEqual({ SAR: 44500, USD: 14950 });
	});

	it('shows an overpayment as a negative outstanding and keeps payments with no booking', () => {
		const { lines } = payablesSummary(rows, [
			{ amount: 60000, currency: 'SAR', query_id: '1' },
			{ amount: 100000, currency: 'SAR', query_id: 'gone' }
		]);
		const sar = lines.find((l) => l.currency === 'SAR');
		expect(sar?.outstanding).toBe(109000 - 160000);
		expect(sar?.unallocated).toBe(100000);
	});

	it('is empty with nothing owed and nothing paid', () => {
		expect(payablesSummary([], []).lines).toEqual([]);
	});

	it('adds pennies exactly', () => {
		const { lines } = payablesSummary(rows, [
			{ amount: 0.1, currency: 'SAR', query_id: null },
			{ amount: 0.2, currency: 'SAR', query_id: null }
		]);
		expect(lines.find((l) => l.currency === 'SAR')?.paid).toBe(0.3);
	});
});
