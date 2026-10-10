import { describe, expect, it } from 'vitest';
import { buildQuote } from './quote';
import type { HajjAddon, HajjCatalogue, HajjPackage, HajjTraveller } from './types';

const catalogues = [
	{ id: 'usd', currency: 'USD' },
	{ id: 'sar', currency: 'SAR' }
] as HajjCatalogue[];

const price = (option: string, room: string, p: number) => ({
	id: `${option}${room}`,
	option_id: option,
	room_type: room,
	price: p
});

const packages = [
	{
		id: 'pU',
		catalogue_id: 'usd',
		code: 'UB004',
		options: [{ id: 'oU', code: 'A', prices: [price('oU', 'Quad', 14950)] }]
	},
	{
		id: 'pS',
		catalogue_id: 'sar',
		code: 'UB004',
		options: [{ id: 'oS', code: 'A', prices: [price('oS', 'Quad', 54500)] }]
	}
] as unknown as HajjPackage[];

const gmcSar = {
	id: 'gmc',
	catalogue_id: 'sar',
	pricing_kind: 'pooled_vehicle',
	unit_price: 35000,
	capacity: 6,
	room_prices: []
} as unknown as HajjAddon;

const traveller = (over: Partial<HajjTraveller>): HajjTraveller =>
	({
		id: 't',
		package_id: 'pS',
		option_code: 'A',
		room_type: 'Quad',
		sell_price: 54500,
		ticket_cost_pkr: 0,
		ticket_sell_pkr: 0,
		addons: [],
		...over
	}) as HajjTraveller;

describe('buildQuote', () => {
	it('prices travellers from the live catalogue in their own currency', () => {
		const q = buildQuote({
			roe: 77,
			catalogues,
			packages,
			addons: [],
			travellers: [
				traveller({ id: 'a', package_id: 'pS', sell_price: 56000 }),
				traveller({ id: 'b', package_id: 'pU', sell_price: 15500 })
			]
		});
		expect(q.usd).toMatchObject({ cost: 14950, sell: 15500 });
		expect(q.byCurrency.find((c) => c.currency === 'SAR')).toMatchObject({
			cost: 54500,
			sell: 56000
		});
		expect(q.pkr.sell).toBe(56000 * 77);
	});

	it('splits a GMC taken by several family members and lets a USD traveller take it in SAR', () => {
		const line = (id: string) => ({
			id,
			traveller_id: 't',
			addon_id: 'gmc',
			qty: 1,
			cost_override: null,
			sell_price: null,
			created_at: '',
			updated_at: ''
		});
		const q = buildQuote({
			roe: 77,
			catalogues,
			packages,
			addons: [gmcSar],
			travellers: [
				traveller({ id: 'a', package_id: 'pS', addons: [line('la')] }),
				traveller({ id: 'b', package_id: 'pU', sell_price: 15000, addons: [line('lb')] })
			]
		});
		expect(q.travellers[0]?.addons[0]).toMatchObject({ cost: 17500, currency: 'SAR', sharers: 2 });
		expect(q.travellers[1]?.addons[0]).toMatchObject({ cost: 17500, currency: 'SAR', sharers: 2 });
		expect(q.usd?.sell).toBe(15000);
	});

	it('keeps a traveller whose package left the catalogue, priced at zero and flagged', () => {
		const q = buildQuote({
			roe: 77,
			catalogues,
			packages,
			addons: [],
			travellers: [traveller({ package_id: 'gone', sell_price: 0 })]
		});
		expect(q.travellers[0]?.baseMissing).toBe(true);
	});

	it('ignores an add-on row whose definition no longer exists', () => {
		const q = buildQuote({
			roe: 77,
			catalogues,
			packages,
			addons: [],
			travellers: [
				traveller({
					addons: [
						{
							id: 'x',
							traveller_id: 't',
							addon_id: 'missing',
							qty: 1,
							cost_override: null,
							sell_price: null
						} as never
					]
				})
			]
		});
		expect(q.travellers[0]?.addons).toEqual([]);
	});
});
