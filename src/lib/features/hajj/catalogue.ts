import type { HajjDay, HajjOptionCode } from './types';

// Helpers for presenting a package's itinerary (pure, unit-tested).

export type StayCity = 'Makkah' | 'Medinah';

export interface Stay {
	city: StayCity;
	name: string;
	stars: number | null;
	nights: number;
}

// The brochure labels a couple of Medinah hotel rows with a Makkah city label
// (e.g. UB003 day 2); the hotel is the more reliable signal.
const MEDINAH_HOTEL = /taqwa|taibah|aqeeq|hilton/i;

function cityOf(day: HajjDay, hotel: string): StayCity {
	if (MEDINAH_HOTEL.test(hotel)) return 'Medinah';
	return /medinah/i.test(day.city_label ?? '') ? 'Medinah' : 'Makkah';
}

/**
 * The hotels a traveller gets on a given option, in trip order, with nights
 * counted from the itinerary rows. Mina / Arafat / departure rows are skipped.
 * Option B falls back to A's hotel where the brochure doesn't split the row.
 */
export function optionStays(days: HajjDay[], option: HajjOptionCode): Stay[] {
	const stays: Stay[] = [];
	for (const d of [...days].sort((a, b) => a.day_no - b.day_no)) {
		if (d.kind !== 'stay') continue;
		const name = option === 'B' ? (d.hotel_b ?? d.hotel_a) : d.hotel_a;
		const stars = option === 'B' && d.hotel_b ? d.stars_b : d.stars_a;
		const city = cityOf(d, name);
		const last = stays.at(-1);
		if (last && last.name === name && last.city === city) last.nights += 1;
		else stays.push({ city, name, stars, nights: 1 });
	}
	return stays;
}

/** "Makkah: Dar Al Tawhid Intercontinental · Medinah: Dar Al Taqwa". */
export function summarizeStays(stays: Stay[]): string {
	const order: StayCity[] = ['Makkah', 'Medinah'];
	return order
		.map((city) => {
			const names = [...new Set(stays.filter((s) => s.city === city).map((s) => s.name))];
			return names.length ? `${city}: ${names.join(' / ')}` : null;
		})
		.filter(Boolean)
		.join(' · ');
}

/** "7 May – 19 May 2027" for a package's date span. */
export function formatSpan(start: string, end: string): string {
	const f = (iso: string) =>
		new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
	const year = end.slice(0, 4);
	return `${f(start)} – ${f(end)} ${year}`;
}

export function packageLabel(p: {
	code: string;
	title: string;
	duration_label: string | null;
}): string {
	return `${p.code} — ${p.title}${p.duration_label ? ` (${p.duration_label})` : ''}`;
}
