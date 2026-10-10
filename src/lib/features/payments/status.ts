// Pure payment-status rules (no Supabase import, so they are unit-testable).

export type PaymentStatus = 'paid' | 'pending' | 'overdue';

/** Today as a local 'YYYY-MM-DD' string. */
export function todayLocalISO(now: Date = new Date()): string {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Effective status: a pending payment is overdue only once its due DATE is
 * before today — a payment due today is still pending, not already late.
 */
export function paymentStatus(
	p: { status: string; due_date: string | null },
	today: string = todayLocalISO()
): PaymentStatus {
	if (p.status === 'paid') return 'paid';
	if (p.due_date && p.due_date.slice(0, 10) < today) return 'overdue';
	return 'pending';
}
