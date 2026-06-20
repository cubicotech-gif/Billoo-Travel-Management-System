import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { Quotation } from '$features/quotations/types';
import {
	createBlankBooking,
	createBookingFromQuotation,
	createBookingItem,
	deleteBookingItem,
	getBookingForQuery,
	listBookingItems,
	updateBookingItem
} from './api';
import type { Booking, BookingItemUpdate, NewBookingItem } from './types';

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
		onSuccess: () => {
			client.invalidateQueries({ queryKey: bookingKey(queryId) });
			// Refresh the query detail + its activity timeline.
			client.invalidateQueries({ queryKey: ['queries', queryId] });
		}
	});
}

export function useCreateBlankBooking(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: () => createBlankBooking(queryId),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: bookingKey(queryId) });
			client.invalidateQueries({ queryKey: ['queries', queryId] });
		}
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

export function useCreateBookingItem(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ booking, input }: { booking: Booking; input: Omit<NewBookingItem, 'booking_id'> }) =>
			createBookingItem(booking, input),
		onSuccess: (_item, vars) => {
			client.invalidateQueries({ queryKey: itemsKey(vars.booking.id) });
			client.invalidateQueries({ queryKey: bookingKey(queryId) });
		}
	});
}

export function useDeleteBookingItem(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, booking }: { id: string; booking: Booking }) => deleteBookingItem(id, booking),
		onSuccess: (_v, vars) => {
			client.invalidateQueries({ queryKey: itemsKey(vars.booking.id) });
			client.invalidateQueries({ queryKey: bookingKey(queryId) });
		}
	});
}
