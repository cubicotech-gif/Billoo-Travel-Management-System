import type { QueryStatus } from '$lib/database.types';

// The 10-stage query lifecycle. Order matters: it drives the pipeline board
// and the "advance to next stage" action. Each stage carries display metadata.

export interface WorkflowStage {
	status: QueryStatus;
	label: string;
	/** Short description of what happens in this stage. */
	hint: string;
	tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
	{
		status: 'New Query - Not Responded',
		label: 'New',
		hint: 'Fresh inquiry, not yet contacted.',
		tone: 'warning'
	},
	{
		status: 'Responded - Awaiting Reply',
		label: 'Responded',
		hint: 'We replied, waiting on the client.',
		tone: 'info'
	},
	{
		status: 'Working on Proposal',
		label: 'Proposal WIP',
		hint: 'Building the quote and service breakdown.',
		tone: 'info'
	},
	{
		status: 'Proposal Sent',
		label: 'Proposal Sent',
		hint: 'Quote delivered, awaiting decision.',
		tone: 'info'
	},
	{
		status: 'Revisions Requested',
		label: 'Revisions',
		hint: 'Client asked for changes.',
		tone: 'warning'
	},
	{
		status: 'Finalized & Booking',
		label: 'Finalized',
		hint: 'Accepted, collecting advance & booking.',
		tone: 'success'
	},
	{
		status: 'Services Booked',
		label: 'Booked',
		hint: 'Vendors confirmed, services secured.',
		tone: 'success'
	},
	{
		status: 'In Delivery',
		label: 'In Delivery',
		hint: 'Travel in progress / documents issued.',
		tone: 'info'
	},
	{
		status: 'Completed',
		label: 'Completed',
		hint: 'Trip done, fully settled.',
		tone: 'success'
	},
	{
		status: 'Cancelled',
		label: 'Cancelled',
		hint: 'Query closed without booking.',
		tone: 'danger'
	}
];

export const STAGE_BY_STATUS: Record<QueryStatus, WorkflowStage> = Object.fromEntries(
	WORKFLOW_STAGES.map((s) => [s.status, s])
) as Record<QueryStatus, WorkflowStage>;

/** The next status in the linear flow, or null at the terminal stages. */
export function nextStatus(current: QueryStatus): QueryStatus | null {
	if (current === 'Completed' || current === 'Cancelled') return null;
	const idx = WORKFLOW_STAGES.findIndex((s) => s.status === current);
	// Stop before 'Cancelled' (the last entry) — cancelling is a manual action.
	const next = WORKFLOW_STAGES[idx + 1];
	if (!next || next.status === 'Cancelled') return null;
	return next.status;
}
