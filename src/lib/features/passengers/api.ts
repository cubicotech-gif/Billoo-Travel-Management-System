import { supabase } from '$lib/supabase';
import type { Query } from '$features/queries/types';
import type { NewPassenger, Passenger, PassengerUpdate } from './types';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export async function listPassengers(): Promise<Passenger[]> {
	return unwrap(
		await supabase
			.from('passengers')
			.select('*')
			.eq('is_deleted', false)
			.order('created_at', { ascending: false })
	);
}

export async function getPassenger(id: string): Promise<Passenger> {
	return unwrap(await supabase.from('passengers').select('*').eq('id', id).single());
}

export async function createPassenger(input: NewPassenger): Promise<Passenger> {
	return unwrap<Passenger>(await supabase.from('passengers').insert(input).select().single());
}

export async function updatePassenger(id: string, patch: PassengerUpdate): Promise<Passenger> {
	return unwrap<Passenger>(
		await supabase.from('passengers').update(patch).eq('id', id).select().single()
	);
}

/** Soft-delete: preserve the profile and its history. */
export async function deletePassenger(id: string): Promise<void> {
	const { error } = await supabase
		.from('passengers')
		.update({ is_deleted: true, status: 'inactive' })
		.eq('id', id);
	if (error) throw new Error(error.message);
}

/** A passenger's full query history, newest first. */
export async function listPassengerQueries(passengerId: string): Promise<Query[]> {
	return unwrap(
		await supabase
			.from('queries')
			.select('*')
			.eq('passenger_id', passengerId)
			.order('created_at', { ascending: false })
	);
}
