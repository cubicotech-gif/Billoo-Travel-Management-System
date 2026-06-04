import { supabase } from '$lib/supabase';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export interface ClientReceivable {
	queryId: string;
	queryNumber: string;
	clientName: string;
	selling: number;
	paid: number;
	balance: number;
}

/** Queries with money still owed by the client (selling − payments received). */
export async function listClientReceivables(): Promise<ClientReceivable[]> {
	const queries = unwrap<
		{ id: string; query_number: string; client_name: string; selling_price: number; status: string }[]
	>(
		await supabase
			.from('queries')
			.select('id, query_number, client_name, selling_price, status')
			.gt('selling_price', 0)
			.neq('status', 'Cancelled')
	);
	const payments = unwrap<{ query_id: string; amount: number; status: string }[]>(
		await supabase.from('query_payments').select('query_id, amount, status').eq('status', 'paid')
	);

	const paidByQuery = new Map<string, number>();
	for (const p of payments) {
		paidByQuery.set(p.query_id, (paidByQuery.get(p.query_id) ?? 0) + Number(p.amount));
	}

	return queries
		.map((q) => {
			const selling = Number(q.selling_price);
			const paid = paidByQuery.get(q.id) ?? 0;
			return {
				queryId: q.id,
				queryNumber: q.query_number,
				clientName: q.client_name,
				selling,
				paid,
				balance: selling - paid
			};
		})
		.filter((r) => r.balance > 0)
		.sort((a, b) => b.balance - a.balance);
}
