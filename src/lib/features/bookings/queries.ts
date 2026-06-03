import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { Quotation } from '$features/quotations/types';
import {
	createBookingFromQuotation,
	getBookingForQuery,
	listBookingItems,
	updateBookingItem
} from './api';
import type { Booking, BookingItemUpdate } from './types';

const bookingKey = (queryId: string) => ['booking', queryId] as const;
const itemsKey = (bookingId: string) => ['booking-items', bookingId] as const;

export function useBookingForQuery(queryId: string) {
	return createQuery({ queryKey: bookingKey(queryId), queryFn: () => getBookingForQuery(queryId) });
}

export function useBookingItems(bookingId: string | undefined) {
	return createQuery({
		queryKey: itemsKey(bookingId ?? 'none'),
		queryFn: () => (bookingId ? listBookingItems(bookingId) : Promise.resolve([])),
		enabled: !!bookingId
	});
}

export function useCreateBooking(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (quotation: Quotation) => createBookingFromQuotation(quotation),
		onSuccess: () => client.invalidateQueries({ queryKey: bookingKey(queryId) })
	});
}

export function useUpdateBookingItem(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({
			id,
			booking,
			patch
		}: {
			id: string;
			booking: Booking;
			patch: BookingItemUpdate;
		}) => updateBookingItem(id, booking, patch),
		onSuccess: (_item, vars) => {
			client.invalidateQueries({ queryKey: itemsKey(vars.booking.id) });
			client.invalidateQueries({ queryKey: bookingKey(queryId) });
		}
	});
}
