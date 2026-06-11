import { addDays, defaultCheckIn, nightsBetween } from './dates';

// Sequential, stay-based itinerary logic. Each stay has check-in / check-out
// dates and a night count; stays chain so the next stay's check-in defaults to
// the previous stay's check-out. Pure & unit tested — the builder mutates a
// richer object but only these three fields drive the chaining.

export interface ChainStay {
	checkIn: string;
	checkOut: string;
	nights: number;
	/** When true the user pinned this stay's check-in — don't auto-chain it. */
	lockCheckIn?: boolean;
}

/**
 * Re-chain an ordered list of stays in place. The FIRST stay keeps its own
 * check-in; every following stay's check-in defaults to the previous stay's
 * check-out UNLESS the user has pinned it (lockCheckIn). Each stay's nights are
 * treated as the source of truth (so reorders preserve durations and re-flow
 * the dates); if nights are unset but both dates exist, nights are derived.
 */
export function rechain(stays: ChainStay[]): void {
	for (let i = 0; i < stays.length; i++) {
		const s = stays[i];
		if (!s) continue;
		if (i > 0 && !s.lockCheckIn) {
			const prev = stays[i - 1];
			if (prev && prev.checkOut) s.checkIn = prev.checkOut;
		}
		if (s.checkIn && s.nights > 0) {
			s.checkOut = addDays(s.checkIn, s.nights);
		} else if (s.checkIn && s.checkOut) {
			s.nights = nightsBetween(s.checkIn, s.checkOut);
		}
	}
}

/** Sync a stay's nights from a freshly-picked date range, then re-chain downstream. */
export function applyDateRange(stays: ChainStay[], index: number): void {
	const s = stays[index];
	if (s) s.nights = nightsBetween(s.checkIn, s.checkOut);
	rechain(stays);
}

/** Sync a stay's check-out from an edited night count, then re-chain downstream. */
export function applyNights(stays: ChainStay[], index: number): void {
	const s = stays[index];
	if (s && s.nights > 0 && !s.checkIn) s.checkIn = defaultCheckIn();
	rechain(stays);
}

/**
 * The user manually edited a stay's check-in — pin it so chaining won't
 * overwrite it, keep its duration (nights) and re-flow the dates: the stay's
 * check-out shifts and everything downstream re-chains from it.
 */
export function pinCheckIn(stays: ChainStay[], index: number): void {
	const s = stays[index];
	if (!s) return;
	if (index > 0) s.lockCheckIn = true;
	rechain(stays);
}

/** Re-link a pinned stay back into the auto-chain (check-in follows previous). */
export function relinkCheckIn(stays: ChainStay[], index: number): void {
	const s = stays[index];
	if (!s) return;
	s.lockCheckIn = false;
	rechain(stays);
}

/** Move a stay from one position to another and re-chain dates. */
export function moveStay(stays: ChainStay[], from: number, to: number): void {
	if (to < 0 || to >= stays.length || from === to) return;
	// The itinerary keeps its start anchor: whichever stay ends up first inherits
	// the original first stay's check-in, then dates re-flow from there.
	const anchor = stays[0]?.checkIn ?? '';
	const [moved] = stays.splice(from, 1);
	if (moved) stays.splice(to, 0, moved);
	const first = stays[0];
	if (first && anchor) first.checkIn = anchor;
	rechain(stays);
}

export function totalNights(stays: { nights: number }[]): number {
	return stays.reduce((a, s) => a + (Number(s.nights) || 0), 0);
}
