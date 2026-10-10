import { getQuery, updateQuery } from '$features/queries/api';
import type { Query } from '$features/queries/types';
import { supabase } from '$lib/supabase';
import { createPayment, listPayments, updatePayment } from '$features/payments/api';
import { getBookingForQuery } from '$features/bookings/api';
import { reconcileBookingLifecycle } from '$features/bookings/lifecycle-actions';
import {
	getQuoteRow,
	listAddonLines,
	listAllTravellerRefs,
	listAddons,
	listCatalogues,
	listPackages,
	listQueryRefs,
	listTravellerRefs,
	listTravellers,
	setLinePool
} from './api';
import { financeBridge, type FinanceBridge } from './bridge';
import { buildQuote } from './quote';
import { isUntouchedPlan, planPayments, planSettlement } from './settlement';
import { DEFAULT_HAJJ_ROE } from './types';

// The DB-touching side of a Hajj booking: keep the PKR-based finance rows in
// step with the quote, settle the shared GMC across clients, and lay down the
// 50/50 payment schedule. The pure rules live in bridge.ts / settlement.ts.
// Everything here is best-effort and serialised, so quick edits can't interleave.

let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
	const run = chain.then(fn, fn);
	chain = run.catch(() => undefined);
	return run;
}

// queries.selling_price / cost_price are NUMERIC(10,2) in the baseline schema.
const QUERY_MONEY_MAX = 99_999_999.99;

/** Settle the shared GMC across all confirmed clients; returns the queries whose share changed. */
async function settleGmcNow(): Promise<string[]> {
	const [addons, catalogues] = await Promise.all([listAddons(), listCatalogues()]);
	const pooled = addons.filter((a) => a.pricing_kind === 'pooled_vehicle');
	const lines = await listAddonLines(pooled.map((a) => a.id));
	if (lines.length === 0) return [];
	const travellers = await listTravellerRefs([...new Set(lines.map((l) => l.traveller_id))]);
	const queries = await listQueryRefs([...new Set(travellers.map((t) => t.query_id))]);

	const { changes } = planSettlement({ lines, travellers, queries, addons, catalogues });
	await Promise.all(changes.map((c) => setLinePool(c.lineId, c)));
	return [...new Set(changes.map((c) => c.queryId))];
}

/**
 * Write the family's PKR totals where the rest of the app reads them: the
 * query's headline price, its trip dates and head-count, and — once it is in the
 * Booking stage — a `bookings` row, so finance, receivables and the booking
 * lifecycle work unchanged.
 */
async function syncFinanceNow(
	queryId: string
): Promise<(FinanceBridge & { status: string }) | null> {
	const query = await getQuery(queryId);
	if (!query || query.package_type !== 'Hajj') return null;

	const [quote, travellers, packages, addons, catalogues] = await Promise.all([
		getQuoteRow(queryId),
		listTravellers(queryId),
		listPackages(),
		listAddons(),
		listCatalogues()
	]);
	const roe = Number(quote?.roe ?? DEFAULT_HAJJ_ROE);
	const usdRate = quote?.usd_rate == null ? null : Number(quote.usd_rate);

	const result = buildQuote({ roe, travellers, packages, addons, catalogues });
	const bridge = financeBridge(result, usdRate);

	const pkgs = travellers
		.map((t) => packages.find((p) => p.id === t.package_id))
		.filter((p): p is NonNullable<typeof p> => !!p);
	const patch: Parameters<typeof updateQuery>[1] = {};
	if (bridge.sellPkr <= QUERY_MONEY_MAX && bridge.costPkr <= QUERY_MONEY_MAX) {
		patch.selling_price = bridge.sellPkr;
		patch.cost_price = Math.max(0, bridge.costPkr);
	} else
		console.warn('[hajj] family total exceeds the query price column; headline price not updated');
	if (travellers.length > 0) {
		patch.adults = travellers.length;
		patch.children = 0;
		patch.infants = 0;
	}
	if (pkgs.length > 0) {
		patch.travel_date = pkgs.map((p) => p.start_date).sort()[0] ?? null;
		patch.return_date =
			pkgs
				.map((p) => p.end_date)
				.sort()
				.at(-1) ?? null;
	}
	await updateQuery(queryId, patch);

	if (query.status === 'Booking') {
		await ensurePaymentPlanNow(queryId, bridge.sellPkr);
		const row = {
			roe,
			usd_rate: usdRate,
			quoted_sell_pkr: bridge.sellPkr,
			quoted_cost_pkr: bridge.costPkr,
			actual_sell_pkr: bridge.sellPkr,
			actual_cost_pkr: bridge.costPkr,
			profit_pkr: bridge.profitPkr
		};
		const existing = await getBookingForQuery(queryId);
		const { error } = existing
			? await supabase.from('bookings').update(row).eq('id', existing.id)
			: await supabase.from('bookings').insert({ query_id: queryId, ...row });
		if (error) throw new Error(error.message);
	}
	return { ...bridge, status: query.status };
}

