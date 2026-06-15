// Booking readiness: which key documents are collected for a confirmed trip.
// Identity docs (passport/visa) live on the passenger; trip docs (ticket/
// voucher) live on the query — this merges both into one checklist so a booking
// shows, at a glance, what's done and what's still missing.
import type { DocumentType } from '$lib/database.types';
import type { Document } from './api';

export interface DocRequirement {
	type: DocumentType;
	label: string;
}

/** The documents a booked Umrah trip needs before travel. */
export const BOOKING_REQUIRED: DocRequirement[] = [
	{ type: 'passport', label: 'Passport' },
	{ type: 'visa', label: 'Visa' },
	{ type: 'ticket', label: 'Air ticket' },
	{ type: 'voucher', label: 'Hotel voucher' }
];

export interface ChecklistItem extends DocRequirement {
	done: boolean;
}

/** Mark each required document present/missing against the collected types. */
export function documentChecklist(
	presentTypes: Iterable<DocumentType>,
	required: DocRequirement[] = BOOKING_REQUIRED
): ChecklistItem[] {
	const set = new Set(presentTypes);
	return required.map((r) => ({ ...r, done: set.has(r.type) }));
}

export interface ReadinessSummary {
	done: number;
	total: number;
	missing: string[];
	complete: boolean;
}

export function readinessSummary(items: ChecklistItem[]): ReadinessSummary {
	const done = items.filter((i) => i.done).length;
	const missing = items.filter((i) => !i.done).map((i) => i.label);
	return { done, total: items.length, missing, complete: items.length > 0 && done === items.length };
}

/**
 * Index every document by `${entity_type}:${entity_id}` → its types, so a board
 * can compute readiness for many bookings from a single fetch.
 */
export function indexDocuments(docs: Document[]): Map<string, DocumentType[]> {
	const m = new Map<string, DocumentType[]>();
	for (const d of docs) {
		const k = `${d.entity_type}:${d.entity_id}`;
		const arr = m.get(k);
		if (arr) arr.push(d.document_type);
		else m.set(k, [d.document_type]);
	}
	return m;
}

/** Document types collected for a booking, merging trip + passenger docs. */
export function presentTypesFor(
	index: Map<string, DocumentType[]>,
	queryId: string,
	passengerId: string | null
): DocumentType[] {
	return [
		...(index.get(`query:${queryId}`) ?? []),
		...(passengerId ? (index.get(`passenger:${passengerId}`) ?? []) : [])
	];
}

/** Readiness for one booking, straight from the indexed document set. */
export function readinessFor(
	index: Map<string, DocumentType[]>,
	queryId: string,
	passengerId: string | null
): ReadinessSummary {
	return readinessSummary(documentChecklist(presentTypesFor(index, queryId, passengerId)));
}
