// Pure vendor-ledger money math — no IO, so it's unit-testable in isolation and
// can't silently drift. ledger.ts fetches rows and feeds them here.
import type { Currency } from '$lib/database.types';
import { add, convertToPkr, money, subtract, toNumber } from '$lib/money';

/** Penny-safe add/subtract of PKR amounts (never raw +/- on money). */
export const addPkr = (a: number, b: number) => toNumber(add(money(a, 'PKR'), money(b, 'PKR')));
export const subPkr = (a: number, b: number) => toNumber(subtract(money(a, 'PKR'), money(b, 'PKR')));

/**
 * A vendor payment's value in PKR. `amount` is in `currency`; multiply by the
 * stored rate (1 unit of currency = rate_to_pkr PKR). PKR payments (rate 1) pass
 * straight through.
 */
export function paymentPkr(p: { amount: number; currency?: Currency | null; rate_to_pkr?: number | null }): number {
	const currency = (p.currency ?? 'PKR') as Currency;
	const amount = Number(p.amount) || 0;
	if (currency === 'PKR') return amount;
	const rate = Number(p.rate_to_pkr) || 1;
	return toNumber(convertToPkr(money(amount, currency), rate));
}
