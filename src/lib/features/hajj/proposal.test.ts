import { describe, expect, it } from 'vitest';
import {
	AZIZIYA_NOTE,
	PAYMENT_PLAN,
	PRICE_NOTE,
	REQUIRED_DOCUMENTS,
	SEASON_LABEL,
	TERMS,
	TRAVEL_NOTES,
	exclusions,
	inclusionsFor
} from './content';
import {
	buildProposal,
	instalments,
	proposalOptionsWhatsApp,
	proposalWhatsApp,
	referenceFor,
	type ProposalInput
} from './proposal';
import type { HajjAddon, HajjCatalogue, HajjDay, HajjPackage, HajjTraveller } from './types';

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
const pkg = (id: string, cat: string, over: object = {}) =>
	({
		id,
		catalogue_id: cat,
		code: 'UB004',
		title: 'Swissotel – Medinah First',
		duration_label: '14 Days',
		start_date: '2027-05-07',
		end_date: '2027-05-19',
		has_aziziya: false,
		options: [
			{
				id: id + 'A',
				code: 'A',
				prices: [
					price(id + 'A', 'Quad', cat === 'sar' ? 54500 : 14950),
					price(id + 'A', 'Triple', cat === 'sar' ? 59500 : 16300)
				]
			},
			{ id: id + 'B', code: 'B', prices: [price(id + 'B', 'Quad', cat === 'sar' ? 51900 : 14200)] }
		],
		...over
	}) as unknown as HajjPackage;

const packages = [pkg('pS', 'sar'), pkg('pU', 'usd')];

const addon = (id: string, code: string, name: string, over: object = {}) =>
	({
		id,
		catalogue_id: 'sar',
		code,
		name,
		pricing_kind: 'per_person',
		unit_price: 8000,
		capacity: null,
		room_prices: [],
		package_codes: null,
		...over
	}) as unknown as HajjAddon;
const addons = [
	addon('kaaba', 'kaaba_view_platinum', 'Kaaba view supplement'),
	addon('qur', 'qurbani', 'Qurbani assistance', { unit_price: 750 })
];

const days: HajjDay[] = [
	{
		id: 'd1',
		package_id: 'pS',
		day_no: 1,
		date_ad: '2027-05-07',
		date_ad_end: null,
		hijri_label: '01 Zil Hajj',
		city_label: 'To Medinah',
		kind: 'stay',
		hotel_a: 'Dar Al Taqwa/Hilton',
		stars_a: 5,
		hotel_b: 'Dallah Taibah (Premier Floor)',
		stars_b: 4
	},
	{
		id: 'd2',
		package_id: 'pS',
		day_no: 2,
		date_ad: '2027-05-10',
		date_ad_end: null,
		hijri_label: '04 Zil Hajj',
		city_label: 'To Makkah',
		kind: 'stay',
		hotel_a: 'Swissotel Makkah',
		stars_a: 5,
		hotel_b: null,
		stars_b: null
	}
];

const traveller = (id: string, over: Partial<HajjTraveller> = {}): HajjTraveller =>
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

const input = (travellers: HajjTraveller[], over: Partial<ProposalInput> = {}): ProposalInput => ({
	roe: 77,
	catalogues,
	packages,
	addons,
	travellers,
	query: {
		client_name: 'Ahmed Khan',
		client_phone: '0300',
		query_number: 'QRY-20261010-0007',
		created_at: '2026-10-10T09:00:00Z'
	},
	names: { a: 'Ahmed Khan', b: 'Fatima Khan', c: 'Bilal Khan' },
	days: { pS: days },
	...over
});

describe('referenceFor', () => {
	it('matches the reference shown elsewhere in the app', () => {
		expect(
			referenceFor({ query_number: 'QRY-20261010-0007', created_at: '2026-10-10T09:00:00Z' })
		).toBe('BLO-2026-0007');
	});
});

