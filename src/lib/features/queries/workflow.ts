import type { QueryStatus } from '$lib/database.types';

// The compact 5-stage query lifecycle (+ Cancelled side-exit). Each stage is a
// real unit of work with its own action panel on the detail page. The DB
// queries.status CHECK constraint is the source of truth (see
// database/migrations/20260602_compact_5_stage_workflow.sql).

export type StageTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface WorkflowStage {
	status: QueryStatus;
	label: string;
	/** One-line summary of what you do in this stage. */
	hint: string;
	tone: StageTone;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
	{ status: 'Inquiry', label: 'Inquiry', hint: 'Log the client and their requirements.', tone: 'warning' },
	{ status: 'Proposal', label: 'Proposal', hint: 'Build the package and send the quote.', tone: 'info' },
	{ status: 'Booking', label: 'Booking', hint: 'Collect advance and book with vendors.', tone: 'info' },
	{ status: 'Delivery', label: 'Delivery', hint: 'Issue tickets, vouchers and documents.', tone: 'info' },
	{ status: 'Completed', label: 'Completed', hint: 'Trip done and fully settled.', tone: 'success' },
	{ status: 'Cancelled', label: 'Cancelled', hint: 'Closed without booking.', tone: 'danger' }
];

/** The ordered pipeline, excluding the Cancelled side-exit (board columns). */
export const MAIN_STAGES: WorkflowStage[] = WORKFLOW_STAGES.filter((s) => s.status !== 'Cancelled');

export const STAGE_BY_STATUS: Record<QueryStatus, WorkflowStage> = Object.fromEntries(
	WORKFLOW_STAGES.map((s) => [s.status, s])
) as Record<QueryStatus, WorkflowStage>;

const ORDER: QueryStatus[] = MAIN_STAGES.map((s) => s.status);

/** Next stage in the linear flow, or null at Completed/Cancelled. */
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
