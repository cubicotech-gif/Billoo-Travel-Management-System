import { describe, expect, it } from 'vitest';
import {
	applyDateRange,
	applyNights,
	moveStay,
	pinCheckIn,
	rechain,
	relinkCheckIn,
	totalNights,
	type ChainStay
} from './itinerary';
import { addDays } from './dates';

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

	it('crosses month boundaries without a timezone off-by-one', () => {
		// 27 Jun + 4 nights = 1 Jul (was 30 Jun before the toISO local-parts fix).
		expect(addDays('2026-06-27', 4)).toBe('2026-07-01');
		const stays = [stay('2026-06-27', '2026-07-01', 0), stay('', '', 3)];
		applyDateRange(stays, 0);
		expect(stays[0]?.checkOut).toBe('2026-07-01');
		expect(stays[1]?.checkIn).toBe('2026-07-01');
	});

	it('pins a manually-edited check-in and re-chains downstream from it', () => {
		const stays = [stay('2026-04-04', '', 4), stay('', '', 3), stay('', '', 2)];
		rechain(stays); // stay1 checkIn → 2026-04-08
		// User overrides stay1 check-in to a later date (gap in the trip).
		const s1 = stays[1];
		if (s1) s1.checkIn = '2026-04-10';
		pinCheckIn(stays, 1);
		expect(stays[1]?.checkIn).toBe('2026-04-10');
		expect(stays[1]?.checkOut).toBe('2026-04-13');
		expect(stays[2]?.checkIn).toBe('2026-04-13'); // downstream still chains
		// Changing stay0 no longer overwrites the pinned stay1 check-in.
		const s0 = stays[0];
		if (s0) s0.nights = 6;
		rechain(stays);
		expect(stays[1]?.checkIn).toBe('2026-04-10');
	});

	it('parallel hotel shares the anchor dates and is not double-counted', () => {
		// Makkah 4N with TWO hotels (parallel), then Madinah 3N.
		const stays: ChainStay[] = [
			stay('2026-04-04', '', 4),
			{ ...stay('', '', 0), parallel: true },
			stay('', '', 3)
		];
		rechain(stays);
		// 2nd hotel mirrors stay 1's period exactly.
		expect(stays[1]?.checkIn).toBe('2026-04-04');
		expect(stays[1]?.checkOut).toBe('2026-04-08');
		expect(stays[1]?.nights).toBe(4);
		// Madinah chains from the anchor's check-out, not the parallel sibling.
		expect(stays[2]?.checkIn).toBe('2026-04-08');
		expect(stays[2]?.checkOut).toBe('2026-04-11');
		// 4 + 3 = 7 (the parallel 4 nights are not added again).
		expect(totalNights(stays)).toBe(7);
	});

	it('relinks a pinned stay back into the auto-chain', () => {
		const stays = [stay('2026-04-04', '', 4), stay('2026-04-10', '', 3)];
		const s1 = stays[1];
		if (s1) s1.lockCheckIn = true;
		relinkCheckIn(stays, 1);
		expect(stays[1]?.checkIn).toBe('2026-04-08');
	});
});