describe('buildProposal', () => {
	it('puts travellers on the same package, option and room into one group', () => {
		const p = buildProposal(input([traveller('a'), traveller('b')]));
		expect(p.groups).toHaveLength(1);
		expect(p.groups[0]?.travellers.map((t) => t.name)).toEqual(['Ahmed Khan', 'Fatima Khan']);
		expect(p.travellerCount).toBe(2);
	});

	it('splits an exception traveller (different hotel option) into their own group', () => {
		const p = buildProposal(input([traveller('a'), traveller('b', { option_code: 'B' })]));
		expect(p.groups).toHaveLength(2);
		expect(p.groups.map((g) => g.option)).toEqual(['A', 'B']);
	});

	it('shows the Option B hotels for a Option B traveller', () => {
		const p = buildProposal(input([traveller('b', { option_code: 'B' })]));
		expect(p.groups[0]?.stays.map((s) => s.name)).toContain('Dallah Taibah (Premier Floor)');
	});

	it('lists the package, add-ons and ticket as separate priced lines', () => {
		const p = buildProposal(
			input([
				traveller('a', {
					ticket_airline: 'Saudia',
					ticket_sell_pkr: 345000,
					addons: [
						{
							id: 'l1',
							traveller_id: 'a',
							addon_id: 'kaaba',
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
			])
		);
		const lines = p.groups[0]?.travellers[0]?.lines ?? [];
		expect(lines.map((l) => [l.kind, l.amount])).toEqual([
			['package', 58400],
			['addon', 9000],
			['ticket', 345000]
		]);
		expect(p.ticketQuoted).toBe(true);
	});

	it('converts only the SAR total to PKR and keeps USD separate for a mixed family', () => {
		const p = buildProposal(
			input([traveller('a'), traveller('b', { package_id: 'pU', sell_price: 15500 })])
		);
		expect(p.totals.sar).toBe(58400);
		expect(p.totals.usd).toBe(15500);
		expect(p.totals.pkr).toBe(58400 * 77);
	});

	it('has no PKR figure for a USD-only family with no ticket', () => {
		const p = buildProposal(input([traveller('a', { package_id: 'pU', sell_price: 15500 })]));
		expect(p.totals.pkr).toBeNull();
		expect(p.totals.usd).toBe(15500);
	});

	it('notes whether Qurbani was quoted (by catalogue code, not name)', () => {
		const withQ = buildProposal(
			input([
				traveller('a', {
					addons: [
						{
							id: 'l',
							traveller_id: 'a',
							addon_id: 'qur',
							qty: 1,
							cost_override: null,
							sell_price: null,
							created_at: '',
							updated_at: '',
							pool_cost: null,
							pool_sharers: null,
							pool_vehicle: null
						}
					]
				})
			])
		);
		expect(withQ.qurbaniQuoted).toBe(true);
		expect(buildProposal(input([traveller('a')])).qurbaniQuoted).toBe(false);
	});
});

describe('client-facing rules', () => {
	// The vendor must not be named or identifiable anywhere a client reads.
	const VENDOR = /universal|crown|maxim['’]?s\b|brothers|\bUB\s?\d{3}\b|\bUHS\s?\d{3}\b/i;

	const wa = (travellers: HajjTraveller[]) =>
		proposalWhatsApp(buildProposal(input(travellers)), { validUntil: '2026-10-17' });

	it('never prints cost or margin — only selling prices', () => {
		const text = wa([traveller('a', { sell_price: 58400 })]);
		expect(text).toContain('58,400.00'); // sell
		expect(text).not.toContain('54,500'); // the vendor cost of that package
		expect(text).not.toMatch(/cost|margin|profit|commission/i);
	});

	it('names no vendor and prints no vendor package code', () => {
		expect(wa([traveller('a'), traveller('b', { option_code: 'B' })])).not.toMatch(VENDOR);
	});

	it('keeps all client wording vendor-free', () => {
		const all = [
			SEASON_LABEL,
			PRICE_NOTE,
			AZIZIYA_NOTE,
			...TERMS,
			...TRAVEL_NOTES,
			...REQUIRED_DOCUMENTS,
			...PAYMENT_PLAN.map((s) => s.label),
			...inclusionsFor({ has_aziziya: true }),
			...inclusionsFor({ has_aziziya: false }),
			...exclusions({ ticketQuoted: false, qurbaniQuoted: false })
		].join('\n');
		expect(all).not.toMatch(VENDOR);
	});
});

describe('proposalWhatsApp', () => {
	it('carries the essentials: family, dates, hotels, room, per-person prices, totals, payment plan', () => {
		const text = proposalWhatsApp(buildProposal(input([traveller('a'), traveller('b')])), {
			validUntil: '2026-10-17',
			brand: 'Billoo Travel'
		});
		expect(text).toContain('Hajj 2027 Package Proposal — Ahmed Khan');
		expect(text).toContain('2 travellers · Ref BLO-2026-0007');
		expect(text).toContain('7 May – 19 May 2027');
		expect(text).toContain('Swissotel Makkah');
		expect(text).toContain('Quad sharing · Hotel option A');
		expect(text).toContain('Maktab A Plus category');
		expect(text).toContain('👤 Ahmed Khan — SAR 58,400.00');
		// 2 × SAR 58,400 × 77
		expect(text).toContain('Total in PKR: PKR 8,993,600.00');
		expect(text).toContain('Payment: 50% at the time of booking, 50% by 15 November 2026');
		expect(text).toContain('Valid till 2026-10-17');
		expect(text.trim().endsWith('— Billoo Travel')).toBe(true);
	});

	it('states what is not included until the ticket / Qurbani are quoted', () => {
		expect(proposalWhatsApp(buildProposal(input([traveller('a')])))).toContain(
			'Not included: air ticket, Qurbani'
		);
		const full = traveller('a', {
			ticket_sell_pkr: 345000,
			addons: [
				{
					id: 'l',
					traveller_id: 'a',
					addon_id: 'qur',
					qty: 1,
					cost_override: null,
					sell_price: null,
					created_at: '',
					updated_at: '',
					pool_cost: null,
					pool_sharers: null,
					pool_vehicle: null
				}
			]
		});
		expect(proposalWhatsApp(buildProposal(input([full])))).not.toContain('Not included');
	});

	it('prints USD separately for a mixed family', () => {
		const text = proposalWhatsApp(
			buildProposal(
				input([traveller('a'), traveller('b', { package_id: 'pU', sell_price: 15500 })])
			)
		);
		expect(text).toContain('Total in USD: USD 15,500.00 (payable separately)');
	});
});

describe('proposalOptionsWhatsApp', () => {
	const one = buildProposal(input([traveller('a')]));
	const two = buildProposal(input([traveller('a'), traveller('b')]));

	it('a single option reads exactly like a plain proposal', () => {
		expect(proposalOptionsWhatsApp([{ title: 'Economy', proposal: one }])).toBe(
			proposalWhatsApp(one)
		);
	});

	it('lists every option with its own total, then one shared closing', () => {
		const text = proposalOptionsWhatsApp(
			[
				{ title: 'Economy', proposal: one },
				{ title: 'Family', proposal: two }
			],
			{ validUntil: '2026-10-17' }
		);
		expect(text).toContain('2 options');
		expect(text).toContain('Option 1 — Economy');
		expect(text).toContain('Option 2 — Family');
		expect(text).toContain('Total — Economy');
		expect(text).toContain('Total — Family');
		expect(text.match(/Reply to confirm/g)).toHaveLength(1);
		expect(text).toContain('Valid till 2026-10-17');
	});

	it('is empty with no options', () => {
		expect(proposalOptionsWhatsApp([])).toBe('');
	});
});

describe('instalments', () => {
	it('splits a PKR total 50 / 50', () => {
		const out = instalments({ pkr: 9_000_000, usd: null });
		expect(out.map((i) => i.percent)).toEqual([50, 50]);
		expect(out[0]?.amounts).toEqual([{ currency: 'PKR', amount: 4_500_000 }]);
		expect(out[1]?.amounts).toEqual([{ currency: 'PKR', amount: 4_500_000 }]);
	});

	it('splits PKR and USD independently for a mixed family', () => {
		const out = instalments({ pkr: 4_496_800, usd: 15_500 });
		expect(out[0]?.amounts).toEqual([
			{ currency: 'PKR', amount: 2_248_400 },
			{ currency: 'USD', amount: 7_750 }
		]);
	});

	it('always adds up exactly, even with an odd cent', () => {
		const out = instalments({ pkr: null, usd: 100.01 });
		const sum = out.reduce((a, i) => a + Math.round((i.amounts[0]?.amount ?? 0) * 100), 0);
		expect(sum).toBe(10001);
	});

	it('is empty-amount when nothing is quoted yet', () => {
		expect(instalments({ pkr: null, usd: null }).every((i) => i.amounts.length === 0)).toBe(true);
	});
});

describe('content', () => {
	it('adds Aziziya lines only to Aziziya packages', () => {
		expect(inclusionsFor({ has_aziziya: true }).join(' ')).toMatch(/Aziziya/);
		expect(inclusionsFor({ has_aziziya: false }).join(' ')).not.toMatch(/Aziziya/);
	});

	it('drops the ticket / Qurbani exclusions once they are quoted', () => {
		expect(exclusions({ ticketQuoted: false, qurbaniQuoted: false })).toEqual(
			expect.arrayContaining(['Air ticket', 'Qurbani'])
		);
		const quoted = exclusions({ ticketQuoted: true, qurbaniQuoted: true });
		expect(quoted).not.toContain('Air ticket');
		expect(quoted).not.toContain('Qurbani');
	});

	it('splits the payment plan 50 / 50', () => {
		expect(PAYMENT_PLAN.map((s) => s.percent)).toEqual([50, 50]);
	});
});
