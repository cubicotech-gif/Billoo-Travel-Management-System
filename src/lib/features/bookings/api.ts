import { supabase } from '$lib/supabase';
import { getQuotationLines } from '$features/quotations/api';
import type { Quotation } from '$features/quotations/types';
import { bookingTotals } from './totals';
import type { Booking, BookingItem, BookingItemUpdate } from './types';

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
async function syncBookingTotals(bookingId: string, roe: number): Promise<void> {
	const items = await listBookingItems(bookingId);
	const t = bookingTotals(items, roe);
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
export async function createBookingFromQuotation(quotation: Quotation): Promise<Booking> {
	// Guard: one active booking per query — return the existing one if present.
	const existing = await getBookingForQuery(quotation.query_id);
	if (existing) return existing;

	const lines = await getQuotationLines(quotation.id);
	const booking = unwrap<Booking>(
		await supabase
			.from('bookings')
			.insert({ query_id: quotation.query_id, quotation_id: quotation.id, roe: quotation.roe })
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

	await syncBookingTotals(booking.id, Number(quotation.roe));
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
	await syncBookingTotals(booking.id, Number(booking.roe));
	return item;
}
