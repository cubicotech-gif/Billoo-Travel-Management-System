import { describe, expect, it } from 'vitest';
import { attentionList } from './attention';
import { indexDocuments } from '$features/documents/checklist';
import type { Query } from '$features/queries/types';
import type { Document } from '$features/documents/api';

function q(partial: Partial<Query>): Query {
	return {
		id: 'q1',
		passenger_id: 'p1',
		status: 'Booking',
		booking_status: 'Pending Payment',
		selling_price: 100000,
		advance_payment_amount: 0,
		is_deleted: false,
		...partial
	} as Query;
}
function doc(entity_type: string, entity_id: string, document_type: string): Document {
	return { entity_type, entity_id, document_type } as Document;
}

describe('attention worklist', () => {
	it('flags an unpaid booking with missing documents', () => {
		const items = attentionList([q({})], indexDocuments([]));
		expect(items).toHaveLength(1);
		expect(items[0]!.needsPayment).toBe(true);
		expect(items[0]!.missingDocs).toEqual(['Passport', 'Visa', 'Air ticket', 'Hotel voucher']);
	});

	it('ignores completed bookings entirely', () => {
		expect(attentionList([q({ booking_status: 'Completed' })], indexDocuments([]))).toHaveLength(0);
	});

	it('flags a paid-but-uncheckedin booking and drops doc nags once all present', () => {
		const allDocs = indexDocuments([
			doc('passenger', 'p1', 'passport'),
			doc('passenger', 'p1', 'visa'),
			doc('query', 'q1', 'ticket'),
			doc('query', 'q1', 'voucher')
		]);
		const items = attentionList(
			[q({ booking_status: 'Payment Done - Check-in Left' })],
			allDocs
		);
		expect(items).toHaveLength(1);
		expect(items[0]!.needsCheckin).toBe(true);
		expect(items[0]!.needsPayment).toBe(false);
		expect(items[0]!.missingDocs).toEqual([]);
	});

	it('orders payments before check-ins before docs-only', () => {
		const allButTicket = indexDocuments([
			doc('passenger', 'p1', 'passport'),
			doc('passenger', 'p1', 'visa'),
			doc('query', 'q1', 'voucher')
		]);
		const items = attentionList(
			[
				q({ id: 'docs', booking_status: 'Payment Done - Check-in Left', travel_date: null }), // checkin
				q({ id: 'pay', booking_status: 'Pending Payment', advance_payment_amount: 0 }) // payment
			],
			allButTicket // q1 missing ticket, but ids differ so docs apply per-id; fine for ordering
		);
		expect(items[0]!.query.id).toBe('pay');
	});

	it('excludes non-booked and deleted queries', () => {
		const items = attentionList(
			[q({ status: 'Quoted' }), q({ is_deleted: true })],
			indexDocuments([])
		);
		expect(items).toHaveLength(0);
	});
});
