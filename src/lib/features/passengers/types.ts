import type { Database } from '$lib/database.types';

export type Passenger = Database['public']['Tables']['passengers']['Row'];
export type NewPassenger = Database['public']['Tables']['passengers']['Insert'];
export type PassengerUpdate = Database['public']['Tables']['passengers']['Update'];

export function fullName(p: Pick<Passenger, 'first_name' | 'last_name'>): string {
	return `${p.first_name} ${p.last_name}`.trim();
}

/** Split a single typed name into the table's first/last columns. */
export function splitName(name: string): { first_name: string; last_name: string } {
	const parts = name.trim().split(/\s+/);
	const first_name = parts.shift() ?? name.trim();
	return { first_name, last_name: parts.join(' ') };
}
