import { describe, expect, it } from 'vitest';
import {
	BOOKING_REQUIRED,
	documentChecklist,
	indexDocuments,
	presentTypesFor,
	readinessFor,
	readinessSummary
} from './checklist';
import type { Document } from './api';

function doc(partial: Partial<Document>): Document {
	return { entity_type: 'query', entity_id: 'q1', document_type: 'passport', ...partial } as Document;
}

describe('booking document checklist', () => {
	it('marks present types done and the rest missing', () => {
		const items = documentChecklist(['passport', 'ticket']);
		expect(items).toHaveLength(BOOKING_REQUIRED.length);
		expect(items.find((i) => i.type === 'passport')?.done).toBe(true);
		expect(items.find((i) => i.type === 'visa')?.done).toBe(false);
	});

	it('summarises progress and lists what is missing', () => {
		const s = readinessSummary(documentChecklist(['passport', 'visa']));
		expect(s.done).toBe(2);
		expect(s.total).toBe(4);
		expect(s.missing).toEqual(['Air ticket', 'Hotel voucher']);
		expect(s.complete).toBe(false);
	});

	it('is complete only when every required document is present', () => {
		const s = readinessSummary(documentChecklist(['passport', 'visa', 'ticket', 'voucher']));
		expect(s.complete).toBe(true);
		expect(s.missing).toEqual([]);
	});

	it('treats an empty checklist as not complete', () => {
		expect(readinessSummary([]).complete).toBe(false);
	});

	it('merges trip + passenger docs from an index to score a booking', () => {
		const index = indexDocuments([
			doc({ entity_type: 'query', entity_id: 'q1', document_type: 'ticket' }),
			doc({ entity_type: 'query', entity_id: 'q1', document_type: 'voucher' }),
			doc({ entity_type: 'passenger', entity_id: 'p1', document_type: 'passport' }),
			doc({ entity_type: 'passenger', entity_id: 'p9', document_type: 'visa' }) // other passenger
		]);
		expect(presentTypesFor(index, 'q1', 'p1').sort()).toEqual(['passport', 'ticket', 'voucher']);
		const s = readinessFor(index, 'q1', 'p1');
		expect(s.done).toBe(3);
		expect(s.missing).toEqual(['Visa']);
	});
});
