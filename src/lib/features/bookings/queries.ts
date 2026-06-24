import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { Quotation } from '$features/quotations/types';
import {
	createBlankBooking,
	createBookingFromQuotation,
	createBookingItem,
	deleteBookingItem,
	getBookingForQuery,
	listBookingItems,
	setBookingBasis,
	startBlankBooking,
	syncBookingFromQuotation,
	updateBookingDiscount,
	updateBookingItem,
	updateBookingRates
} from './api';
import {
	clearBookingStatusOverride,
	markBookingComplete,
	reconcileBookingLifecycle,
	reopenBooking,
	setBookingStatusManual
} from './lifecycle-actions';
import type { BookingStatus } from '$lib/database.types';
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

export function useSetBookingBasis(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (sourceQuotationId: string) => setBookingBasis(queryId, sourceQuotationId),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: bookingKey(queryId) });
			client.invalidateQueries({ queryKey: ['quotations', queryId] });
			client.invalidateQueries({ queryKey: ['queries', queryId] });
		}
	});
}

export function useStartBlankBooking(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: () => startBlankBooking(queryId),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: bookingKey(queryId) });
			client.invalidateQueries({ queryKey: ['quotations', queryId] });
			client.invalidateQueries({ queryKey: ['queries', queryId] });
		}
	});
}

export function useSyncBookingFromQuotation(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (quotation: Quotation) => syncBookingFromQuotation(quotation),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: bookingKey(queryId) });
			client.invalidateQueries({ queryKey: ['queries', queryId] });
		}
	});
}

export function useUpdateBookingRates(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ booking, roe, usdRate }: { booking: Booking; roe: number; usdRate: number }) =>
			updateBookingRates(booking, roe, usdRate),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: bookingKey(queryId) });
			client.invalidateQueries({ queryKey: ['queries', queryId] });
		}
	});
}

// --- Booking lifecycle (money/date-driven status + discount + override) ----

/** Invalidate every cache that a lifecycle move can touch. */
function invalidateLifecycle(client: ReturnType<typeof useQueryClient>, queryId: string) {
	client.invalidateQueries({ queryKey: bookingKey(queryId) });
	client.invalidateQueries({ queryKey: ['queries', queryId] });
	client.invalidateQueries({ queryKey: ['payments', queryId] });
}

export function useMarkBookingComplete(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: () => markBookingComplete(queryId),
		onSuccess: () => invalidateLifecycle(client, queryId)
	});
}

export function useReopenBooking(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: () => reopenBooking(queryId),
		onSuccess: () => invalidateLifecycle(client, queryId)
	});
}

export function useReconcileBookingLifecycle(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: () => reconcileBookingLifecycle(queryId),
		onSuccess: () => invalidateLifecycle(client, queryId)
	});
}

export function useSetBookingStatusManual(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (status: BookingStatus) => setBookingStatusManual(queryId, status),
		onSuccess: () => invalidateLifecycle(client, queryId)
	});
}

export function useClearBookingStatusOverride(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: () => clearBookingStatusOverride(queryId),
		onSuccess: () => invalidateLifecycle(client, queryId)
	});
}

export function useUpdateBookingDiscount(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ bookingId, discountPkr, note }: { bookingId: string; discountPkr: number; note: string | null }) =>
			updateBookingDiscount(bookingId, discountPkr, note).then(() =>
				reconcileBookingLifecycle(queryId)
			),
		onSuccess: () => invalidateLifecycle(client, queryId)
	});
}
