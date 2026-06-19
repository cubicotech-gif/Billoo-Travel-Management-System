import { supabase } from '$lib/supabase';
import { auth } from '$lib/stores/auth.svelte';
import type { Database } from '$lib/database.types';

// The query activity log: a real history of what happened to a query. Writes are
// best-effort — logging must never break the action it's recording.

export type QueryActivity = Database['public']['Tables']['query_activity']['Row'];
export type ActivityKind = 'stage' | 'quote' | 'message' | 'booking' | 'payment' | 'note';

export async function listActivity(queryId: string): Promise<QueryActivity[]> {
	const { data, error } = await supabase
		.from('query_activity')
		.select('*')
		.eq('query_id', queryId)
		.order('created_at', { ascending: false })
		.limit(50);
	if (error) throw new Error(error.message);
	return data ?? [];
}

/**
 * Record an event. Swallows its own errors (e.g. table missing before the
 * migration is applied) so the primary mutation always succeeds.
 */
export async function logActivity(input: {
	query_id: string;
	kind: ActivityKind;
	summary: string;
}): Promise<void> {
	try {
		const { error } = await supabase
			.from('query_activity')
			.insert({ ...input, actor: auth.user?.email ?? null });
		if (error) console.warn('activity log skipped:', error.message);
	} catch (e) {
		console.warn('activity log skipped:', e);
	}
}
