// Pure finance calculations — no IO, so the money math is unit-testable in
// isolation and can't silently drift. api.ts fetches rows and feeds them here.
import { add, money, subtract, toNumber } from '$lib/money';

/** Penny-safe add/subtract of PKR amounts (never raw +/- on money). */
export const addN = (a: number, b: number) => toNumber(add(money(a, 'PKR'), money(b, 'PKR')));
export const subN = (a: number, b: number) => toNumber(subtract(money(a, 'PKR'), money(b, 'PKR')));

export interface RawBooking {
	actualSellPkr: number;
	actualCostPkr: number;
	discountPkr: number;
}

/** What a query's client owes: booking sell − discount (floored at 0), else the headline price. */
export function queryOwed(booking: RawBooking | undefined, sellingPrice: number): number {
	if (!booking) return Number(sellingPrice) || 0;
	return Math.max(0, subN(Number(booking.actualSellPkr) || 0, Number(booking.discountPkr) || 0));
}

/** Expected profit on a query: (sell − discount) − cost. Zero without a booking. */
export function queryProfit(booking: RawBooking | undefined): number {
	if (!booking) return 0;
	return subN(
		subN(Number(booking.actualSellPkr) || 0, Number(booking.actualCostPkr) || 0),
		Number(booking.discountPkr) || 0
	);
}

export interface RawQuery {
	id: string;
	passengerId: string | null;
	clientName: string;
	queryNumber: string;
	sellingPrice: number;
}

export interface TripFinance {
	queryId: string;
	queryNumber: string;
	billed: number;
	paid: number;
	balance: number;
	profit: number;
}

export interface PassengerFinanceRow {
	key: string;
	passengerId: string | null;
	name: string;
	trips: number;
	billed: number;
	paid: number;
	balance: number;
	profit: number;
	/** Per-trip breakup, for the drill-down. */
	tripList: TripFinance[];
}

/**
 * Roll queries up per passenger (unlinked queries stand alone), keeping a
 * per-trip breakup. Every group total is the penny-safe sum of its trips, so the
 * header figure and the expanded rows always reconcile.
 */
export function aggregatePassengers(
	queries: RawQuery[],
	bookingByQuery: Map<string, RawBooking>,
	paidByQuery: Map<string, number>
): PassengerFinanceRow[] {
	const groups = new Map<string, PassengerFinanceRow>();
	for (const q of queries) {
		const b = bookingByQuery.get(q.id);
		const billed = queryOwed(b, q.sellingPrice);
		const paid = paidByQuery.get(q.id) ?? 0;
		const profit = queryProfit(b);
		const trip: TripFinance = {
			queryId: q.id,
			queryNumber: q.queryNumber,
			billed,
			paid,
			balance: Math.max(0, subN(billed, paid)),
			profit
		};
		const key = q.passengerId ?? `q:${q.id}`;
		const g =
			groups.get(key) ??
			{ key, passengerId: q.passengerId, name: q.clientName, trips: 0, billed: 0, paid: 0, balance: 0, profit: 0, tripList: [] };
		g.trips += 1;
		g.billed = addN(g.billed, billed);
		g.paid = addN(g.paid, paid);
		g.profit = addN(g.profit, profit);
		g.tripList.push(trip);
		groups.set(key, g);
	}
	return [...groups.values()]
		.map((g) => ({ ...g, balance: Math.max(0, subN(g.billed, g.paid)) }))
		.sort((a, b) => b.billed - a.billed);
}

/** Total collected: paid amounts, excluding any on cancelled queries. */
export function collectedTotal(payments: { queryId: string; amount: number }[], cancelled: Set<string>): number {
	return payments.filter((p) => !cancelled.has(p.queryId)).reduce((acc, p) => addN(acc, Number(p.amount) || 0), 0);
}

/** Sum a list of PKR amounts, penny-safe. */
export function sumN(values: number[]): number {
	return values.reduce((acc, v) => addN(acc, v), 0);
}
