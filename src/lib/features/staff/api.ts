import { supabase } from '$lib/supabase';
import type { Database } from '$lib/database.types';

export type Staff = Database['public']['Tables']['staff']['Row'];

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export async function listStaff(): Promise<Staff[]> {
	return unwrap(
		await supabase
			.from('staff')
			.select('*')
			.eq('active', true)
			.order('name', { ascending: true })
	);
}

export async function createStaff(name: string): Promise<Staff> {
	return unwrap<Staff>(await supabase.from('staff').insert({ name }).select().single());
}

/** Remove = deactivate, so existing query attributions stay intact. */
export async function removeStaff(id: string): Promise<void> {
	const { error } = await supabase.from('staff').update({ active: false }).eq('id', id);
	if (error) throw new Error(error.message);
}
