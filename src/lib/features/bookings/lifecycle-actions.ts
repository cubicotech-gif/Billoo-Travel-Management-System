// DB-touching side of the booking lifecycle (the pure math lives in ./lifecycle).
import type { BookingStatus } from '$lib/database.types';
import { getQuery, updateQuery } from '$features/queries/api';
import { listPayments } from '$features/payments/api';
import { getBookingForQuery, listBookingItems } from './api';
import { lifecycleSummary } from './lifecycle';

/**
 * Re-evaluate and persist a booking's status from its payments + dates. No-op
 * unless the query is a marked-complete booking that isn't manually pinned.
 * Safe to call after any payment / discount / date change.
 */
export async function reconcileBookingLifecycle(queryId: string): Promise<BookingStatus | null> {
	const query = await getQuery(queryId);
	if (!query || query.status !== 'Booking') return null;
	if (query.booking_status_locked) return null; // manual override in force
	if (!query.completed_date) return null; // still building — not finalized yet

	const booking = await getBookingForQuery(queryId);
	if (!booking) return null;
	const [items, payments] = await Promise.all([
		listBookingItems(booking.id),
		listPayments(queryId)
	]);

	const { computed } = lifecycleSummary(booking, items, payments, query);
	if (computed !== query.booking_status) {
		await updateQuery(queryId, { booking_status: computed });
	}
	return computed;
}

/** Mark the booking complete: stamp the date, clear any pin, then auto-route. */
export async function markBookingComplete(queryId: string): Promise<void> {
	await updateQuery(queryId, {
		completed_date: new Date().toISOString(),
		booking_status_locked: false
	});
	await reconcileBookingLifecycle(queryId);
}

/** Reopen a completed booking back into the editable builder. */
export async function reopenBooking(queryId: string): Promise<void> {
	await updateQuery(queryId, {
		booking_status: null,
		completed_date: null,
		booking_status_locked: false
	});
}

/** Pin the status by hand (manual override) — turns off the auto-router. */
export async function setBookingStatusManual(queryId: string, status: BookingStatus): Promise<void> {
	await updateQuery(queryId, { booking_status: status, booking_status_locked: true });
}

/** Drop the manual pin and recompute from money + dates. */
export async function clearBookingStatusOverride(queryId: string): Promise<void> {
	await updateQuery(queryId, { booking_status_locked: false });
	await reconcileBookingLifecycle(queryId);
}
