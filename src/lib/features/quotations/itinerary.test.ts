import { describe, expect, it } from 'vitest';
import { applyDateRange, applyNights, moveStay, rechain, totalNights, type ChainStay } from './itinerary';

const stay = (checkIn = '', checkOut = '', nights = 0): ChainStay => ({ checkIn, checkOut, nights });

describe('itinerary chaining', () => {
	it('chains the next stay check-in to the previous check-out', () => {
		const stays = [stay('2026-04-04', '2026-04-08', 4), stay('', '', 4)];
		rechain(stays);
		expect(stays[1]?.checkIn).toBe('2026-04-08');
		expect(stays[1]?.checkOut).toBe('2026-04-12');
	});

	it('derives nights when a date range is picked', () => {
		const stays = [stay('2026-04-04', '2026-04-08', 0)];
		applyDateRange(stays, 0);
		expect(stays[0]?.nights).toBe(4);
	});

	it('split-stay in one city chains dates across two hotels', () => {
		// 8 nights split 4 + 4 across two Makkah hotels.
		const stays = [stay('2026-04-04', '', 4), stay('', '', 4)];
		rechain(stays);
		expect(stays[0]?.checkOut).toBe('2026-04-08');
		expect(stays[1]?.checkIn).toBe('2026-04-08');
		expect(stays[1]?.checkOut).toBe('2026-04-12');
		expect(totalNights(stays)).toBe(8);
	});

	it('supports return visits (same city, non-consecutive) without merging', () => {
		const stays = [stay('2026-04-04', '', 4), stay('', '', 3), stay('', '', 6)];
		rechain(stays);
		// Makkah 4 → Madinah 3 → Makkah 6, dates flow through.
		expect(stays[1]?.checkIn).toBe('2026-04-08');
		expect(stays[2]?.checkIn).toBe('2026-04-11');
		expect(stays[2]?.checkOut).toBe('2026-04-17');
		expect(stays.length).toBe(3);
	});

	it('re-chains dates after a reorder, preserving each stay duration', () => {
		const stays = [stay('2026-04-04', '', 4), stay('', '', 3)];
		rechain(stays);
		moveStay(stays, 1, 0); // put the 3-night stay first
		expect(stays[0]?.nights).toBe(3);
		expect(stays[0]?.checkIn).toBe('2026-04-04');
		expect(stays[0]?.checkOut).toBe('2026-04-07');
		expect(stays[1]?.checkIn).toBe('2026-04-07');
		expect(stays[1]?.nights).toBe(4);
	});

	it('fills a default check-in when nights are entered with no date', () => {
		const stays = [stay('', '', 5)];
		applyNights(stays, 0);
		expect(stays[0]?.checkIn).not.toBe('');
		expect(stays[0]?.checkOut).not.toBe('');
	});
});
