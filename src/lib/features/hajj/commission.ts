import { money, subtract, sum, toNumber } from '$lib/money';
import type { HajjCurrency } from './types';

// Commission the vendor pays us per person. What we are OWED comes from confirmed
// travellers x their package's commission_per_person; what we have been PAID is
// recorded as receipts. Outstanding = expected - received, per currency.

export interface CommissionTraveller {
	/** Package currency (the catalogue's). */
	currency: HajjCurrency;
	/** commission_per_person of the traveller's package; null = not entered yet. */
	commission: number | null;
	/** Query is in the Booking stage (not cancelled / deleted). */
	confirmed: boolean;
}

export interface CommissionReceipt {
	amount: number;
	currency: HajjCurrency | 'PKR';
}

export interface CommissionLine {
	currency: HajjCurrency;
	travellers: number;
	/** Confirmed travellers whose package has no commission entered yet. */
	missing: number;
	expected: number;
	received: number;
	outstanding: number;
}

const CURRENCIES: HajjCurrency[] = ['USD', 'SAR'];

export function commissionSummary(
	travellers: CommissionTraveller[],
	receipts: CommissionReceipt[]
): CommissionLine[] {
	return CURRENCIES.map((cur) => {
		const confirmed = travellers.filter((t) => t.confirmed && t.currency === cur);
		const priced = confirmed.filter((t) => t.commission !== null);
		const expected = sum(
			priced.map((t) => money(t.commission as number, cur)),
			cur
		);
		const received = sum(
			receipts.filter((r) => r.currency === cur).map((r) => money(r.amount, cur)),
			cur
		);
		return {
			currency: cur,
			travellers: confirmed.length,
			missing: confirmed.length - priced.length,
			expected: toNumber(expected),
			received: toNumber(received),
			outstanding: toNumber(subtract(expected, received))
		};
	}).filter((l) => l.travellers > 0 || l.received > 0);
}
