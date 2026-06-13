import { supabase } from '$lib/supabase';
import type { QueryStatus } from '$lib/database.types';
import { rollupNumbers } from './totals';
import type {
	NewQuery,
	NewQueryService,
	Query,
	QueryService,
	QueryServiceUpdate,
	QueryUpdate
} from './types';

// Thin data-access layer for queries. No UI, no caching — just typed Supabase
// calls that throw on error so TanStack Query can surface failures.

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export async function listQueries(): Promise<Query[]> {
	return unwrap(
		await supabase
			.from('queries')
			.select('*')
			.eq('is_deleted', false)
			.order('created_at', { ascending: false })
	);
}

export async function listDeletedQueries(): Promise<Query[]> {
	return unwrap(
		await supabase
			.from('queries')
			.select('*')
			.eq('is_deleted', true)
			.order('deleted_at', { ascending: false })
	);
}

/** Soft-delete: hide from the board but keep the row and its history. */
export async function softDeleteQuery(id: string): Promise<Query> {
	return updateQuery(id, { is_deleted: true, deleted_at: new Date().toISOString() });
}

export async function restoreQuery(id: string): Promise<Query> {
	return updateQuery(id, { is_deleted: false, deleted_at: null });
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
	// Stamp the stage change so days-in-stage / stuck alerts are accurate.
	return updateQuery(id, { status, stage_changed_at: new Date().toISOString() });
}

// --- Services ------------------------------------------------------------

export async function listServices(queryId: string): Promise<QueryService[]> {
	return unwrap(
		await supabase
			.from('query_services')
			.select('*')
			.eq('query_id', queryId)
			.order('created_at', { ascending: true })
	);
}

/**
 * Recompute the parent query's cost/selling from its services and persist it,
 * so dashboard totals and the queries list stay in sync. profit/profit_margin
 * are generated columns in Postgres and update automatically.
 */
async function syncQueryTotals(queryId: string): Promise<void> {
	const services = await listServices(queryId);
	const { cost, selling } = rollupNumbers(services);
	await updateQuery(queryId, { cost_price: cost, selling_price: selling });
}

export async function createService(input: NewQueryService): Promise<QueryService> {
	const service = unwrap<QueryService>(
		await supabase.from('query_services').insert(input).select().single()
	);
	await syncQueryTotals(input.query_id);
	return service;
}

export async function updateService(
	id: string,
	queryId: string,
	patch: QueryServiceUpdate
): Promise<QueryService> {
	const service = unwrap<QueryService>(
		await supabase.from('query_services').update(patch).eq('id', id).select().single()
	);
	await syncQueryTotals(queryId);
	return service;
}

export async function deleteService(id: string, queryId: string): Promise<void> {
	const { error } = await supabase.from('query_services').delete().eq('id', id);
	if (error) throw new Error(error.message);
	await syncQueryTotals(queryId);
}
