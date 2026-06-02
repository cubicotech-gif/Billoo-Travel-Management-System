import { describe, expect, it } from 'vitest';
import { toNumber } from '$lib/money';
import { lineCost, rollupNumbers, rollupServices } from './totals';
import type { QueryService } from './types';

function service(partial: Partial<QueryService>): QueryService {
	return {
		id: 'x',
		query_id: 'q',
		service_type: 'Hotel',
		service_description: 'Test',
		vendor: null,
		vendor_id: null,
		quantity: 1,
		cost_price: 0,
		selling_price: 0,
		pnr: null,
		booking_reference: null,
		status: 'pending',
		booking_status: 'pending',
		service_date: null,
		service_details: {},
		notes: null,
		created_at: '',
		updated_at: '',
		...partial
	};
}

describe('service totals', () => {
	it('multiplies unit price by quantity precisely', () => {
		expect(toNumber(lineCost(service({ cost_price: 199.99, quantity: 3 })))).toBe(599.97);
	});

	it('rolls multiple services into cost/selling/profit', () => {
		const services = [
			service({ cost_price: 1000, selling_price: 1200, quantity: 2 }), // 2000 / 2400
			service({ cost_price: 500.5, selling_price: 800.25, quantity: 1 }) // 500.5 / 800.25
		];
		const t = rollupServices(services);
		expect(toNumber(t.cost)).toBe(2500.5);
		expect(toNumber(t.selling)).toBe(3200.25);
		expect(toNumber(t.profit)).toBe(699.75);
	});

	it('computes margin percent', () => {
		const t = rollupServices([service({ cost_price: 750, selling_price: 1000, quantity: 1 })]);
		expect(t.marginPct).toBe(25);
	});

	it('returns zeros for an empty service list', () => {
		expect(rollupNumbers([])).toEqual({ cost: 0, selling: 0 });
	});
});
