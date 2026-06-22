import { supabase } from '$lib/supabase';
import { cloneQuotation, createBlankBookingQuotation, getQuotationLines, setQuotationStatus } from '$features/quotations/api';
import { logActivity } from '$features/queries/activity';
import type { Quotation } from '$features/quotations/types';
import { bookingTotals, ratesOf, type Rates } from './totals';
import type { Booking, BookingItem, BookingItemUpdate, NewBookingItem } from './types';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

/** The active (non-deleted) booking for a query, or null. */
export async function getBookingForQuery(queryId: string): Promise<Booking | null> {
	const { data, error } = await supabase
		.from('bookings')
		.select('*')
		.eq('query_id', queryId)
		.eq('is_deleted', false)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data;
}

export async function listBookingItems(bookingId: string): Promise<BookingItem[]> {
	return unwrap(
		await supabase
			.from('booking_items')
			.select('*')
			.eq('booking_id', bookingId)
			.order('created_at', { ascending: true })
	);
}

/** Recompute the booking's PKR roll-ups from its items and persist. */
async function syncBookingTotals(bookingId: string, rates: Rates): Promise<void> {
	const items = await listBookingItems(bookingId);
	const t = bookingTotals(items, rates);
	const { error } = await supabase
		.from('bookings')
		.update({
			quoted_cost_pkr: t.quotedCostPkr,
			quoted_sell_pkr: t.quotedSellPkr,
			actual_cost_pkr: t.actualCostPkr,
			actual_sell_pkr: t.actualSellPkr,
			profit_pkr: t.profitPkr
		})
		.eq('id', bookingId);
	if (error) throw new Error(error.message);
}

/**
 * Create a booking from an accepted quotation, auto-populating items from the
 * quotation lines (actuals start equal to quoted; staff then adjust).
 */
/** Start an empty booking (no quotation) — services get added directly. */
export async function createBlankBooking(queryId: string, roe = 1): Promise<Booking> {
	const existing = await getBookingForQuery(queryId);
	if (existing) return existing;
	const booking = unwrap<Booking>(
		await supabase.from('bookings').insert({ query_id: queryId, roe }).select().single()
	);
	logActivity({ query_id: queryId, kind: 'booking', summary: 'Booking started (blank)' });
	return booking;
}

export async function createBookingFromQuotation(quotation: Quotation): Promise<Booking> {
	// Guard: one active booking per query — return the existing one if present.
	const existing = await getBookingForQuery(quotation.query_id);
	if (existing) return existing;

	const lines = await getQuotationLines(quotation.id);
	const booking = unwrap<Booking>(
		await supabase
			.from('bookings')
			.insert({ query_id: quotation.query_id, quotation_id: quotation.id, roe: quotation.roe, usd_rate: quotation.usd_rate })
			.select()
			.single()
	);

	if (lines.length > 0) {
		const rows = lines.map((l) => ({
			booking_id: booking.id,
			line_type: l.line_type,
			label: l.label,
			// Carry the vendor quoted on the line, plus the line detail (hotel
			// dates, room type, route, …) so vouchers/itineraries can use them.
			vendor_id: l.vendor_id,
			currency: l.currency,
			quoted_cost: Number(l.line_cost),
			quoted_sell: Number(l.line_sell),
			actual_cost: Number(l.line_cost),
			actual_sell: Number(l.line_sell),
			meta: l.meta ?? {}
		}));
		const { error } = await supabase.from('booking_items').insert(rows);
		if (error) throw new Error(error.message);
	}

	await syncBookingTotals(booking.id, { roe: Number(quotation.roe), usdRate: Number(quotation.usd_rate ?? 0) || Number(quotation.roe) });
	logActivity({ query_id: quotation.query_id, kind: 'booking', summary: 'Booking created from quotation' });
	return booking;
}

/**
 * Make the booking reflect a quotation: create it if absent, otherwise replace
 * its items and rates from the quotation. Used by the booking-stage builder so
 * each save re-drives the actual booking.
 */
/**
 * Drift a booking from a chosen quotation version. The picked tier is accepted
 * (no need to go back to Working), then CLONED into a working copy the booking
 * owns and edits — so the client-facing tier quote stays frozen. Any previous
 * working copy is archived so it drops out of the version picker.
 */
