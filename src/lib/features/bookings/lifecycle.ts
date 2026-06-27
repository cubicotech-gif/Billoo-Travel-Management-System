// Money-driven booking lifecycle.
//
// Once a booking is "marked complete" the stage is no longer chosen by hand —
// it's derived from two facts: how much the client has paid vs what they owe
// (the package total minus any discount), and whether the trip's final date has
// passed. Staff can still pin a manual override (booking_status_locked), in
// which case the auto-router leaves it alone.
//
//   paid in full + trip ahead  -> Payment Done - Check-in Left
//   balance > 0  + trip ahead  -> Payment Pending - Check-in Left
//   balance > 0  + trip over   -> Payment Pending - Travel Done
//   paid in full + trip over   -> Completed
// NOTE: keep this module free of Supabase / IO imports so the calculation can be
// unit-tested in isolation. The DB-touching actions live in ./lifecycle-actions.
import { money, subtract, sum, toNumber } from '$lib/money';
import type { BookingStatus } from '$lib/database.types';
import type { Payment } from '$features/payments/api';
import type { Query } from '$features/queries/types';
import type { Booking, BookingItem } from './types';

/**
 * Round-off tolerance (PKR). Clients commonly pay the round figure and skip the
 * last few rupees, so a balance at or below this counts as paid in full. The
 * leftover can be written off (recorded as a tiny discount) to zero the books.
 */
export const SETTLE_TOLERANCE_PKR = 100;

/** Today as a local 'YYYY-MM-DD' string (matches how service dates are stored). */
export function todayISO(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** Sum of payments actually received (status = 'paid'), in PKR. */
export function paidTotal(payments: Pick<Payment, 'status' | 'amount'>[]): number {
	return toNumber(
		sum(payments.filter((p) => p.status === 'paid').map((p) => money(Number(p.amount), 'PKR')))
	);
}

/** What the client owes: the booking's actual sell total minus any discount. */
export function owedTotal(booking: Pick<Booking, 'actual_sell_pkr' | 'discount_pkr'>): number {
	const owed = subtract(
		money(Number(booking.actual_sell_pkr) || 0, 'PKR'),
		money(Number(booking.discount_pkr) || 0, 'PKR')
	);
	return Math.max(0, toNumber(owed));
}

/** Latest dated service across booking items (hotel check-out/in, transfer/ticket date). */
export function latestServiceDate(items: Pick<BookingItem, 'meta'>[]): string | null {
	let latest: string | null = null;
	for (const it of items) {
		const meta = (it.meta ?? {}) as Record<string, unknown>;
		for (const key of ['check_out', 'check_in', 'date'] as const) {
			const v = meta[key];
			// ISO 'YYYY-MM-DD' strings compare correctly lexically.
			if (typeof v === 'string' && v && (!latest || v > latest)) latest = v;
		}
	}
	return latest;
}

/** The trip's final date: latest booked service date, else the query's return/travel date. */
export function tripEndDate(
	items: Pick<BookingItem, 'meta'>[],
	query: Pick<Query, 'return_date' | 'travel_date'>
): string | null {
	return latestServiceDate(items) ?? query.return_date ?? query.travel_date ?? null;
}

export interface LifecycleSummary {
	owed: number;
	paid: number;
	/** Outstanding balance, floored at zero. */
	balance: number;
	paidInFull: boolean;
	/** Small leftover (0 < balance ≤ tolerance) that can be written off; else 0. */
	roundOff: number;
	tripEndDate: string | null;
	tripEnded: boolean;
	/** The status the auto-router would set right now. */
	computed: BookingStatus;
}

export function lifecycleSummary(
	booking: Pick<Booking, 'actual_sell_pkr' | 'discount_pkr'>,
	items: Pick<BookingItem, 'meta'>[],
	payments: Pick<Payment, 'status' | 'amount'>[],
	query: Pick<Query, 'return_date' | 'travel_date'>,
	today: string = todayISO()
): LifecycleSummary {
	const owed = owedTotal(booking);
	const paid = paidTotal(payments);
	const balance = toNumber(subtract(money(owed, 'PKR'), money(paid, 'PKR')));
	// Within the round-off tolerance counts as settled (clients skip the pennies).
	const paidInFull = balance <= SETTLE_TOLERANCE_PKR;
	const end = tripEndDate(items, query);
	const tripEnded = end != null && end < today;
	return {
		owed,
		paid,
		balance: Math.max(0, balance),
		paidInFull,
		roundOff: paidInFull && balance > 0 ? balance : 0,
		tripEndDate: end,
		tripEnded,
		computed: computeBookingStatus(paidInFull, tripEnded)
	};
}

/** Pure decision: pick the post-complete booking status from money + trip-end. */
export function computeBookingStatus(paidInFull: boolean, tripEnded: boolean): BookingStatus {
	if (paidInFull) return tripEnded ? 'Completed' : 'Payment Done - Check-in Left';
	return tripEnded ? 'Payment Pending - Travel Done' : 'Payment Pending - Check-in Left';
}
