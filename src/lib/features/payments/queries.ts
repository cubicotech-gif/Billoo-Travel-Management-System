import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { createPayment, deletePayment, listPayments, updatePayment } from './api';
import type { NewPayment, PaymentUpdate } from './api';

const key = (queryId: string) => ['payments', queryId] as const;

export function usePayments(queryId: string) {
	return createQuery({ queryKey: key(queryId), queryFn: () => listPayments(queryId) });
}

export function useCreatePayment(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewPayment) => createPayment(input),
		onSuccess: () => client.invalidateQueries({ queryKey: key(queryId) })
	});
}

export function useUpdatePayment(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: PaymentUpdate }) => updatePayment(id, patch),
		onSuccess: () => client.invalidateQueries({ queryKey: key(queryId) })
	});
}

export function useDeletePayment(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deletePayment(id),
		onSuccess: () => client.invalidateQueries({ queryKey: key(queryId) })
	});
}
