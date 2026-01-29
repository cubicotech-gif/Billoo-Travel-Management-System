/**
 * Query Workflow Status Constants
 *
 * These values MUST match exactly with the database CHECK constraint
 * on the queries.status column.
 *
 * DO NOT modify these values without also updating the database constraint!
 */

// Status value constants
export const QUERY_STATUS = {
  NEW_QUERY: 'New Query - Not Responded',
  RESPONDED: 'Responded - Awaiting Reply',
  WORKING: 'Working on Proposal',
  PROPOSAL_SENT: 'Proposal Sent',
  REVISIONS: 'Revisions Requested',
  BOOKING: 'Finalized & Booking',
  BOOKED: 'Services Booked',
  IN_DELIVERY: 'In Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
} as const;

// Type for TypeScript
export type QueryStatus = typeof QUERY_STATUS[keyof typeof QUERY_STATUS];

// Array of all valid status values (for validation)
export const VALID_STATUSES: QueryStatus[] = Object.values(QUERY_STATUS);

// Workflow stages with metadata
export const WORKFLOW_STAGES = [
  {
    value: QUERY_STATUS.NEW_QUERY,
    label: '🔴 New Query (Not Responded)',
    color: 'red',
    priority: 1,
    stage: 1
  },
  {
    value: QUERY_STATUS.RESPONDED,
    label: '🟡 Awaiting Client Reply',
    color: 'yellow',
    priority: 2,
    stage: 2
  },
  {
    value: QUERY_STATUS.WORKING,
    label: '🔵 Working on Proposal',
    color: 'blue',
    priority: 3,
    stage: 3
  },
  {
    value: QUERY_STATUS.PROPOSAL_SENT,
    label: '🟢 Proposal Sent',
    color: 'green',
    priority: 4,
    stage: 4
  },
  {
    value: QUERY_STATUS.REVISIONS,
    label: '🟣 Revisions Requested',
    color: 'purple',
    priority: 5,
    stage: 5
  },
  {
    value: QUERY_STATUS.BOOKING,
    label: '✅ Finalized & Booking',
    color: 'teal',
    priority: 6,
    stage: 6
  },
  {
    value: QUERY_STATUS.BOOKED,
    label: '📦 Services Booked',
    color: 'emerald',
    priority: 7,
    stage: 7
  },
  {
    value: QUERY_STATUS.IN_DELIVERY,
    label: '🚚 In Delivery',
    color: 'cyan',
    priority: 8,
    stage: 8
  },
  {
    value: QUERY_STATUS.COMPLETED,
    label: '✅ Completed',
    color: 'green',
    priority: 9,
    stage: 9
  },
  {
    value: QUERY_STATUS.CANCELLED,
    label: '❌ Cancelled',
    color: 'gray',
    priority: 10,
    stage: 10
  }
] as const;

// Helper functions
export const isValidStatus = (status: string): status is QueryStatus => {
  return VALID_STATUSES.includes(status as QueryStatus);
};

export const getStageInfo = (status: string) => {
  return WORKFLOW_STAGES.find(stage => stage.value === status);
};

export const getStatusLabel = (status: string): string => {
  const stage = getStageInfo(status);
  return stage?.label || status;
};

export const getStatusColor = (status: string): string => {
  const stage = getStageInfo(status);
  return stage?.color || 'gray';
};

// Status groups for filtering
export const STATUS_GROUPS = {
  ACTIVE: [
    QUERY_STATUS.NEW_QUERY,
    QUERY_STATUS.RESPONDED,
    QUERY_STATUS.WORKING,
    QUERY_STATUS.PROPOSAL_SENT,
    QUERY_STATUS.REVISIONS
  ],
  BOOKING: [
    QUERY_STATUS.BOOKING,
    QUERY_STATUS.BOOKED
  ],
  IN_PROGRESS: [
    QUERY_STATUS.IN_DELIVERY
  ],
  FINISHED: [
    QUERY_STATUS.COMPLETED,
    QUERY_STATUS.CANCELLED
  ]
} as const;

// Check if status is in a specific group
export const isInStatusGroup = (status: string, group: keyof typeof STATUS_GROUPS): boolean => {
  const groupStatuses = STATUS_GROUPS[group] as readonly string[];
  return groupStatuses.includes(status);
};
