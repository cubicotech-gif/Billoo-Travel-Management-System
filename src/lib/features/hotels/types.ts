import type { Database, HotelCity } from '$lib/database.types';

export type Hotel = Database['public']['Tables']['hotels']['Row'];
export type NewHotel = Database['public']['Tables']['hotels']['Insert'];

export const HOTEL_CITY_OPTIONS: { value: HotelCity; label: string }[] = [
	{ value: 'makkah', label: 'Makkah' },
	{ value: 'madinah', label: 'Madinah' },
	{ value: 'other', label: 'Other' }
];

/** Display label for a city enum. */
export function cityLabel(c: HotelCity | string | null): string {
	return c === 'makkah' ? 'Makkah' : c === 'madinah' ? 'Madinah' : 'Other';
}

/** Map a free-text city ('Makkah', 'mecca', …) to the city enum. */
export function cityToEnum(s: string | null): HotelCity {
	const v = (s ?? '').trim().toLowerCase();
	if (v.startsWith('makk') || v.startsWith('mecc') || v.startsWith('maka')) return 'makkah';
	if (v.startsWith('madin') || v.startsWith('medin')) return 'madinah';
	return 'other';
}

/** Does this hotel match a search query, across its name AND aliases? */
export function hotelMatches(h: Hotel, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	if (h.name.toLowerCase().includes(q)) return true;
	return (h.aliases ?? []).some((a) => a.toLowerCase().includes(q));
}
