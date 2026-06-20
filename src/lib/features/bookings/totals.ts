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

/** Conversion rates to PKR: roe = SAR->PKR, usdRate = USD->PKR. */
export interface Rates {
	roe: number;
	usdRate: number;
}

/** Build rates from a booking row (USD rate falls back to roe for old rows). */
export function ratesOf(b: { roe: number; usd_rate?: number | null }): Rates {
	const roe = Number(b.roe) || 0;
	const usdRate = Number(b.usd_rate ?? 0) || roe;
	return { roe, usdRate };
}

/** Convert a line-currency amount to PKR (SAR via roe, USD via usdRate, PKR as-is). */
export function toPkr(amount: number, currency: Currency, rates: Rates): Money {
	if (currency === 'PKR') return money(amount, 'PKR');
	const rate = currency === 'USD' ? rates.usdRate : rates.roe;
	return convertToPkr(money(amount, currency), rate || rates.roe);
}

export function bookingTotals(items: BookingItemAmounts[], rates: Rates): BookingTotals {
	const quotedCost = sum(items.map((i) => toPkr(i.quoted_cost, i.currency, rates)));
	const quotedSell = sum(items.map((i) => toPkr(i.quoted_sell, i.currency, rates)));
	const actualCost = sum(items.map((i) => toPkr(i.actual_cost, i.currency, rates)));
	const actualSell = sum(items.map((i) => toPkr(i.actual_sell, i.currency, rates)));

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
