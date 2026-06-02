import Dinero from 'dinero.js';
import type { Currency } from './database.types';

// ---------------------------------------------------------------------------
// Money layer. The whole point: NEVER do money math with raw JS numbers.
// Floats lose pennies (0.1 + 0.2 !== 0.3). Every amount becomes integer minor
// units (paisa, halala, cents) inside Dinero, and only converts back to a
// number/string at the edges (display, or writing the NUMERIC column).
// ---------------------------------------------------------------------------

// All currencies the system supports use 2 decimal places.
const PRECISION = 2;

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
	PKR: 'en-PK',
	SAR: 'ar-SA',
	AED: 'ar-AE',
	USD: 'en-US',
	EUR: 'en-IE',
	GBP: 'en-GB'
};

export type Money = Dinero.Dinero;

/** Build a Money value from a major-unit amount (e.g. 1500.50 PKR). */
export function money(amount: number, currency: Currency = 'PKR'): Money {
	// Round to minor units up front so we never carry float dust into Dinero.
	const minor = Math.round(amount * 10 ** PRECISION);
	return Dinero({ amount: minor, currency, precision: PRECISION });
}

/** Build a Money value directly from integer minor units. */
export function fromMinor(minor: number, currency: Currency = 'PKR'): Money {
	return Dinero({ amount: Math.round(minor), currency, precision: PRECISION });
}

/** Major-unit number, safe for writing to a NUMERIC(_, 2) column. */
export function toNumber(m: Money): number {
	return m.toUnit();
}

export function add(a: Money, b: Money): Money {
	return a.add(b);
}

export function subtract(a: Money, b: Money): Money {
	return a.subtract(b);
}

/** Multiply by a unitless factor (quantity, percentage as ratio). */
export function multiply(m: Money, factor: number): Money {
	return m.multiply(factor, 'HALF_UP');
}

/** Sum a list of Money values; empty list returns zero in `currency`. */
export function sum(values: Money[], currency: Currency = 'PKR'): Money {
	return values.reduce((acc, v) => acc.add(v), money(0, currency));
}

/** profit = selling − cost, in the same currency. */
export function profit(selling: Money, cost: Money): Money {
	return selling.subtract(cost);
}

/** Margin as a percentage of selling price (0 when selling is zero). */
export function profitMarginPct(selling: Money, cost: Money): number {
	if (selling.isZero()) return 0;
	return (profit(selling, cost).toUnit() / selling.toUnit()) * 100;
}

/**
 * Convert an amount in a foreign currency to PKR using a stored exchange rate.
 * The rate is "1 unit of `from` = rate PKR" — exactly how vendor_transactions
 * stores exchange_rate_to_pkr.
 */
export function convertToPkr(amount: Money, rateToPkr: number): Money {
	return money(amount.toUnit() * rateToPkr, 'PKR');
}

/** Localized currency string, e.g. "Rs 1,500.50" or "$1,500.50". */
export function formatMoney(m: Money): string {
	const currency = m.getCurrency() as Currency;
	return m.toUnit().toLocaleString(LOCALE_BY_CURRENCY[currency], {
		style: 'currency',
		currency,
		minimumFractionDigits: PRECISION,
		maximumFractionDigits: PRECISION
	});
}

/** Format a raw major-unit number as currency without building a Money first. */
export function formatAmount(amount: number, currency: Currency = 'PKR'): string {
	return formatMoney(money(amount, currency));
}
