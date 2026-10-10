import type { OrgSettings } from '$features/settings/api';
import type { Query } from '$features/queries/types';
import type { Proposal } from './proposal';

export interface Pilgrim {
	id: string;
	name: string;
	passport: string | null;
	isLead: boolean;
}

/** Everything a client-facing Hajj document needs, resolved once by HajjDocLoader. */
export interface HajjDocContext {
	query: Query;
	org: OrgSettings | null;
	proposal: Proposal;
	pilgrims: Pilgrim[];
	roe: number;
	usdRate: number | null;
	/** Booking discount in PKR (0 when none). */
	discountPkr: number;
	payments: {
		status: string;
		amount: number;
		paid_date: string | null;
		due_date: string | null;
		label: string;
		method: string | null;
		created_at: string;
	}[];
}
