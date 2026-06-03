import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
	acceptQuotation,
	createQuotation,
	getQuotationLines,
	listQuotations,
	removeQuotation,
	setQuotationStatus,
	updateQuotation,
	type SaveQuotationArgs
} from './api';
import type { Quotation } from './types';

const quotationsKey = (queryId: string) => ['quotations', queryId] as const;
const linesKey = (quotationId: string) => ['quotation-lines', quotationId] as const;

export function useQuotations(queryId: string) {
	return createQuery({ queryKey: quotationsKey(queryId), queryFn: () => listQuotations(queryId) });
}

export function useQuotationLines(quotationId: string) {
	return createQuery({
		queryKey: linesKey(quotationId),
		queryFn: () => getQuotationLines(quotationId)
	});
}

function invalidate(client: ReturnType<typeof useQueryClient>, queryId: string) {
	client.invalidateQueries({ queryKey: quotationsKey(queryId) });
	client.invalidateQueries({ queryKey: ['queries', queryId] });
	client.invalidateQueries({ queryKey: ['queries'] });
}

export function useCreateQuotation(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (args: SaveQuotationArgs) => createQuotation(args),
		onSuccess: () => invalidate(client, queryId)
	});
}

export function useSetQuotationStatus(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, status }: { id: string; status: Quotation['status'] }) =>
			setQuotationStatus(id, status),
		onSuccess: () => invalidate(client, queryId)
	});
}

export function useAcceptQuotation(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (quotation: Quotation) => acceptQuotation(quotation),
		onSuccess: () => invalidate(client, queryId)
	});
}

export function useUpdateQuotation(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: { whatsapp_text?: string; label?: string | null } }) =>
			updateQuotation(id, patch),
		onSuccess: () => invalidate(client, queryId)
	});
}

export function useRemoveQuotation(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (quotation: Quotation) => removeQuotation(quotation),
		onSuccess: () => invalidate(client, queryId)
	});
}
