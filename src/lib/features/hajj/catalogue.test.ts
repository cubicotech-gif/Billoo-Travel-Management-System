import { describe, expect, it } from 'vitest';
import { formatSpan, optionStays, packageLabel, summarizeStays } from './catalogue';
import type { HajjDay } from './types';

const day = (n: number, over: Partial<HajjDay>): HajjDay => ({
	id: `d${n}`,
	package_id: 'p',
	day_no: n,
	date_ad: `2027-05-${String(6 + n).padStart(2, '0')}`,
	date_ad_end: null,
	hijri_label: null,
	city_label: 'Makkah',
	kind: 'stay',
	hotel_a: 'X',
	stars_a: 5,
	hotel_b: null,
	stars_b: null,
	...over
});

// UB001-shaped: Medinah first, then Makkah (A: Intercon, B: Fairmont), then Mashaer.
const days: HajjDay[] = [
	day(1, { city_label: 'To Medinah', hotel_a: 'Dar Al Taqwa' }),
	day(2, { city_label: 'Medinah', hotel_a: 'Dar Al Taqwa' }),
	day(3, {
		city_label: 'To Makkah',
		hotel_a: 'Dar Al Tawhid Intercontinental',
		hotel_b: 'Fairmont Clock Tower'
	}),
	day(4, {
		city_label: 'Makkah',
		hotel_a: 'Dar Al Tawhid Intercontinental',
		hotel_b: 'Fairmont Clock Tower'
	}),
	day(5, { city_label: 'To Mina', kind: 'mina', hotel_a: 'Zone 1', stars_a: null }),
	day(6, { city_label: 'Mina', kind: 'arafat', hotel_a: 'Arafat', stars_a: null }),
	day(7, {
		city_label: 'To Makkah',
		hotel_a: 'Dar Al Tawhid Intercontinental',
		hotel_b: 'Fairmont Clock Tower'
	}),
	day(8, { city_label: '', kind: 'departure', hotel_a: 'Departure to Airport', stars_a: null })
];

describe('optionStays', () => {
	it('lists hotels in trip order with nights, skipping Mashaer and departure rows', () => {
		const a = optionStays(days, 'A');
		// The Makkah room is retained through Mina, so the two stays are one hotel.
		expect(a.map((s) => [s.city, s.name, s.nights])).toEqual([
			['Medinah', 'Dar Al Taqwa', 2],
			['Makkah', 'Dar Al Tawhid Intercontinental', 3]
		]);
	});

	it('uses the Option B hotel where the brochure splits the row, else falls back to A', () => {
		const b = optionStays(days, 'B');
		expect(b.map((s) => s.name)).toEqual(['Dar Al Taqwa', 'Fairmont Clock Tower']);
	});

	it('places a Medinah hotel under Medinah even when the row is labelled Makkah (UB003 day 2)', () => {
		const odd = [day(1, { city_label: 'Makkah', hotel_a: 'Dar Al Taqwa' })];
		expect(optionStays(odd, 'A')[0]?.city).toBe('Medinah');
	});
});

describe('summaries', () => {
	it('summarises hotels per city, each hotel once', () => {
		expect(summarizeStays(optionStays(days, 'A'))).toBe(
			'Makkah: Dar Al Tawhid Intercontinental · Medinah: Dar Al Taqwa'
		);
	});

	it('formats the package date span', () => {
		expect(formatSpan('2027-05-07', '2027-05-19')).toBe('7 May – 19 May 2027');
	});

	it('labels a package with its printed duration', () => {
		expect(
			packageLabel({ code: 'UB001', title: 'Intercon – Medinah First', duration_label: '13 Days' })
		).toBe('UB001 — Intercon – Medinah First (13 Days)');
	});
});
