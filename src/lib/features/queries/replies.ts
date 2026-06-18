import { supabase } from '$lib/supabase';
import type { Database } from '$lib/database.types';

// Client reply thread on a query (api + types). One row per response from the
// client; logging one bumps the query back to Working — see the board.

export type QueryReply = Database['public']['Tables']['query_replies']['Row'];
export type NewQueryReply = Database['public']['Tables']['query_replies']['Insert'];

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

/** Oldest-first so the thread reads top-to-bottom. */
export async function listReplies(queryId: string): Promise<QueryReply[]> {
	return unwrap(
		await supabase
			.from('query_replies')
			.select('*')
			.eq('query_id', queryId)
			.order('created_at', { ascending: true })
	);
}

export async function addReply(input: NewQueryReply): Promise<QueryReply> {
	return unwrap(await supabase.from('query_replies').insert(input).select().single());
}

export async function deleteReply(id: string): Promise<void> {
	const { error } = await supabase.from('query_replies').delete().eq('id', id);
	if (error) throw new Error(error.message);
}
