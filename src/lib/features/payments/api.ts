import { supabase } from '$lib/supabase';
import type { Database } from '$lib/database.types';

export type Payment = Database['public']['Tables']['query_payments']['Row'];
export type NewPayment = Database['public']['Tables']['query_payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['query_payments']['Update'];

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export async function listPayments(queryId: string): Promise<Payment[]> {
	return unwrap(
		await supabase
			.from('query_payments')
			.select('*')
			.eq('query_id', queryId)
			.order('due_date', { ascending: true, nullsFirst: false })
			.order('created_at', { ascending: true })
	);
}

export async function getPayment(id: string): Promise<Payment> {
	return unwrap(await supabase.from('query_payments').select('*').eq('id', id).single());
}

export async function createPayment(input: NewPayment): Promise<Payment> {
	return unwrap<Payment>(await supabase.from('query_payments').insert(input).select().single());
}

export async function updatePayment(id: string, patch: PaymentUpdate): Promise<Payment> {
	return unwrap<Payment>(
		await supabase.from('query_payments').update(patch).eq('id', id).select().single()
	);
}

export async function deletePayment(id: string): Promise<void> {
	const { error } = await supabase.from('query_payments').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

export type PaymentStatus = 'paid' | 'pending' | 'overdue';

/** Effective status: a pending payment past its due date is overdue. */
export function paymentStatus(p: Pick<Payment, 'status' | 'due_date'>): PaymentStatus {
	if (p.status === 'paid') return 'paid';
	if (p.due_date && new Date(p.due_date).getTime() < Date.now()) return 'overdue';
	return 'pending';
}
