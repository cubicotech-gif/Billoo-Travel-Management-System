import { supabase } from '$lib/supabase';
import type { Hotel, NewHotel } from './types';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

/** All active canonical hotels (small list — filtered client-side for search). */
export async function listHotels(): Promise<Hotel[]> {
	return unwrap(
		await supabase
			.from('hotels')
			.select('*')
			.eq('active', true)
			.order('name', { ascending: true })
	);
}

export async function createHotel(input: NewHotel): Promise<Hotel> {
	return unwrap<Hotel>(await supabase.from('hotels').insert(input).select().single());
}
