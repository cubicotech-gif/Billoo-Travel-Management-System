import { describe, expect, it } from 'vitest';
import { buildQuote } from './quote';
import { isLive, makeSnapshot, optionTitle, proposalRow, snapshotToTravellers } from './snapshot';
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
		id: 'pS',
		catalogue_id: 'sar',
		code: 'UB004',
		options: [{ id: 'oS', code: 'A', prices: [price('oS', 'Quad', 54500)] }]
	}
] as unknown as HajjPackage[];

const gmc = {
	id: 'gmc',
	catalogue_id: 'sar',
	pricing_kind: 'pooled_vehicle',
	unit_price: 35000,
	capacity: 6,
	room_prices: []
} as unknown as HajjAddon;

const line = (traveller_id: string) => ({
	id: `line-${traveller_id}`,
	traveller_id,
	addon_id: 'gmc',
	qty: 1,
	cost_override: null,
	sell_price: null,
	created_at: '',
	updated_at: '',
	pool_cost: null,
	pool_sharers: null,
	pool_vehicle: null
});

const traveller = (id: string, over: Partial<HajjTraveller> = {}): HajjTraveller =>
	({
		id,
		query_id: 'q',
		passenger_id: `p-${id}`,
		is_lead: id === 'a',
		package_id: 'pS',
		option_code: 'A',
		room_type: 'Quad',
		sell_price: 56000,
		ticket_airline: null,
		ticket_cost_pkr: 0,
		ticket_sell_pkr: 0,
		notes: null,
		sort_order: 0,
		mehram_traveller_id: null,
		addons: [],
		...over
	}) as HajjTraveller;

const data = (travellers: HajjTraveller[]) => ({
	roe: 77,
	catalogues,
	packages,
	addons: [gmc],
	travellers
});

describe('hajj proposal snapshots', () => {
	it('round-trips: a snapshot prices exactly like the working copy it froze', () => {
		const d = data([
			traveller('a', { addons: [line('a')], ticket_sell_pkr: 90000, ticket_cost_pkr: 80000 }),
			traveller('b', { addons: [line('b')], mehram_traveller_id: 'a', mehram_relation: 'Husband' })
		]);
		const before = buildQuote(d);
		const snap = makeSnapshot(d, 280);
		const after = buildQuote({ ...d, travellers: snapshotToTravellers(snap, 'q') });

		expect(after.pkr.sell).toBe(before.pkr.sell);
		expect(after.byCurrency).toEqual(before.byCurrency);
		expect(snap.usd_rate).toBe(280);
		expect(snap.travellers[1]?.mehram_ref).toBe('a');
	});

	it('freezes add-on selling prices (sell-at-cost and pooled shares become fixed)', () => {
		const d = data([traveller('a', { addons: [line('a')] }), traveller('b', { addons: [line('b')] })]);
		const snap = makeSnapshot(d, null);
		// 35,000 vehicle split across two sharers
		expect(snap.travellers.map((t) => t.addons[0]?.sell_price)).toEqual([17500, 17500]);
	});

	it('freezes other services too, and old snapshots without them still load', () => {
		const d = data([
			traveller('a', {
				extras: [
					{ id: 'x', traveller_id: 'a', label: 'Wheelchair', currency: 'SAR', cost: 200, sell_price: 100, sort_order: 0, created_at: '', updated_at: '' }
				]
			})
		]);
		const snap = makeSnapshot(d, null);
		// sold at cost, never below
		expect(snap.travellers[0]?.extras).toEqual([{ label: 'Wheelchair', currency: 'SAR', cost: 200, sell_price: 200 }]);
		const back = snapshotToTravellers(snap, 'q');
		expect(back[0]?.extras?.[0]).toMatchObject({ label: 'Wheelchair', sell_price: 200 });
		expect(buildQuote({ ...d, travellers: back }).pkr.sell).toBe((56000 + 200) * 77);

		delete snap.travellers[0]!.extras;
		expect(snapshotToTravellers(snap, 'q')[0]?.extras).toEqual([]);
	});

	it('does not change when the working copy is edited afterwards', () => {
		const d = data([traveller('a')]);
		const snap = makeSnapshot(d, null);
		d.travellers[0]!.sell_price = 99999;
		expect(snap.travellers[0]?.sell_price).toBe(56000);
	});

	it('builds the row the list needs: totals, count, label, validity', () => {
		const d = data([traveller('a'), traveller('b')]);
		const row = proposalRow('q', d, null, { label: '  Economy ', validUntil: '2026-12-01' });
		expect(row).toMatchObject({
			query_id: 'q',
			label: 'Economy',
			traveller_count: 2,
			total_sell_pkr: 2 * 56000 * 77,
			total_sell_usd: null,
			valid_until: '2026-12-01'
		});
		// 2 × (56,000 sell − 54,500 cost) SAR @ 77, no commission set
		expect(row.profit_pkr).toBe(2 * 1500 * 77);
	});

	it('titles and filters options', () => {
		expect(optionTitle({ label: null, version: 2 })).toBe('Option 2');
		expect(optionTitle({ label: ' Gold ', version: 2 })).toBe('Gold');
		expect(isLive({ status: 'sent' })).toBe(true);
		expect(isLive({ status: 'archived' })).toBe(false);
		expect(isLive({ status: 'rejected' })).toBe(false);
	});
});
