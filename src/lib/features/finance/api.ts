import { supabase } from '$lib/supabase';
import { add, money, subtract, sum, toNumber } from '$lib/money';
import type { Currency, QuotationLineType } from '$lib/database.types';
import { ratesOf, toPkr } from '$features/bookings/totals';
import { SETTLE_TOLERANCE_PKR } from '$features/bookings/lifecycle';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

/** Penny-safe add of two PKR amounts (never raw + on money). */
const addN = (a: number, b: number) => toNumber(add(money(a, 'PKR'), money(b, 'PKR')));
const subN = (a: number, b: number) => toNumber(subtract(money(a, 'PKR'), money(b, 'PKR')));

export interface ClientReceivable {
	queryId: string;
	queryNumber: string;
	clientName: string;
	/** What the client owes: booking actual sell − discount when booked, else the query selling price. */
	selling: number;
	paid: number;
	balance: number;
	travelDate: string | null;
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
		{
			id: string;
			query_number: string;
			client_name: string;
			selling_price: number;
			status: string;
			travel_date: string | null;
		}[]
	>(
		await supabase
			.from('queries')
			.select('id, query_number, client_name, selling_price, status, travel_date')
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
				balance: toNumber(subtract(money(selling, 'PKR'), money(paid, 'PKR'))),
				travelDate: q.travel_date
			};
		})
		// Within the round-off tolerance counts as settled — don't list pennies.
		.filter((r) => r.balance > SETTLE_TOLERANCE_PKR)
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

/**
 * All client payments received — the money-in ledger + the source for the
 * Collected total. Uncapped (so the total is never under-reported) and excludes
 * payments on Cancelled queries.
 */
