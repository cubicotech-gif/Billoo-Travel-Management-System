import { addDays, toISO } from '$features/quotations/dates';

// Rate validity window. Per the product requirement, a saved rate is valid for
// 3 days from the date it was entered; staff refresh rates daily. These helpers
// are pure so the builder and rates admin can flag stale rates consistently.

export const RATE_VALIDITY_DAYS = 3;

function today(): string {
	return toISO(new Date());
}

/** Whole days between a rate's date and `asOf` (negative if rate is in future). */
export function rateAgeDays(rateDate: string, asOf: string = today()): number {
	const ms = new Date(asOf).getTime() - new Date(rateDate.slice(0, 10)).getTime();
	return Math.round(ms / 86_400_000);
}

/** The first day on which the rate is considered expired (rate_date + 3). */
export function rateExpiresOn(rateDate: string): string {
	return addDays(rateDate.slice(0, 10), RATE_VALIDITY_DAYS);
}

/** A rate is valid for its entry day plus the following (RATE_VALIDITY_DAYS-1) days. */
export function isRateValid(rateDate: string, asOf: string = today()): boolean {
	const age = rateAgeDays(rateDate, asOf);
	return age >= 0 && age < RATE_VALIDITY_DAYS;
}
