// Small date helpers for the hotel range picker. Dates are ISO 'YYYY-MM-DD'
// strings; nights = whole days between check-in and check-out.

export function toISO(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export function fromISO(s: string): Date {
	const [y, m, d] = s.split('-').map(Number);
	return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
	const d = fromISO(iso);
	d.setDate(d.getDate() + days);
	return toISO(d);
}

/** Default check-in: today + 1 month. */
export function defaultCheckIn(): string {
	const d = new Date();
	d.setMonth(d.getMonth() + 1);
	return toISO(d);
}

/** Whole nights between two ISO dates (0 if invalid/negative). */
export function nightsBetween(checkIn: string, checkOut: string): number {
	if (!checkIn || !checkOut) return 0;
	const ms = fromISO(checkOut).getTime() - fromISO(checkIn).getTime();
	const n = Math.round(ms / 86_400_000);
	return n > 0 ? n : 0;
}
