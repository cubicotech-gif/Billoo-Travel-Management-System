import { describe, expect, it } from 'vitest';
import { BOOKING_REQUIRED, documentChecklist, readinessSummary } from './checklist';

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
});
