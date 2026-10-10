import type { HajjTravellerAddonRow } from './types';

// A readable report of the settled GMC vehicles: who is in each, and what each
// pays. Built from the pool_* columns that settlement writes (see settlement.ts).

export interface PoolOccupant {
	lineId: string;
	travellerId: string;
	queryId: string;
	queryNumber: string;
	clientName: string;
	traveller: string;
	cost: number;
}

export interface PoolVehicle {
	vehicle: string;
	scope: 'family' | 'shared';
	currency: string;
	sharers: number;
	occupants: PoolOccupant[];
}

export interface PoolReportSource {
	lines: HajjTravellerAddonRow[];
	travellers: { id: string; query_id: string }[];
	queries: { id: string; query_number: string; client_name: string }[];
	/** Display name per traveller id. */
	names: Record<string, string>;
}

/** Group settled lines into vehicles, shared pools first, then families, each in order. */
export function poolReport(src: PoolReportSource): PoolVehicle[] {
	const queryOf = new Map(src.travellers.map((t) => [t.id, t.query_id]));
	const queryById = new Map(src.queries.map((q) => [q.id, q]));

	const byVehicle = new Map<string, PoolVehicle>();
	for (const l of src.lines) {
		if (!l.pool_vehicle || l.pool_cost === null) continue;
		const queryId = queryOf.get(l.traveller_id) ?? '';
		const q = queryById.get(queryId);
		let v = byVehicle.get(l.pool_vehicle);
		if (!v) {
			const [currency = ''] = l.pool_vehicle.split('-');
			v = {
				vehicle: l.pool_vehicle,
				scope: /-F\d+$/.test(l.pool_vehicle) ? 'family' : 'shared',
				currency,
				sharers: l.pool_sharers ?? 0,
				occupants: []
			};
			byVehicle.set(l.pool_vehicle, v);
		}
		v.occupants.push({
			lineId: l.id,
			travellerId: l.traveller_id,
			queryId,
			queryNumber: q?.query_number ?? '',
			clientName: q?.client_name ?? '',
			traveller: src.names[l.traveller_id] ?? 'Traveller',
			cost: Number(l.pool_cost)
		});
	}

	const rank = (v: PoolVehicle) => (v.scope === 'shared' ? 0 : 1);
	const num = (v: PoolVehicle) => Number(v.vehicle.replace(/\D+/g, '')) || 0;
	return [...byVehicle.values()].sort(
		(a, b) => a.currency.localeCompare(b.currency) || rank(a) - rank(b) || num(a) - num(b)
	);
}