/**
 * Lay down the 50/50 schedule when the booking has none yet. While none of the
 * instalments has been paid, keep them in step with the payable total (it moves
 * when add-ons or the shared GMC change); once any payment is recorded — or if
 * staff built their own schedule — it is left alone.
 */
async function ensurePaymentPlanNow(queryId: string, payablePkr: number): Promise<void> {
	const existing = await listPayments(queryId);
	const today = new Date().toISOString().slice(0, 10);
	const plan = planPayments(payablePkr, today);

	if (existing.length === 0) {
		for (const p of plan)
			await createPayment({
				query_id: queryId,
				label: p.label,
				amount: p.amount,
				due_date: p.due_date
			});
		return;
	}
	if (!isUntouchedPlan(existing, plan.length)) return;
	const ordered = [...existing].sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
	for (const [i, p] of ordered.entries()) {
		const target = plan[i]?.amount;
		if (target !== undefined && Number(p.amount) !== target)
			await updatePayment(p.id, { amount: target });
	}
}

// --- Entry points -----------------------------------------------------------

/** Re-sync every Hajj query that already has a booking (e.g. after a commission change). */
export function resyncAllConfirmedHajj(): Promise<void> {
	return serial(async () => {
		const refs = await listAllTravellerRefs();
		const queries = await listQueryRefs([...new Set(refs.map((r) => r.query_id))]);
		for (const q of queries)
			if (q.status === 'Booking' && !q.is_deleted) await syncFinanceNow(q.id);
	});
}

export function settleAllGmc(): Promise<string[]> {
	return serial(settleGmcNow);
}

export function syncHajjFinance(queryId: string) {
	return serial(() => syncFinanceNow(queryId));
}

/**
 * After the quote changes (traveller / add-on / ROE edit): refresh the finance
 * figures, and — if confirmed — re-settle the GMC pool, which can move other
 * clients' shares too.
 */
export function afterHajjEdit(queryId: string): Promise<void> {
	return serial(async () => {
		const first = await syncFinanceNow(queryId);
		if (!first) return;
		if (first.status === 'Booking') {
			const affected = await settleGmcNow();
			for (const id of new Set([queryId, ...affected])) await syncFinanceNow(id);
			await reconcileBookingLifecycle(queryId);
		}
	});
}

/** A Hajj query moved stage: settle the pool, refresh money, start the payment schedule. */
export function onHajjStatusChange(q: Pick<Query, 'id' | 'status'>): Promise<void> {
	return serial(async () => {
		const affected = await settleGmcNow();
		let mine: Awaited<ReturnType<typeof syncFinanceNow>> = null;
		for (const id of new Set([q.id, ...affected])) {
			const r = await syncFinanceNow(id);
			if (id === q.id) mine = r;
		}
		if (q.status === 'Booking' && mine) await reconcileBookingLifecycle(q.id);
	});
}
