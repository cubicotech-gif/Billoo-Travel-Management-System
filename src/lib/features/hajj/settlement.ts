import { money, multiply, subtract, toNumber } from '$lib/money';
import { PAYMENT_PLAN } from './content';
import { settleGmc, type GmcAssignment, type GmcLine } from './gmc';
import type { HajjAddon, HajjCatalogue, HajjTravellerAddonRow } from './types';

// Pure planning for the DB-touching booking actions (see ./booking.ts), so the
// rules are unit-tested without a database.

// --- GMC settlement ---------------------------------------------------------

export interface SettlementSource {
	/** Every traveller-addon row that takes a pooled-vehicle add-on. */
	lines: HajjTravellerAddonRow[];
	travellers: { id: string; query_id: string }[];
	queries: {
		id: string;
		status: string;
		stage_changed_at: string | null;
		created_at: string;
		is_deleted: boolean;
	}[];
	addons: HajjAddon[];
	catalogues: HajjCatalogue[];
}

export interface PoolChange {
	lineId: string;
	queryId: string;
	pool_cost: number | null;
	pool_sharers: number | null;
	pool_vehicle: string | null;
}

/**
 * Work out which GMC lines need their settled share written or cleared.
 * Confirmed = the query is in the Booking stage (and not deleted). Lines on
 * unconfirmed queries are cleared, so they go back to the quote-time split.
 * A line with a manual cost override is never pooled.
 */
export function planSettlement(src: SettlementSource): {
	changes: PoolChange[];
	assignments: GmcAssignment[];
} {
	const catById = new Map(src.catalogues.map((c) => [c.id, c]));
	const addonById = new Map(src.addons.map((a) => [a.id, a]));
	const queryByTraveller = new Map(src.travellers.map((t) => [t.id, t.query_id]));
	const queryById = new Map(src.queries.map((q) => [q.id, q]));

	const poolLines: GmcLine[] = [];
	for (const l of src.lines) {
		if (l.cost_override !== null) continue; // manual cost — not pooled
		const addon = addonById.get(l.addon_id);
		const queryId = queryByTraveller.get(l.traveller_id);
		const q = queryId ? queryById.get(queryId) : undefined;
		if (!addon || addon.unit_price === null || !queryId || !q) continue;
		if (q.status !== 'Booking' || q.is_deleted) continue;
		const currency = catById.get(addon.catalogue_id)?.currency;
		if (!currency) continue;
		poolLines.push({
			lineId: l.id,
			queryId,
			currency,
			vehiclePrice: Number(addon.unit_price),
			capacity: addon.capacity ?? 6,
			confirmedAt: q.stage_changed_at ?? q.created_at
		});
	}

	const assignments = settleGmc(poolLines);
	const assigned = new Map(assignments.map((a) => [a.lineId, a]));

	const changes: PoolChange[] = [];
	for (const l of src.lines) {
		const queryId = queryByTraveller.get(l.traveller_id) ?? '';
		const a = assigned.get(l.id);
		const next = a
			? { pool_cost: a.cost, pool_sharers: a.sharers, pool_vehicle: a.vehicle }
			: { pool_cost: null, pool_sharers: null, pool_vehicle: null };
		const same =
			(l.pool_cost === null ? null : Number(l.pool_cost)) === next.pool_cost &&
			l.pool_sharers === next.pool_sharers &&
			l.pool_vehicle === next.pool_vehicle;
		if (!same) changes.push({ lineId: l.id, queryId, ...next });
	}
	return { changes, assignments };
}

// --- 50 / 50 payment schedule ----------------------------------------------

export interface PlannedPayment {
	label: string;
	amount: number;
	due_date: string;
}

/**
 * The scheduled instalments for a payable PKR total: each step its percentage,
 * the last one the remainder so the parts always add up exactly.
 */
export function planPayments(payablePkr: number, today: string): PlannedPayment[] {
	if (payablePkr <= 0) return [];
	let allocated = money(0, 'PKR');
	return PAYMENT_PLAN.map((step, i) => {
		const last = i === PAYMENT_PLAN.length - 1;
		const amount = last
			? subtract(money(payablePkr, 'PKR'), allocated)
			: multiply(money(payablePkr, 'PKR'), step.percent / 100);
		allocated = allocated.add(amount);
		return {
			label: `${step.percent}% — ${step.label}`,
			amount: toNumber(amount),
			due_date: step.due === 'booking' ? today : step.due
		};
	});
}

/** Still the auto-generated 50/50 plan, with nothing paid against it. */
export function isUntouchedPlan(
	payments: { status: string; label: string }[],
	steps: number
): boolean {
	return (
		payments.length === steps &&
		payments.every((p) => p.status !== 'paid' && /^\d+% — /.test(p.label))
	);
}
