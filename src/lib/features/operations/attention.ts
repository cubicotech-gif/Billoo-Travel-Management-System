// "Needs attention" worklist: booked deals with something outstanding — a
// balance to collect, a check-in to confirm, or missing documents. Pure logic
// over the queries list + an indexed document set (see documents/checklist).
import type { DocumentType } from '$lib/database.types';
import type { Query } from '$features/queries/types';
import { readinessFor } from '$features/documents/checklist';
import { isBooked, laneFor, toCard } from './lanes';

export interface AttentionItem {
	query: Query;
	balance: number;
	needsPayment: boolean;
	needsCheckin: boolean;
	missingDocs: string[];
}

export function attentionList(
	queries: Query[],
	docIndex: Map<string, DocumentType[]>
): AttentionItem[] {
	const out: AttentionItem[] = [];
	for (const q of queries) {
		if (q.is_deleted || !isBooked(q)) continue;
		const lane = laneFor(q.booking_status!);
		if (lane === 'completed') continue; // settled — nothing to chase

		const { balance } = toCard(q);
		const docs = readinessFor(docIndex, q.id, q.passenger_id);
		const needsPayment = lane === 'payments' && balance > 0;
		const needsCheckin = lane === 'checkins';
		const missingDocs = docs.complete ? [] : docs.missing;

		if (needsPayment || needsCheckin || missingDocs.length) {
			out.push({ query: q, balance, needsPayment, needsCheckin, missingDocs });
		}
	}
	return out.sort(byUrgency);
}

const ts = (v: string | null): number => (v ? new Date(v).getTime() : 0);
/** Payments are chased first, then check-ins (soonest travel), then docs-only. */
function byUrgency(a: AttentionItem, b: AttentionItem): number {
	const cat = (i: AttentionItem) => (i.needsPayment ? 0 : i.needsCheckin ? 1 : 2);
	const ca = cat(a);
	const cb = cat(b);
	if (ca !== cb) return ca - cb;
	if (ca === 1) {
		// both check-ins → soonest travel first (unknown dates last)
		const ta = a.query.travel_date ? ts(a.query.travel_date) : Number.POSITIVE_INFINITY;
		const tb = b.query.travel_date ? ts(b.query.travel_date) : Number.POSITIVE_INFINITY;
		return ta - tb;
	}
	// payments / docs → oldest booking first
	return (
		ts(a.query.stage_changed_at ?? a.query.created_at) -
		ts(b.query.stage_changed_at ?? b.query.created_at)
	);
}
