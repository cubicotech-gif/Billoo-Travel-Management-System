import type { CityBlock, PackageType } from '$lib/database.types';

export type { CityBlock };

export const TRIP_TYPES: PackageType[] = ['Umrah', 'Umrah Plus', 'Tour', 'Leisure'];

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

/** Holy-city blocks have fixed names; only Umrah-Plus extras / tours are editable. */
export function isFixedCity(type: PackageType, index: number): boolean {
	return isUmrahType(type) && index < 2;
}
