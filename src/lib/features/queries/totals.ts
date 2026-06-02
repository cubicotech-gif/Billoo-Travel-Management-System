import { type Money, money, multiply, profit, profitMarginPct, sum, toNumber } from '$lib/money';
import type { QueryService } from './types';

// Roll a query's services up into cost / selling / profit totals — all through
// the money layer so pennies never drift. Query-level prices are held in PKR.

export interface ServiceTotals {
	cost: Money;
	selling: Money;
	profit: Money;
	marginPct: number;
}

/** Line totals for a single service (unit price × quantity). */
export function lineCost(s: Pick<QueryService, 'cost_price' | 'quantity'>): Money {
	return multiply(money(Number(s.cost_price)), s.quantity);
}

export function lineSelling(s: Pick<QueryService, 'selling_price' | 'quantity'>): Money {
	return multiply(money(Number(s.selling_price)), s.quantity);
}

export function rollupServices(services: QueryService[]): ServiceTotals {
	const cost = sum(services.map(lineCost));
	const selling = sum(services.map(lineSelling));
	return {
		cost,
		selling,
		profit: profit(selling, cost),
		marginPct: profitMarginPct(selling, cost)
	};
}

/** Plain numbers for writing back to queries.cost_price / selling_price. */
export function rollupNumbers(services: QueryService[]): { cost: number; selling: number } {
	const t = rollupServices(services);
	return { cost: toNumber(t.cost), selling: toNumber(t.selling) };
}
