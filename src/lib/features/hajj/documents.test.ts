import { describe, expect, it } from 'vitest';
import { invoiceModel, lineToPkr, type PaymentLine } from './documents';
import { buildProposal, type ProposalInput } from './proposal';
import type { HajjAddon, HajjCatalogue, HajjPackage, HajjTraveller } from './types';

const catalogues = [
	{ id: 'usd', currency: 'USD', mina_category: 'A' },
	{ id: 'sar', currency: 'SAR', mina_category: 'A Plus' }
] as HajjCatalogue[];
const price = (opt: string, room: string, p: number) => ({
	id: opt + room,
	option_id: opt,
	room_type: room,
	price: p
});
const pkg = (id: string, cat: string, cost: number) =>
	({
		id,
		catalogue_id: cat,
		code: 'UB004',
		title: 'Swissotel – Medinah First',
		duration_label: '14 Days',
		start_date: '2027-05-07',
		end_date: '2027-05-19',
		has_aziziya: false,
		commission_per_person: 1000,
		options: [{ id: id + 'A', code: 'A', prices: [price(id + 'A', 'Quad', cost)] }]
	}) as unknown as HajjPackage;
const packages = [pkg('pS', 'sar', 54500), pkg('pU', 'usd', 14950)];
const addons = [
	{
		id: 'k',
		catalogue_id: 'sar',
		code: 'kaaba',
		name: 'Kaaba view supplement',
		pricing_kind: 'per_person',
		unit_price: 8000,
		capacity: null,
		room_prices: [],
		package_codes: null
	}
] as unknown as HajjAddon[];

const t = (id: string, over: Partial<HajjTraveller> = {}): HajjTraveller =>
	({
		id,
		package_id: 'pS',
		option_code: 'A',
		room_type: 'Quad',
		sell_price: 58400,
		ticket_airline: null,
		ticket_cost_pkr: 0,
		ticket_sell_pkr: 0,
		addons: [],
		...over
	}) as HajjTraveller;

const proposal = (travellers: HajjTraveller[]) =>
	buildProposal({
		roe: 77,
		catalogues,
		packages,
		addons,
		travellers,
		query: {
			client_name: 'Ahmed Khan',
			client_phone: '0300',
			query_number: 'QRY-20261010-0007',
			created_at: '2026-10-10T00:00:00Z'
		},
		names: { a: 'Ahmed Khan', b: 'Bilal Khan' },
		days: {}
	} as ProposalInput);

const pay = (over: Partial<PaymentLine>): PaymentLine => ({
	status: 'pending',
	amount: 0,
	paid_date: null,
	due_date: null,
	label: '50%',
	method: null,
	created_at: '2026-10-10T00:00:00Z',
	...over
});

describe('lineToPkr', () => {
	it('converts SAR at the ROE and USD at the USD rate, PKR as is', () => {
		expect(lineToPkr(1000, 'SAR', 77, null)).toBe(77000);
		expect(lineToPkr(100, 'USD', 77, 280)).toBe(28000);
		expect(lineToPkr(5000, 'PKR', 77, null)).toBe(5000);
	});

	it('cannot convert USD without a rate', () => {
		expect(lineToPkr(100, 'USD', 77, null)).toBeNull();
		expect(lineToPkr(100, 'USD', 77, 0)).toBeNull();
	});
});

describe('invoiceModel', () => {
	it('lists each traveller’s package and add-ons with PKR values and a payable total', () => {
		const p = proposal([
			t('a', {
				addons: [
					{
						id: 'l',
						traveller_id: 'a',
						addon_id: 'k',
						qty: 1,
						cost_override: null,
						sell_price: 9000,
						created_at: '',
						updated_at: '',
						pool_cost: null,
						pool_sharers: null,
						pool_vehicle: null
					}
				]
			})
		]);
		const m = invoiceModel(p, { roe: 77, usdRate: null, discountPkr: 0, payments: [] });
		expect(m.rows.map((r) => [r.first, r.currency, r.amount, r.amountPkr])).toEqual([
			[true, 'SAR', 58400, 58400 * 77],
			[false, 'SAR', 9000, 9000 * 77]
		]);
		expect(m.rows[0]?.description).toMatch(
			/Hajj package — Swissotel – Medinah First \(14 Days\) · Quad sharing · Option A/
		);
		expect(m.payablePkr).toBe((58400 + 9000) * 77);
	});

	it('applies the discount and settles against payments received', () => {
		const p = proposal([t('a')]);
		const total = 58400 * 77;
		const m = invoiceModel(p, {
			roe: 77,
			usdRate: null,
			discountPkr: 50000,
			payments: [
				pay({ status: 'paid', amount: 2_000_000, paid_date: '2026-10-11', method: 'bank' }),
				pay({ amount: 1000, due_date: '2026-11-15' })
			]
		});
		expect(m.subtotalPkr).toBe(total);
		expect(m.payablePkr).toBe(total - 50000);
		expect(m.paidPkr).toBe(2_000_000);
		expect(m.balancePkr).toBe(total - 50000 - 2_000_000);
		expect(m.received).toEqual([{ date: '2026-10-11', amount: 2_000_000, method: 'bank' }]);
		expect(m.upcoming).toEqual([{ label: '50%', amount: 1000, due: '2026-11-15' }]);
	});

	it('shows an overpayment as a negative balance (credit)', () => {
		const m = invoiceModel(proposal([t('a')]), {
			roe: 77,
			usdRate: null,
			discountPkr: 0,
			payments: [pay({ status: 'paid', amount: 99_000_000, paid_date: '2026-10-11' })]
		});
		expect(m.balancePkr).toBeLessThan(0);
	});

	it('keeps USD out of the PKR total until a USD rate is set, and reports it', () => {
		const p = proposal([t('a'), t('b', { package_id: 'pU', sell_price: 15500 })]);
		const noRate = invoiceModel(p, { roe: 77, usdRate: null, discountPkr: 0, payments: [] });
		expect(noRate.payablePkr).toBe(58400 * 77);
		expect(noRate.usdOutstanding).toBe(15500);
		expect(noRate.rows.find((r) => r.currency === 'USD')?.amountPkr).toBeNull();

		const withRate = invoiceModel(p, { roe: 77, usdRate: 280, discountPkr: 0, payments: [] });
		expect(withRate.payablePkr).toBe(58400 * 77 + 15500 * 280);
		expect(withRate.usdOutstanding).toBeNull();
	});

	it('includes the air ticket (already PKR)', () => {
		const p = proposal([t('a', { ticket_airline: 'Saudia', ticket_sell_pkr: 345000 })]);
		const m = invoiceModel(p, { roe: 77, usdRate: null, discountPkr: 0, payments: [] });
		expect(m.rows.at(-1)).toMatchObject({
			description: 'Air ticket — Saudia',
			currency: 'PKR',
			amountPkr: 345000
		});
		expect(m.payablePkr).toBe(58400 * 77 + 345000);
	});

	it('never exposes cost, margin or commission', () => {
		const m = invoiceModel(proposal([t('a')]), {
			roe: 77,
			usdRate: null,
			discountPkr: 0,
			payments: []
		});
		const text = JSON.stringify(m);
		expect(text).not.toMatch(/commission|margin|profit/i);
		expect(text).not.toContain(String(54500 * 77)); // the cost of that package in PKR
	});

	it('floors a discount larger than the total at zero payable', () => {
		const m = invoiceModel(proposal([t('a')]), {
			roe: 77,
			usdRate: null,
			discountPkr: 99_000_000,
			payments: []
		});
		expect(m.payablePkr).toBe(0);
	});
});
