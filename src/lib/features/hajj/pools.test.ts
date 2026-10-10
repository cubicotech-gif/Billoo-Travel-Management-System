import { describe, expect, it } from 'vitest';
import { poolReport } from './pools';
import type { HajjTravellerAddonRow } from './types';

const line = (
	id: string,
	traveller: string,
	vehicle: string | null,
	cost: number | null,
	sharers = 2
): HajjTravellerAddonRow =>
	({
		id,
		traveller_id: traveller,
		addon_id: 'g',
		qty: 1,
		cost_override: null,
		sell_price: null,
		pool_cost: cost,
		pool_sharers: sharers,
		pool_vehicle: vehicle,
		created_at: '',
		updated_at: ''
	}) as HajjTravellerAddonRow;

describe('poolReport', () => {
	const base = {
		travellers: [
			{ id: 't1', query_id: 'q1' },
			{ id: 't2', query_id: 'q2' },
			{ id: 't3', query_id: 'q3' },
			{ id: 't4', query_id: 'q3' }
		],
		queries: [
			{ id: 'q1', query_number: 'QRY-1', client_name: 'Ahmed' },
			{ id: 'q2', query_number: 'QRY-2', client_name: 'Sara' },
			{ id: 'q3', query_number: 'QRY-3', client_name: 'Khan family' }
		],
		names: { t1: 'Ahmed', t2: 'Sara', t3: 'Bilal', t4: 'Zara' }
	};

	it('groups settled lines into vehicles with their occupants', () => {
		const out = poolReport({
			...base,
			lines: [line('a', 't1', 'SAR-1', 17500), line('b', 't2', 'SAR-1', 17500)]
		});
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({
			vehicle: 'SAR-1',
			scope: 'shared',
			currency: 'SAR',
			sharers: 2
		});
		expect(out[0]?.occupants.map((o) => [o.traveller, o.clientName, o.cost])).toEqual([
			['Ahmed', 'Ahmed', 17500],
			['Sara', 'Sara', 17500]
		]);
	});

	it('marks a family vehicle and lists shared pools before families', () => {
		const out = poolReport({
			...base,
			lines: [
				line('c', 't3', 'SAR-F1', 17500),
				line('d', 't4', 'SAR-F1', 17500),
				line('a', 't1', 'SAR-1', 35000, 1)
			]
		});
		expect(out.map((v) => [v.vehicle, v.scope])).toEqual([
			['SAR-1', 'shared'],
			['SAR-F1', 'family']
		]);
	});

	it('skips lines that are not settled', () => {
		expect(poolReport({ ...base, lines: [line('x', 't1', null, null)] })).toEqual([]);
	});

	it('keeps USD vehicles apart from SAR', () => {
		const out = poolReport({
			...base,
			lines: [line('a', 't1', 'USD-1', 9600, 1), line('b', 't2', 'SAR-1', 35000, 1)]
		});
		expect(out.map((v) => v.currency)).toEqual(['SAR', 'USD']);
	});
});
