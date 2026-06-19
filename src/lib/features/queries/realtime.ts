import type { QueryClient } from '@tanstack/svelte-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';

// Live updates: when any user changes a query (or its activity/replies), refresh
// the relevant TanStack caches so every open console stays in sync. Best-effort —
// if the project hasn't enabled realtime on these tables, the channel simply
// never fires and nothing breaks.

type Row = Partial<{ query_id: string }>;

function queryIdOf(payload: RealtimePostgresChangesPayload<Row>): string | undefined {
	const fresh = payload.new as Row;
	const stale = payload.old as Row;
	return fresh?.query_id ?? stale?.query_id;
}

/** Subscribe to query-related changes. Returns an unsubscribe function. */
export function subscribeQueriesRealtime(client: QueryClient): () => void {
	const channel = supabase
		.channel('queries-live')
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'queries' },
			() => client.invalidateQueries({ queryKey: ['queries'] })
		)
		.on('postgres_changes', { event: '*', schema: 'public', table: 'query_activity' }, (payload) => {
			const id = queryIdOf(payload as RealtimePostgresChangesPayload<Row>);
			if (id) client.invalidateQueries({ queryKey: ['queries', id, 'activity'] });
		})
		.on('postgres_changes', { event: '*', schema: 'public', table: 'query_replies' }, (payload) => {
			const id = queryIdOf(payload as RealtimePostgresChangesPayload<Row>);
			if (id) client.invalidateQueries({ queryKey: ['queries', id, 'replies'] });
		})
		.subscribe();

	return () => {
		supabase.removeChannel(channel);
	};
}
