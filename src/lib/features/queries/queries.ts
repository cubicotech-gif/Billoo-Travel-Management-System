import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { QueryStatus } from '$lib/database.types';
import { createQuery as apiCreateQuery, listQueries, setQueryStatus } from './api';
import type { NewQuery } from './types';

// TanStack Query hooks for the queries feature. Components consume these and
// stay free of data-fetching plumbing.

const QUERIES_KEY = ['queries'] as const;

export function useQueries() {
	return createQuery({
		queryKey: QUERIES_KEY,
		queryFn: listQueries
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
		mutationFn: ({ id, status }: { id: string; status: QueryStatus }) =>
			setQueryStatus(id, status),
		onSuccess: () => client.invalidateQueries({ queryKey: QUERIES_KEY })
	});
}