export async function setBookingBasis(queryId: string, sourceQuotationId: string): Promise<Booking> {
	await setQuotationStatus(sourceQuotationId, 'accepted');
	const existing = await getBookingForQuery(queryId);
	if (existing?.quotation_id && existing.quotation_id !== sourceQuotationId) {
		await setQuotationStatus(existing.quotation_id, 'archived');
	}
	const copy = await cloneQuotation(sourceQuotationId, 'accepted');
	return syncBookingFromQuotation(copy);
}

/** Start a booking from scratch — an empty accepted working copy, no tier. */
export async function startBlankBooking(queryId: string): Promise<Booking> {
	const existing = await getBookingForQuery(queryId);
	if (existing?.quotation_id) {
		await setQuotationStatus(existing.quotation_id, 'archived');
	}
	const copy = await createBlankBookingQuotation(queryId);
	return syncBookingFromQuotation(copy);
}

export async function syncBookingFromQuotation(quotation: Quotation): Promise<Booking> {
	const existing = await getBookingForQuery(quotation.query_id);
	const lines = await getQuotationLines(quotation.id);

	let booking: Booking;
	if (existing) {
		await supabase.from('booking_items').delete().eq('booking_id', existing.id);
		const { error } = await supabase
			.from('bookings')
			.update({ quotation_id: quotation.id, roe: quotation.roe, usd_rate: quotation.usd_rate })
			.eq('id', existing.id);
		if (error) throw new Error(error.message);
		booking = { ...existing, quotation_id: quotation.id, roe: quotation.roe, usd_rate: quotation.usd_rate };
	} else {
		booking = unwrap<Booking>(
			await supabase
				.from('bookings')
				.insert({ query_id: quotation.query_id, quotation_id: quotation.id, roe: quotation.roe, usd_rate: quotation.usd_rate })
				.select()
				.single()
		);
	}

	if (lines.length > 0) {
		const rows = lines.map((l) => ({
			booking_id: booking.id,
			line_type: l.line_type,
			label: l.label,
			vendor_id: l.vendor_id,
			currency: l.currency,
			quoted_cost: Number(l.line_cost),
			quoted_sell: Number(l.line_sell),
			actual_cost: Number(l.line_cost),
			actual_sell: Number(l.line_sell),
			meta: l.meta ?? {}
		}));
		const { error } = await supabase.from('booking_items').insert(rows);
		if (error) throw new Error(error.message);
	}

	await syncBookingTotals(booking.id, ratesOf(booking));
	// Log only the first time the booking is created — routine re-syncs (every
	// mark-booked / edit) must NOT flood the timeline.
	if (!existing) {
		logActivity({ query_id: quotation.query_id, kind: 'booking', summary: 'Booking started' });
	}
	return booking;
}

export async function updateBookingItem(
	id: string,
	booking: Booking,
	patch: BookingItemUpdate
): Promise<BookingItem> {
	const item = unwrap<BookingItem>(
		await supabase.from('booking_items').update(patch).eq('id', id).select().single()
	);
	await syncBookingTotals(booking.id, ratesOf(booking));
	return item;
}

/** Add a service line to a booking (direct booking, or extra on a seeded one). */
export async function createBookingItem(
	booking: Booking,
	input: Omit<NewBookingItem, 'booking_id'>
): Promise<BookingItem> {
	const item = unwrap<BookingItem>(
		await supabase.from('booking_items').insert({ ...input, booking_id: booking.id }).select().single()
	);
	await syncBookingTotals(booking.id, ratesOf(booking));
	return item;
}

export async function deleteBookingItem(id: string, booking: Booking): Promise<void> {
	const { error } = await supabase.from('booking_items').delete().eq('id', id);
	if (error) throw new Error(error.message);
	await syncBookingTotals(booking.id, ratesOf(booking));
}

/** Change the booking's conversion rates and re-roll the PKR totals. */
export async function updateBookingRates(booking: Booking, roe: number, usdRate: number): Promise<void> {
	const { error } = await supabase
		.from('bookings')
		.update({ roe, usd_rate: usdRate })
		.eq('id', booking.id);
	if (error) throw new Error(error.message);
	await syncBookingTotals(booking.id, { roe, usdRate });
}
