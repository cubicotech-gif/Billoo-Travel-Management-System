import { type Currency } from '$lib/database.types';
import { add, convertToPkr, type Money, money, subtract, sum, toNumber } from '$lib/money';

// Roll booking items up into PKR totals. Each item is in its own currency
// (SAR for hotel/transfer/visa, PKR for tickets); the booking roe converts the
// SAR side. All math through the money layer — actuals vs quote, to the penny.

export interface BookingItemAmounts {
	currency: Currency;
	quoted_cost: number;
	quoted_sell: number;
	actual_cost: number;
	actual_sell: number;
}

export interface BookingTotals {
	quotedCostPkr: number;
	quotedSellPkr: number;
	actualCostPkr: number;
	actualSellPkr: number;
	profitPkr: number;
	/** actual profit − quoted profit: positive means better than quoted. */
	variancePkr: number;
}

/** Convert a line-currency amount to PKR (SAR via roe, PKR as-is). */
export function toPkr(amount: number, currency: Currency, roe: number): Money {
	return currency === 'PKR' ? money(amount, 'PKR') : convertToPkr(money(amount, currency), roe);
}

export function bookingTotals(items: BookingItemAmounts[], roe: number): BookingTotals {
	const quotedCost = sum(items.map((i) => toPkr(i.quoted_cost, i.currency, roe)));
	const quotedSell = sum(items.map((i) => toPkr(i.quoted_sell, i.currency, roe)));
	const actualCost = sum(items.map((i) => toPkr(i.actual_cost, i.currency, roe)));
	const actualSell = sum(items.map((i) => toPkr(i.actual_sell, i.currency, roe)));

	const quotedProfit = subtract(quotedSell, quotedCost);
	const actualProfit = subtract(actualSell, actualCost);
	const variance = subtract(actualProfit, quotedProfit);

	return {
		quotedCostPkr: toNumber(quotedCost),
		quotedSellPkr: toNumber(quotedSell),
		actualCostPkr: toNumber(actualCost),
		actualSellPkr: toNumber(actualSell),
		profitPkr: toNumber(actualProfit),
		variancePkr: toNumber(variance)
	};
}

/** Per-item profit in the line's own currency (actual sell − actual cost). */
export function itemProfit(i: BookingItemAmounts): number {
	return toNumber(subtract(money(i.actual_sell, i.currency), money(i.actual_cost, i.currency)));
}

// Re-export for callers building Money directly.
export { add };
