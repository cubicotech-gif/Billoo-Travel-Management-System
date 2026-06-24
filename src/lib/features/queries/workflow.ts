import type { BookingStatus, QueryStatus } from '$lib/database.types';

// The 4-stage query pipeline (+ Cancelled side-exit), per docs/SPEC.md:
//   New Query -> Working -> Quoted -> Booking
// "Completed" is a booking status (below), not a stage. The DB
// queries.status CHECK constraint is the source of truth.

export type StageTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface WorkflowStage {
	status: QueryStatus;
	label: string;
	/** One-line summary of what you do in this stage. */
	hint: string;
	tone: StageTone;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
	{ status: 'New Query', label: 'New Query', hint: 'Logged, not yet priced.', tone: 'warning' },
	{ status: 'Working', label: 'Working', hint: 'Building the quotation.', tone: 'info' },
	{
		status: 'Quoted',
		label: 'Quoted',
		hint: 'Quotation sent, awaiting the client.',
		tone: 'info'
	},
	{
		status: 'Booking',
		label: 'Booking in progress',
		hint: 'Vendor booking, documents and payment.',
		tone: 'success'
	},
	{ status: 'Cancelled', label: 'Cancelled', hint: 'Closed without booking.', tone: 'danger' }
];

/** Ordered pipeline, excluding the Cancelled side-exit (board columns / stepper). */
export const MAIN_STAGES: WorkflowStage[] = WORKFLOW_STAGES.filter((s) => s.status !== 'Cancelled');

export const STAGE_BY_STATUS: Record<QueryStatus, WorkflowStage> = Object.fromEntries(
	WORKFLOW_STAGES.map((s) => [s.status, s])
) as Record<QueryStatus, WorkflowStage>;

/**
 * Safe stage lookup. Falls back to a neutral stage showing the raw value, so a
 * stray/legacy status (e.g. from before a migration) renders instead of
 * crashing the page.
 */
export function stageFor(status: string): WorkflowStage {
	return (
		STAGE_BY_STATUS[status as QueryStatus] ?? {
			status: status as QueryStatus,
			label: status || 'Unknown',
			hint: '',
			tone: 'neutral'
		}
	);
}

const ORDER: QueryStatus[] = MAIN_STAGES.map((s) => s.status);

/** Next stage in the linear flow, or null at Booking / Cancelled. */
export function nextStatus(current: QueryStatus): QueryStatus | null {
	const idx = ORDER.indexOf(current);
	if (idx === -1) return null; // Cancelled
	return ORDER[idx + 1] ?? null;
}

/** Previous stage, or null at the first stage / Cancelled. */
export function prevStatus(current: QueryStatus): QueryStatus | null {
	const idx = ORDER.indexOf(current);
	if (idx <= 0) return null;
	return ORDER[idx - 1] ?? null;
}

export function isCancelled(status: QueryStatus): boolean {
	return status === 'Cancelled';
}

// --- Stage aging / stuck-deal alerts -------------------------------------

/** Soft SLA per stage (days). Past this, a query is flagged as stuck. */
export const STAGE_SLA_DAYS: Record<QueryStatus, number> = {
	'New Query': 2,
	Working: 3,
	Quoted: 3,
	Booking: 7,
	Cancelled: Number.POSITIVE_INFINITY
};

/** Whole days since an ISO timestamp (0 if missing). */
export function daysSince(iso: string | null): number {
	if (!iso) return 0;
	return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function isStuck(status: QueryStatus, days: number): boolean {
	return days > (STAGE_SLA_DAYS[status] ?? Number.POSITIVE_INFINITY);
}

// --- Booking payment / check-in status -----------------------------------

export interface BookingStatusMeta {
	status: BookingStatus;
	/** Short label for chips/columns. */
	label: string;
	tone: StageTone;
}

export const BOOKING_STATUSES: BookingStatusMeta[] = [
	{ status: 'Pending Payment', label: 'Pending payment', tone: 'warning' },
	{ status: 'Payment Done - Check-in Left', label: 'Paid · check-in left', tone: 'info' },
	{ status: 'Payment Pending - Check-in Left', label: 'Unpaid · check-in left', tone: 'warning' },
	{ status: 'Payment Pending - Travel Done', label: 'Trip over · unpaid', tone: 'danger' },
	{ status: 'Completed', label: 'Completed', tone: 'success' }
];

export const BOOKING_STATUS_TONE: Record<BookingStatus, StageTone> = Object.fromEntries(
	BOOKING_STATUSES.map((b) => [b.status, b.tone])
) as Record<BookingStatus, StageTone>;

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = Object.fromEntries(
	BOOKING_STATUSES.map((b) => [b.status, b.label])
) as Record<BookingStatus, string>;

/**
 * The four post-"mark complete" lifecycle buckets (everything except the
 * pre-complete 'Pending Payment' building state). The money/date auto-router
 * only moves a booking between these.
 */
export const POST_COMPLETE_STATUSES: BookingStatus[] = [
	'Payment Done - Check-in Left',
	'Payment Pending - Check-in Left',
	'Payment Pending - Travel Done',
	'Completed'
];

/** A booking is settled/closed once it reaches Completed. */
export function isSettled(status: QueryStatus, bookingStatus: BookingStatus | null): boolean {
	return status === 'Booking' && bookingStatus === 'Completed';
}
