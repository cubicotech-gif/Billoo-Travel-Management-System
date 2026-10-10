import { describe, expect, it } from 'vitest';
import {
	addonApplies,
	addonOfferedForRoom,
	availableOptions,
	availableRooms,
	baseCost,
	computeQuote,
	splitVehicle,
	type CalcAddonDef,
	type CalcTraveller
} from './calc';
import type { HajjAddon, HajjPackage } from './types';

const pkg = (over: Partial<HajjPackage> = {}): HajjPackage =>
	({
		id: 'p1',
		code: 'UB004',
		options: [
			{
				id: 'oA',
				package_id: 'p1',
				code: 'A',
				label: null,
				created_at: '',
				prices: [
					{
						id: '1',
						option_id: 'oA',
						room_type: 'Quad',
						price: 14950,
						created_at: '',
						updated_at: ''
					},
					{
						id: '2',
						option_id: 'oA',
						room_type: 'Double',
						price: 19300,
						created_at: '',
						updated_at: ''
					}
				]
			},
			{
				id: 'oB',
				package_id: 'p1',
				code: 'B',
				label: null,
				created_at: '',
				prices: [
					{
						id: '3',
						option_id: 'oB',
						room_type: 'Quad',
						price: 14200,
						created_at: '',
						updated_at: ''
					}
				]
			}
		],
		...over
	}) as HajjPackage;

describe('catalogue lookups', () => {
	it('lists the options and rooms a package actually prices', () => {
		expect(availableOptions(pkg())).toEqual(['A', 'B']);
		expect(availableRooms(pkg(), 'A')).toEqual(['Quad', 'Double']);
		expect(availableRooms(pkg(), 'B')).toEqual(['Quad']);
		expect(availableRooms(undefined, 'A')).toEqual([]);
	});

	it('returns the cost per option and room, null when not offered (N/A)', () => {
		expect(baseCost(pkg(), 'A', 'Quad')).toBe(14950);
		expect(baseCost(pkg(), 'B', 'Quad')).toBe(14200);
		expect(baseCost(pkg(), 'B', 'Double')).toBeNull();
		expect(baseCost(pkg(), 'A', 'Sharing')).toBeNull();
	});

	it('applies add-ons to every package when the list is null, else only those listed', () => {
		expect(addonApplies({ package_codes: null }, 'UB004')).toBe(true);
		expect(addonApplies({ package_codes: ['UB001', 'UB004'] }, 'UB004')).toBe(true);
		expect(addonApplies({ package_codes: ['UB014'] }, 'UB004')).toBe(false);
	});

	it('only offers room-priced add-ons for rooms they have a price for', () => {
		const addon = {
			pricing_kind: 'per_person_by_room',
			room_prices: [{ room_type: 'Double', price: 1100 }]
		} as HajjAddon;
		expect(addonOfferedForRoom(addon, 'Double')).toBe(true);
		expect(addonOfferedForRoom(addon, 'Quad')).toBe(false);
		expect(
			addonOfferedForRoom(
				{ pricing_kind: 'per_person', room_prices: [] } as unknown as HajjAddon,
				'Quad'
			)
		).toBe(true);
	});
});

describe('splitVehicle (GMC pool)', () => {
	it('charges a lone traveller the whole vehicle', () => {
		expect(splitVehicle(35000, 6, 1)).toEqual([35000]);
	});

	it('divides the vehicle price by headcount', () => {
		expect(splitVehicle(35000, 6, 2)).toEqual([17500, 17500]);
		expect(splitVehicle(9600, 6, 6)).toEqual([1600, 1600, 1600, 1600, 1600, 1600]);
	});

	it('always adds up to the vehicle price exactly (odd cents go to the first sharers)', () => {
		const shares = splitVehicle(100, 6, 3);
		expect(shares).toEqual([33.34, 33.33, 33.33]);
		expect(Math.round(shares.reduce((a, b) => a + b, 0) * 100)).toBe(10000);
	});

	it('starts a second vehicle past capacity and splits across all of them', () => {
		// 7 people need 2 vehicles: 2 × 6000 = 12000 / 7
		const shares = splitVehicle(6000, 6, 7);
		expect(shares).toHaveLength(7);
		expect(Math.round(shares.reduce((a, b) => a + b, 0) * 100)).toBe(1_200_000);
	});

	it('handles nobody', () => {
		expect(splitVehicle(35000, 6, 0)).toEqual([]);
	});
});

