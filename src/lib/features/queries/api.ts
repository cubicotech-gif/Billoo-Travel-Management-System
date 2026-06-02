import { supabase } from '$lib/supabase';
import type { QueryStatus } from '$lib/database.types';
import type { NewQuery, Query, QueryUpdate } from './types';

// Thin data-access layer for queries. No UI, no caching — just typed Supabase
// calls that throw on error so TanStack Query can surface failures.

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export async function listQueries(): Promise<Query[]> {
	return unwrap(
		await supabase.from('queries').select('*').order('created_at', { ascending: false })
	);
}

export async function getQuery(id: string): Promise<Query> {
	return unwrap(await supabase.from('queries').select('*').eq('id', id).single());
}

export async function createQuery(input: NewQuery): Promise<Query> {
	return unwrap(await supabase.from('queries').insert(input).select().single());
}

export async function updateQuery(id: string, patch: QueryUpdate): Promise<Query> {
	return unwrap(await supabase.from('queries').update(patch).eq('id', id).select().single());
}

export async function setQueryStatus(id: string, status: QueryStatus): Promise<Query> {
	return updateQuery(id, { status });
}
