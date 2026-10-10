import { describe, expect, it } from 'vitest';
import { paymentStatus, todayLocalISO } from './status';

describe('paymentStatus', () => {
	const today = '2026-10-10';

	it('keeps a paid payment paid, whatever its date', () => {
		expect(paymentStatus({ status: 'paid', due_date: '2020-01-01' }, today)).toBe('paid');
	});

	it('is overdue only after the due date has passed', () => {
		expect(paymentStatus({ status: 'pending', due_date: '2026-10-09' }, today)).toBe('overdue');
	});

	it('does not call a payment due today overdue', () => {
		expect(paymentStatus({ status: 'pending', due_date: '2026-10-10' }, today)).toBe('pending');
	});

	it('is pending when due later, or with no due date', () => {
		expect(paymentStatus({ status: 'pending', due_date: '2026-11-15' }, today)).toBe('pending');
		expect(paymentStatus({ status: 'pending', due_date: null }, today)).toBe('pending');
	});

	it('copes with a timestamp-style due date', () => {
		expect(paymentStatus({ status: 'pending', due_date: '2026-10-09T00:00:00Z' }, today)).toBe(
			'overdue'
		);
	});
});

describe('todayLocalISO', () => {
	it('formats a local date as YYYY-MM-DD', () => {
		expect(todayLocalISO(new Date(2026, 9, 5))).toBe('2026-10-05');
	});
});
