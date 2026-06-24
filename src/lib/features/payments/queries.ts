import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { reconcileBookingLifecycle } from '$features/bookings/lifecycle-actions';
import { createPayment, deletePayment, listPayments, updatePayment } from './api';
import type { NewPayment, PaymentUpdate } from './api';

const key = (queryId: string) => ['payments', queryId] as const;

export function usePayments(queryId: string) {
	return createQuery({ queryKey: key(queryId), queryFn: () => listPayments(queryId) });
}

// Recording / editing / removing a payment can move a completed booking between
// its check-in-left buckets (or into Completed), so re-run the auto-router after
// every change and refresh the query detail that shows the badge.
async function settle(client: ReturnType<typeof useQueryClient>, queryId: string) {
	await reconcileBookingLifecycle(queryId);
	client.invalidateQueries({ queryKey: key(queryId) });
	client.invalidateQueries({ queryKey: ['queries', queryId] });
	client.invalidateQueries({ queryKey: ['booking', queryId] });
}

export function useCreatePayment(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewPayment) => createPayment(input),
		onSuccess: () => settle(client, queryId)
	});
}

export function useUpdatePayment(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: PaymentUpdate }) => updatePayment(id, patch),
		onSuccess: () => settle(client, queryId)
	});
}

export function useDeletePayment(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deletePayment(id),
		onSuccess: () => settle(client, queryId)
	});
}
