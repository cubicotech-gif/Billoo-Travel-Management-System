import { supabase } from '$lib/supabase';
import { money, subtract, sum, toNumber } from '$lib/money';
import { SETTLE_TOLERANCE_PKR } from '$features/bookings/lifecycle';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export interface ClientReceivable {
	queryId: string;
	queryNumber: string;
	clientName: string;
	/** What the client owes: booking actual sell − discount when booked, else the query selling price. */
	selling: number;
	paid: number;
	balance: number;
}

/** Sum the paid query_payments per query id (penny-accurate). */
async function paidByQueryMap(): Promise<Map<string, number>> {
	const payments = unwrap<{ query_id: string; amount: number }[]>(
		await supabase.from('query_payments').select('query_id, amount').eq('status', 'paid')
	);
	const byQuery = new Map<string, number[]>();
	for (const p of payments) {
		const arr = byQuery.get(p.query_id) ?? [];
		arr.push(Number(p.amount));
		byQuery.set(p.query_id, arr);
	}
	const out = new Map<string, number>();
	for (const [qid, amounts] of byQuery) {
		out.set(qid, toNumber(sum(amounts.map((a) => money(a, 'PKR')))));
	}
	return out;
}

/** Booking totals keyed by query id: what the client really owes (sell − discount). */
async function owedByQueryMap(): Promise<Map<string, number>> {
	const bookings = unwrap<{ query_id: string; actual_sell_pkr: number; discount_pkr: number }[]>(
		await supabase
			.from('bookings')
			.select('query_id, actual_sell_pkr, discount_pkr')
			.eq('is_deleted', false)
	);
	const out = new Map<string, number>();
	for (const b of bookings) {
		const owed = toNumber(
			subtract(money(Number(b.actual_sell_pkr) || 0, 'PKR'), money(Number(b.discount_pkr) || 0, 'PKR'))
		);
		out.set(b.query_id, Math.max(0, owed));
	}
	return out;
}

/** Queries with money still owed by the client (owed − payments received). */
export async function listClientReceivables(): Promise<ClientReceivable[]> {
	const queries = unwrap<
		{ id: string; query_number: string; client_name: string; selling_price: number; status: string }[]
	>(
		await supabase
			.from('queries')
			.select('id, query_number, client_name, selling_price, status')
			.neq('status', 'Cancelled')
	);

	const [paidByQuery, owedByQuery] = await Promise.all([paidByQueryMap(), owedByQueryMap()]);

	return queries
		.map((q) => {
			// Prefer the booking's actual sell minus discount; fall back to the headline price.
			const selling = owedByQuery.get(q.id) ?? (Number(q.selling_price) || 0);
			const paid = paidByQuery.get(q.id) ?? 0;
			return {
				queryId: q.id,
				queryNumber: q.query_number,
				clientName: q.client_name,
				selling,
				paid,
				balance: toNumber(subtract(money(selling, 'PKR'), money(paid, 'PKR')))
			};
		})
		.filter((r) => r.balance > 0)
		.sort((a, b) => b.balance - a.balance);
}

export interface QueryFinance {
	owed: number;
	paid: number;
	balance: number;
	paidInFull: boolean;
}

/** Per-query money snapshot (owed/paid/balance), keyed by query id — for board
 *  progress bars and column totals without a fetch per card. */
export async function bookingFinanceByQuery(): Promise<Map<string, QueryFinance>> {
	const [paid, owed] = await Promise.all([paidByQueryMap(), owedByQueryMap()]);
	const out = new Map<string, QueryFinance>();
	for (const id of new Set([...owed.keys(), ...paid.keys()])) {
		const o = owed.get(id) ?? 0;
		const p = paid.get(id) ?? 0;
		const balance = toNumber(subtract(money(o, 'PKR'), money(p, 'PKR')));
		out.set(id, { owed: o, paid: p, balance: Math.max(0, balance), paidInFull: balance <= SETTLE_TOLERANCE_PKR });
	}
	return out;
}

export interface Collection {
	id: string;
	queryId: string;
	queryNumber: string;
	clientName: string;
	label: string;
	amount: number;
	date: string | null;
}

/** Recent client payments received — the money-in ledger for the finance hub. */
export async function listCollections(limit = 100): Promise<Collection[]> {
	const payments = unwrap<
		{ id: string; query_id: string; label: string; amount: number; paid_date: string | null }[]
	>(
		await supabase
			.from('query_payments')
			.select('id, query_id, label, amount, paid_date')
			.eq('status', 'paid')
			.order('paid_date', { ascending: false, nullsFirst: false })
			.limit(limit)
	);
	const queries = unwrap<{ id: string; query_number: string; client_name: string }[]>(
		await supabase.from('queries').select('id, query_number, client_name')
	);
	const ref = new Map(queries.map((q) => [q.id, q]));
	return payments.map((p) => ({
		id: p.id,
		queryId: p.query_id,
		queryNumber: ref.get(p.query_id)?.query_number ?? '—',
		clientName: ref.get(p.query_id)?.client_name ?? '—',
		label: p.label,
		amount: Number(p.amount),
		date: p.paid_date
	}));
}

export interface ProfitSummary {
	/** Σ actual sell across non-deleted bookings (PKR). */
	revenue: number;
	/** Σ actual cost (PKR). */
	cost: number;
	/** Σ discounts granted (PKR). */
	discount: number;
	/** revenue − cost − discount (PKR). */
	netProfit: number;
}

/** Realised margin across all bookings: (sell − discount) − cost. */
export async function getProfitSummary(): Promise<ProfitSummary> {
	const bookings = unwrap<
		{ actual_sell_pkr: number; actual_cost_pkr: number; discount_pkr: number }[]
	>(
		await supabase
			.from('bookings')
			.select('actual_sell_pkr, actual_cost_pkr, discount_pkr')
			.eq('is_deleted', false)
	);
	const revenue = toNumber(sum(bookings.map((b) => money(Number(b.actual_sell_pkr) || 0, 'PKR'))));
	const cost = toNumber(sum(bookings.map((b) => money(Number(b.actual_cost_pkr) || 0, 'PKR'))));
	const discount = toNumber(sum(bookings.map((b) => money(Number(b.discount_pkr) || 0, 'PKR'))));
	const netProfit = toNumber(
		subtract(subtract(money(revenue, 'PKR'), money(cost, 'PKR')), money(discount, 'PKR'))
	);
	return { revenue, cost, discount, netProfit };
}
