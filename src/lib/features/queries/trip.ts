import type { CityBlock, PackageType } from '$lib/database.types';

export type { CityBlock };

export const TRIP_TYPES: PackageType[] = ['Umrah', 'Umrah Plus', 'Tour', 'Leisure'];

// Pure-Umrah trips only visit the two holy cities, but in any order and any
// number of times (e.g. Makkah → Madinah → Makkah on a long package).
export const UMRAH_CITIES = ['Makkah', 'Madinah'] as const;

export function newCity(city = ''): CityBlock {
	return { city, arrival_date: null, nights: 0, hotel_preference: '', activities: 0 };
}

/** Default city blocks for a trip type. */
export function seedCities(type: PackageType): CityBlock[] {
	if (type === 'Umrah') return [newCity('Makkah'), newCity('Madinah')];
	if (type === 'Umrah Plus') return [newCity('Makkah'), newCity('Madinah'), newCity('')];
	return [newCity('')];
}

export function isUmrahType(type: PackageType): boolean {
	return type === 'Umrah' || type === 'Umrah Plus';
}

/** Sum nights across every block matching a holy city (cities may repeat). */
export function nightsForCity(cities: CityBlock[], name: string): number | null {
	const matches = cities.filter((c) => c.city.trim().toLowerCase() === name.toLowerCase());
	if (matches.length === 0) return null;
	return matches.reduce((a, c) => a + (Number(c.nights) || 0), 0);
}