const sarAddon = (over: Partial<CalcAddonDef>): CalcAddonDef => ({
	id: 'a',
	kind: 'per_person',
	currency: 'SAR',
	unitPrice: null,
	capacity: null,
	roomPrices: {},
	...over
});

const traveller = (over: Partial<CalcTraveller> = {}): CalcTraveller => ({
	id: 't1',
	currency: 'SAR',
	room: 'Quad',
	baseCost: 54500,
	baseSell: 54500,
	ticketCost: 0,
	ticketSell: 0,
	addons: [],
	...over
});

describe('computeQuote', () => {
	it('keeps USD as USD and converts only the SAR side to PKR at the ROE', () => {
		const q = computeQuote({
			roe: 77,
			travellers: [
				traveller({ id: 'sar', currency: 'SAR', baseCost: 54500, baseSell: 56000 }),
				traveller({ id: 'usd', currency: 'USD', baseCost: 14950, baseSell: 15500 })
			]
		});
		expect(q.usd).toMatchObject({ currency: 'USD', cost: 14950, sell: 15500, profit: 550 });
		expect(q.byCurrency.map((c) => c.currency)).toEqual(['USD', 'SAR']);
		// 56000 SAR × 77 = 4,312,000 PKR; USD is not converted into it
		expect(q.pkr.sell).toBe(4_312_000);
		expect(q.pkr.cost).toBe(4_196_500);
	});

	it('lets the base package be sold below cost', () => {
		const q = computeQuote({
			roe: 77,
			travellers: [traveller({ baseCost: 54500, baseSell: 50000 })]
		});
		expect(q.byCurrency[0]).toMatchObject({ cost: 54500, sell: 50000, profit: -4500 });
	});

	it('adds a per-person add-on to the base and defaults the sell to cost', () => {
		const q = computeQuote({
			roe: 77,
			travellers: [
				traveller({
					addons: [
						{
							id: 'l1',
							def: sarAddon({ id: 'kaaba', unitPrice: 8000 }),
							qty: 1,
							costOverride: null,
							sellPrice: null
						}
					]
				})
			]
		});
		expect(q.travellers[0]?.addons[0]).toMatchObject({
			cost: 8000,
			sell: 8000,
			missingPrice: false
		});
		expect(q.byCurrency[0]).toMatchObject({ cost: 62500, sell: 62500 });
	});

	it('never sells an add-on below its cost', () => {
		const q = computeQuote({
			roe: 77,
			travellers: [
				traveller({
					addons: [
						{
							id: 'l1',
							def: sarAddon({ unitPrice: 8000 }),
							qty: 1,
							costOverride: null,
							sellPrice: 7000
						}
					]
				})
			]
		});
		expect(q.travellers[0]?.addons[0]).toMatchObject({ cost: 8000, sell: 8000, floored: true });
	});

	it('allows selling an add-on above its cost', () => {
		const q = computeQuote({
			roe: 77,
			travellers: [
				traveller({
					addons: [
						{
							id: 'l1',
							def: sarAddon({ unitPrice: 8000 }),
							qty: 1,
							costOverride: null,
							sellPrice: 9000
						}
					]
				})
			]
		});
		expect(q.travellers[0]?.addons[0]).toMatchObject({ cost: 8000, sell: 9000, floored: false });
		expect(q.byCurrency[0]?.profit).toBe(1000);
	});

	it('prices room-dependent add-ons by the traveller’s room and nightly add-ons by quantity', () => {
		const q = computeQuote({
			roe: 77,
			travellers: [
				traveller({
					room: 'Double',
					addons: [
						{
							id: 'fam',
							def: sarAddon({
								id: 'fam',
								kind: 'per_person_by_room',
								roomPrices: { Double: 4000, Triple: 2000 }
							}),
							qty: 1,
							costOverride: null,
							sellPrice: null
						},
						{
							id: 'nights',
							def: sarAddon({ id: 'n', kind: 'per_night_by_room', roomPrices: { Double: 3000 } }),
							qty: 2,
							costOverride: null,
							sellPrice: null
						}
					]
				})
			]
		});
		const lines = q.travellers[0]?.addons ?? [];
		expect(lines[0]?.cost).toBe(4000);
		expect(lines[1]?.cost).toBe(6000);
	});

	it('flags an add-on with no catalogue price, and takes a manual cost override instead', () => {
		const tent = sarAddon({ id: 'tent', unitPrice: null });
		const missing = computeQuote({
			roe: 77,
			travellers: [
				traveller({
					addons: [{ id: 'l1', def: tent, qty: 1, costOverride: null, sellPrice: null }]
				})
			]
		});
		expect(missing.travellers[0]?.addons[0]).toMatchObject({ cost: 0, missingPrice: true });

		const overridden = computeQuote({
			roe: 77,
			travellers: [
				traveller({ addons: [{ id: 'l1', def: tent, qty: 1, costOverride: 40, sellPrice: 60 }] })
			]
		});
		expect(overridden.travellers[0]?.addons[0]).toMatchObject({
			cost: 40,
			sell: 60,
			missingPrice: false
		});
	});

	it('splits the GMC across everyone in the family who takes it', () => {
		const gmc = sarAddon({ id: 'gmc', kind: 'pooled_vehicle', unitPrice: 35000, capacity: 6 });
		const q = computeQuote({
			roe: 77,
			travellers: [
				traveller({
					id: 'a',
					addons: [{ id: 'la', def: gmc, qty: 1, costOverride: null, sellPrice: null }]
				}),
				traveller({
					id: 'b',
					addons: [{ id: 'lb', def: gmc, qty: 1, costOverride: null, sellPrice: null }]
				}),
				traveller({ id: 'c' }) // does not take the GMC
			]
		});
		expect(q.travellers[0]?.addons[0]).toMatchObject({ cost: 17500, sharers: 2 });
		expect(q.travellers[1]?.addons[0]).toMatchObject({ cost: 17500, sharers: 2 });
		expect(q.travellers[2]?.addons).toEqual([]);
	});

	it('charges a lone GMC traveller the full vehicle', () => {
		const gmc = sarAddon({ id: 'gmc', kind: 'pooled_vehicle', unitPrice: 35000, capacity: 6 });
		const q = computeQuote({
			roe: 77,
			travellers: [
				traveller({ addons: [{ id: 'l', def: gmc, qty: 1, costOverride: null, sellPrice: null }] })
			]
		});
		expect(q.travellers[0]?.addons[0]).toMatchObject({ cost: 35000, sharers: 1 });
	});

	it('lets a USD traveller take a SAR add-on and totals each currency separately', () => {
		const gmcSar = sarAddon({ id: 'gmc', kind: 'pooled_vehicle', unitPrice: 35000, capacity: 6 });
		const q = computeQuote({
			roe: 77,
			travellers: [
				traveller({
					currency: 'USD',
					baseCost: 14950,
					baseSell: 15000,
					addons: [{ id: 'l', def: gmcSar, qty: 1, costOverride: null, sellPrice: null }]
				})
			]
		});
		expect(q.usd).toMatchObject({ cost: 14950, sell: 15000 });
		expect(q.byCurrency.find((c) => c.currency === 'SAR')).toMatchObject({
			cost: 35000,
			sell: 35000
		});
		// only the SAR add-on converts: 35,000 × 77
		expect(q.pkr.sell).toBe(2_695_000);
	});

	it('adds tickets in PKR on top of the converted SAR total', () => {
		const q = computeQuote({
			roe: 77,
			travellers: [
				traveller({ baseCost: 1000, baseSell: 1200, ticketCost: 335000, ticketSell: 345000 })
			]
		});
		expect(q.ticket).toEqual({ cost: 335000, sell: 345000, profit: 10000 });
		expect(q.pkr.sell).toBe(1200 * 77 + 345000);
		expect(q.pkr.cost).toBe(1000 * 77 + 335000);
	});

	it('does not drop pennies', () => {
		const q = computeQuote({
			roe: 77.5,
			travellers: [
				traveller({ baseCost: 0.1, baseSell: 0.2, addons: [] }),
				traveller({ id: 't2', baseCost: 0.2, baseSell: 0.1 })
			]
		});
		expect(q.byCurrency[0]).toMatchObject({ cost: 0.3, sell: 0.3 });
	});

	it('treats a base package with no price as zero and flags it', () => {
		const q = computeQuote({ roe: 77, travellers: [traveller({ baseCost: null, baseSell: 0 })] });
		expect(q.travellers[0]?.baseMissing).toBe(true);
	});
});