export async function listCollections(): Promise<Collection[]> {
	const payments = unwrap<
		{ id: string; query_id: string; label: string; amount: number; paid_date: string | null }[]
	>(
		await supabase
			.from('query_payments')
			.select('id, query_id, label, amount, paid_date')
			.eq('status', 'paid')
			.order('paid_date', { ascending: false, nullsFirst: false })
	);
	const queries = unwrap<{ id: string; query_number: string; client_name: string; status: string }[]>(
		await supabase.from('queries').select('id, query_number, client_name, status')
	);
	const ref = new Map(queries.map((q) => [q.id, q]));
	return payments
		.filter((p) => ref.get(p.query_id)?.status !== 'Cancelled')
		.map((p) => ({
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
	/** netProfit ÷ (revenue − discount) × 100. */
	marginPct: number;
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
	const netRevenue = subN(revenue, discount);
	const marginPct = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
	return { revenue, cost, discount, netProfit, marginPct };
}

// --- Per-passenger financials --------------------------------------------

export interface PassengerFinanceRow {
	key: string;
	passengerId: string | null;
	name: string;
	trips: number;
	billed: number;
	paid: number;
	balance: number;
	profit: number;
}

/** Every passenger with billed / paid / balance / profit rolled up across their
 *  (non-cancelled) queries. Queries without a passenger link stand on their own. */
export async function listPassengerFinance(): Promise<PassengerFinanceRow[]> {
	const queries = unwrap<
		{ id: string; passenger_id: string | null; client_name: string; selling_price: number }[]
	>(
		await supabase
			.from('queries')
			.select('id, passenger_id, client_name, selling_price')
			.neq('status', 'Cancelled')
	);
	const bookings = unwrap<
		{ query_id: string; actual_sell_pkr: number; actual_cost_pkr: number; discount_pkr: number }[]
	>(
		await supabase
			.from('bookings')
			.select('query_id, actual_sell_pkr, actual_cost_pkr, discount_pkr')
			.eq('is_deleted', false)
	);
	const bookingByQuery = new Map(bookings.map((b) => [b.query_id, b]));
	const paidByQuery = await paidByQueryMap();

	const groups = new Map<string, PassengerFinanceRow>();
	for (const q of queries) {
		const key = q.passenger_id ?? `q:${q.id}`; // unlinked queries stand alone
		const b = bookingByQuery.get(q.id);
		const owed = b
			? Math.max(0, subN(Number(b.actual_sell_pkr) || 0, Number(b.discount_pkr) || 0))
			: Number(q.selling_price) || 0;
		const paid = paidByQuery.get(q.id) ?? 0;
		const profit = b
			? subN(subN(Number(b.actual_sell_pkr) || 0, Number(b.actual_cost_pkr) || 0), Number(b.discount_pkr) || 0)
			: 0;
		const g =
			groups.get(key) ??
			{ key, passengerId: q.passenger_id, name: q.client_name, trips: 0, billed: 0, paid: 0, balance: 0, profit: 0 };
		g.trips += 1;
		g.billed = addN(g.billed, owed);
		g.paid = addN(g.paid, paid);
		g.profit = addN(g.profit, profit);
		groups.set(key, g);
	}
	return [...groups.values()]
		.map((g) => ({ ...g, balance: Math.max(0, subN(g.billed, g.paid)) }))
		.sort((a, b) => b.billed - a.billed);
}

// --- Per-service financials ----------------------------------------------

export interface ServiceFinanceRow {
	itemId: string;
	lineType: QuotationLineType;
	label: string;
	queryId: string | null;
	clientName: string;
	vendorId: string | null;
	vendorName: string | null;
	sellPkr: number;
	costPkr: number;
	marginPkr: number;
	vendorPaid: number;
	vendorBalance: number;
}

/** Every booked service across all bookings, in PKR: sell, cost, margin, vendor,
 *  and what's been paid to that vendor for this specific service. */
export async function listServiceFinance(): Promise<ServiceFinanceRow[]> {
	const bookings = unwrap<{ id: string; query_id: string | null; roe: number; usd_rate: number | null }[]>(
		await supabase.from('bookings').select('id, query_id, roe, usd_rate').eq('is_deleted', false)
	);
	if (bookings.length === 0) return [];
	const bookingById = new Map(bookings.map((b) => [b.id, b]));

	const items = unwrap<
		{
			id: string;
			booking_id: string;
			line_type: QuotationLineType;
			label: string;
			vendor_id: string | null;
			currency: Currency;
			actual_cost: number;
			actual_sell: number;
		}[]
	>(
		await supabase
			.from('booking_items')
			.select('id, booking_id, line_type, label, vendor_id, currency, actual_cost, actual_sell')
			.in('booking_id', [...bookingById.keys()])
	);

	const queryIds = [...new Set(bookings.map((b) => b.query_id).filter((x): x is string => !!x))];
	const queries = queryIds.length
		? unwrap<{ id: string; client_name: string }[]>(
				await supabase.from('queries').select('id, client_name').in('id', queryIds)
			)
		: [];
	const clientByQuery = new Map(queries.map((q) => [q.id, q.client_name]));

	const vendors = unwrap<{ id: string; name: string }[]>(await supabase.from('vendors').select('id, name'));
	const vendorName = new Map(vendors.map((v) => [v.id, v.name]));

	const vpays = unwrap<{ booking_item_id: string | null; amount: number }[]>(
		await supabase.from('vendor_payments').select('booking_item_id, amount')
	);
	const paidByItem = new Map<string, number>();
	for (const p of vpays) {
		if (p.booking_item_id) paidByItem.set(p.booking_item_id, addN(paidByItem.get(p.booking_item_id) ?? 0, Number(p.amount)));
	}

	return items
		.map((i) => {
			const b = bookingById.get(i.booking_id)!;
			const rates = ratesOf(b);
			const sellPkr = toNumber(toPkr(Number(i.actual_sell), i.currency, rates));
			const costPkr = toNumber(toPkr(Number(i.actual_cost), i.currency, rates));
			const vendorPaid = paidByItem.get(i.id) ?? 0;
			return {
				itemId: i.id,
				lineType: i.line_type,
				label: i.label,
				queryId: b.query_id,
				clientName: b.query_id ? (clientByQuery.get(b.query_id) ?? '—') : '—',
				vendorId: i.vendor_id,
				vendorName: i.vendor_id ? (vendorName.get(i.vendor_id) ?? null) : null,
				sellPkr,
				costPkr,
				marginPkr: subN(sellPkr, costPkr),
				vendorPaid,
				vendorBalance: Math.max(0, subN(costPkr, vendorPaid))
			};
		})
		.sort((a, b) => b.sellPkr - a.sellPkr);
}
