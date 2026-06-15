// Operations / Follow-ups: once a deal is *booked* it leaves the sales kanban
// and lives here, grouped into follow-up lanes derived purely from
// `booking_status` (no schema change — this is a view over existing data).
import type { Query } from '$features/queries/types';
import type { BookingStatus } from '$lib/database.types';

export type LaneId = 'payments' | 'checkins' | 'completed';

export interface OpsLane {
	id: LaneId;
	label: string;
	hint: string;
	tone: 'warning' | 'info' | 'success';
	statuses: BookingStatus[];
}

export const OPS_LANES: OpsLane[] = [
	{
		id: 'payments',
		label: 'Payments Due',
		hint: 'Balance outstanding — chase the payment.',
		tone: 'warning',
		statuses: ['Pending Payment', 'Partial Payment', 'Check-in Done - Payment Pending']
	},
	{
		id: 'checkins',
		label: 'Check-ins',
		hint: 'Paid — confirm hotel check-in / travel.',
		tone: 'info',
		statuses: ['Payment Done - Check-in Pending']
	},
	{
		id: 'completed',
		label: 'Completed',
		hint: 'Settled and closed.',
		tone: 'success',
		statuses: ['Completed']
	}
];

/** A booked deal = in the Booking stage with a booking_status assigned. */
export function isBooked(q: Pick<Query, 'status' | 'booking_status'>): boolean {
	return q.status === 'Booking' && q.booking_status != null;
}

/** Which follow-up lane a booking status belongs to. */
export function laneFor(status: BookingStatus): LaneId {
	for (const lane of OPS_LANES) if (lane.statuses.includes(status)) return lane.id;
	return 'payments';
}

export interface OpsCard {
	query: Query;
	selling: number;
	advance: number;
	/** Outstanding balance, floored at zero (display figure). */
	balance: number;
}

export function toCard(q: Query): OpsCard {
	const selling = Number(q.selling_price) || 0;
	const advance = Number(q.advance_payment_amount ?? 0) || 0;
	return { query: q, selling, advance, balance: Math.max(0, selling - advance) };
}

export type LaneMap = Record<LaneId, OpsCard[]>;

/** Group booked, non-deleted queries into their follow-up lanes. */
export function groupIntoLanes(queries: Query[]): LaneMap {
	const out: LaneMap = { payments: [], checkins: [], completed: [] };
	for (const q of queries) {
		if (q.is_deleted) continue;
		if (!isBooked(q)) continue;
		out[laneFor(q.booking_status as BookingStatus)].push(toCard(q));
	}
	return out;
}

/** Total outstanding balance across all payment-due bookings. */
export function totalOutstanding(lanes: LaneMap): number {
	return lanes.payments.reduce((sum, c) => sum + c.balance, 0);
}
