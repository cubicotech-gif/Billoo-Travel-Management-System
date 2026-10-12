import { money, subtract, sum, toNumber } from '$lib/money';
import { buildQuote, type QuoteData } from './quote';
import type { HajjCurrency, HajjTraveller } from './types';

// What we owe the vendor. The vendor's price list is OUR COST, so the amount
// payable is the catalogue cost of every confirmed (Booking-stage) traveller —
// base package plus add-ons, GMC at its settled share — kept per currency (USD
// and SAR are never merged). Tickets are ours, not the vendor's, and commission
// is money the vendor pays us (tracked separately), so neither is netted here.

export interface PayableQuery {
	id: string;
	query_number: string;
	client_name: string;
	status: string;
	is_deleted: boolean;
}

export interface QueryPayable {
	queryId: string;
	queryNumber: string;
	client: string;
	travellers: number;
	owed: Partial<Record<HajjCurrency, number>>;
	paid: Partial<Record<HajjCurrency, number>>;
	balance: Partial<Record<HajjCurrency, number>>;
}

export interface PayableLine {
	currency: HajjCurrency;
	owed: number;
	/** Every payment in this currency, allocated to a query or not. */
	paid: number;
	/** Paid but not tied to any booking. */
	unallocated: number;
	/** owed − paid; negative = we have paid the vendor more than we owe. */
	outstanding: number;
}

export interface VendorPaymentLike {
	amount: number;
	currency: HajjCurrency;
	query_id: string | null;
}

const CURRENCIES: HajjCurrency[] = ['USD', 'SAR'];
const total = (xs: number[], cur: HajjCurrency) =>
	toNumber(sum(xs.map((x) => money(x, cur)), cur));

/** Vendor cost per confirmed query, in each currency used. */
export function costByQuery(
	data: Omit<QuoteData, 'travellers' | 'roe'> & {
		travellers: HajjTraveller[];
		queries: PayableQuery[];
	}
): { query: PayableQuery; travellers: number; cost: Partial<Record<HajjCurrency, number>> }[] {
	const byQuery = new Map<string, HajjTraveller[]>();
	for (const t of data.travellers) {
		const list = byQuery.get(t.query_id) ?? [];
		list.push(t);
		byQuery.set(t.query_id, list);
	}
	return data.queries
		.filter((q) => q.status === 'Booking' && !q.is_deleted && byQuery.has(q.id))
		.map((q) => {
			const travellers = byQuery.get(q.id) ?? [];
			// ROE only affects the PKR view; costs per currency are independent of it.
			const result = buildQuote({ ...data, roe: 1, travellers });
			const cost: Partial<Record<HajjCurrency, number>> = {};
			for (const c of result.byCurrency) cost[c.currency] = c.cost;
			return { query: q, travellers: travellers.length, cost };
		});
}

export function payablesSummary(
	rows: ReturnType<typeof costByQuery>,
	payments: VendorPaymentLike[]
): { lines: PayableLine[]; queries: QueryPayable[] } {
	const queries: QueryPayable[] = rows.map((r) => {
		const paid: Partial<Record<HajjCurrency, number>> = {};
		const balance: Partial<Record<HajjCurrency, number>> = {};
		for (const cur of CURRENCIES) {
			const mine = payments.filter((p) => p.query_id === r.query.id && p.currency === cur);
			const owed = r.cost[cur];
			if (owed === undefined && mine.length === 0) continue;
			paid[cur] = total(
				mine.map((p) => p.amount),
				cur
			);
			balance[cur] = toNumber(subtract(money(owed ?? 0, cur), money(paid[cur] ?? 0, cur)));
		}
		return {
			queryId: r.query.id,
			queryNumber: r.query.query_number,
			client: r.query.client_name,
			travellers: r.travellers,
			owed: r.cost,
			paid,
			balance
		};
	});

	const lines = CURRENCIES.map((cur): PayableLine => {
		const owed = total(
			rows.map((r) => r.cost[cur] ?? 0),
			cur
		);
		const inCur = payments.filter((p) => p.currency === cur);
		const paid = total(
			inCur.map((p) => p.amount),
			cur
		);
		const confirmedIds = new Set(rows.map((r) => r.query.id));
		const unallocated = total(
			inCur.filter((p) => !p.query_id || !confirmedIds.has(p.query_id)).map((p) => p.amount),
			cur
		);
		return {
			currency: cur,
			owed,
			paid,
			unallocated,
			outstanding: toNumber(subtract(money(owed, cur), money(paid, cur)))
		};
	}).filter((l) => l.owed > 0 || l.paid > 0);

	return { lines, queries };
}
