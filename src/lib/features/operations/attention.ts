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
	return out;
}
