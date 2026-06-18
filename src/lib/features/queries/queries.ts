import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { QueryStatus } from '$lib/database.types';
import {
	createQuery as apiCreateQuery,
	createService,
	deleteService,
	getQuery,
	listDeletedQueries,
	listQueries,
	listServices,
	restoreQuery,
	setQueryStatus,
	softDeleteQuery,
	updateQuery as apiUpdateQuery,
	updateService
} from './api';
import { addReply, deleteReply, listReplies, type NewQueryReply } from './replies';
import type { NewQuery, NewQueryService, QueryServiceUpdate, QueryUpdate } from './types';

// TanStack Query hooks for the queries feature. Components consume these and
// stay free of data-fetching plumbing.

const QUERIES_KEY = ['queries'] as const;
const DELETED_KEY = ['queries', 'deleted'] as const;
const queryKey = (id: string) => ['queries', id] as const;
const servicesKey = (queryId: string) => ['queries', queryId, 'services'] as const;

export function useQueries() {
	return createQuery({
		queryKey: QUERIES_KEY,
		queryFn: listQueries
	});
}

export function useDeletedQueries() {
	return createQuery({ queryKey: DELETED_KEY, queryFn: listDeletedQueries });
}

function invalidateLists(client: ReturnType<typeof useQueryClient>) {
	client.invalidateQueries({ queryKey: QUERIES_KEY });
	client.invalidateQueries({ queryKey: DELETED_KEY });
}

export function useSoftDeleteQuery() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => softDeleteQuery(id),
		onSuccess: (q) => {
			invalidateLists(client);
			client.invalidateQueries({ queryKey: queryKey(q.id) });
		}
	});
}

export function useRestoreQuery() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => restoreQuery(id),
		onSuccess: (q) => {
			invalidateLists(client);
			client.invalidateQueries({ queryKey: queryKey(q.id) });
		}
	});
}

export function useQueryDetail(id: string) {
	return createQuery({
		queryKey: queryKey(id),
		queryFn: () => getQuery(id)
	});
}

export function useCreateQuery() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewQuery) => apiCreateQuery(input),
		onSuccess: () => client.invalidateQueries({ queryKey: QUERIES_KEY })
	});
}

export function useSetQueryStatus() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, status }: { id: string; status: QueryStatus }) => setQueryStatus(id, status),
		onSuccess: (q) => {
			client.invalidateQueries({ queryKey: QUERIES_KEY });
			client.invalidateQueries({ queryKey: queryKey(q.id) });
		}
	});
}

/** Patch arbitrary query fields — used by the per-stage action panels. */
export function useUpdateQuery() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: QueryUpdate }) => apiUpdateQuery(id, patch),
		onSuccess: (q) => {
			client.invalidateQueries({ queryKey: QUERIES_KEY });
			client.invalidateQueries({ queryKey: queryKey(q.id) });
		}
	});
}

// --- Client replies ------------------------------------------------------

const repliesKey = (queryId: string) => ['queries', queryId, 'replies'] as const;

export function useReplies(queryId: string) {
	return createQuery({
		queryKey: repliesKey(queryId),
		queryFn: () => listReplies(queryId)
	});
}

/**
 * Log a client reply. Saving one always reopens the query into Working (a reply
 * means the ball is back in our court), so we bump the status alongside.
 */
export function useAddReply(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: async (input: NewQueryReply) => {
			const reply = await addReply(input);
			await setQueryStatus(queryId, 'Working');
			return reply;
		},
		onSuccess: () => {
			client.invalidateQueries({ queryKey: repliesKey(queryId) });
			client.invalidateQueries({ queryKey: QUERIES_KEY });
			client.invalidateQueries({ queryKey: queryKey(queryId) });
		}
	});
}

export function useDeleteReply(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deleteReply(id),
		onSuccess: () => client.invalidateQueries({ queryKey: repliesKey(queryId) })
	});
}

// --- Services ------------------------------------------------------------

export function useQueryServices(queryId: string) {
	return createQuery({
		queryKey: servicesKey(queryId),
		queryFn: () => listServices(queryId)
	});
}

/** Invalidate everything that a service change can affect. */
function invalidateForQuery(client: ReturnType<typeof useQueryClient>, queryId: string) {
	client.invalidateQueries({ queryKey: servicesKey(queryId) });
	client.invalidateQueries({ queryKey: queryKey(queryId) });
	client.invalidateQueries({ queryKey: QUERIES_KEY });
}

export function useCreateService(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewQueryService) => createService(input),
		onSuccess: () => invalidateForQuery(client, queryId)
	});
}

export function useUpdateService(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: QueryServiceUpdate }) =>
			updateService(id, queryId, patch),
		onSuccess: () => invalidateForQuery(client, queryId)
	});
}

export function useDeleteService(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deleteService(id, queryId),
		onSuccess: () => invalidateForQuery(client, queryId)
	});
}
