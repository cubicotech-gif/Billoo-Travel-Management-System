import { describe, expect, it } from 'vitest';
import { commissionSummary, type CommissionTraveller } from './commission';

const tr = (over: Partial<CommissionTraveller> = {}): CommissionTraveller => ({
	currency: 'SAR',
	commission: 1500,
	confirmed: true,
	...over
});

describe('commissionSummary', () => {
	it('expects commission only from confirmed travellers', () => {
		const out = commissionSummary([tr(), tr(), tr({ confirmed: false })], []);
		expect(out).toEqual([
			{ currency: 'SAR', travellers: 2, missing: 0, expected: 3000, received: 0, outstanding: 3000 }
		]);
	});

	it('nets what the vendor has paid', () => {
		const out = commissionSummary([tr(), tr()], [{ amount: 1000, currency: 'SAR' }]);
		expect(out[0]).toMatchObject({ expected: 3000, received: 1000, outstanding: 2000 });
	});

	it('keeps USD and SAR apart', () => {
		const out = commissionSummary(
			[tr(), tr({ currency: 'USD', commission: 400 })],
			[{ amount: 400, currency: 'USD' }]
		);
		expect(out.find((l) => l.currency === 'USD')).toMatchObject({ expected: 400, outstanding: 0 });
		expect(out.find((l) => l.currency === 'SAR')).toMatchObject({
			expected: 1500,
			outstanding: 1500
		});
	});

	it('counts travellers whose package has no commission entered yet', () => {
		const out = commissionSummary([tr(), tr({ commission: null })], []);
		expect(out[0]).toMatchObject({ travellers: 2, missing: 1, expected: 1500 });
	});

	it('shows an overpayment as a negative outstanding', () => {
		const out = commissionSummary([tr()], [{ amount: 2000, currency: 'SAR' }]);
		expect(out[0]?.outstanding).toBe(-500);
	});

	it('is empty when there is nothing confirmed and nothing received', () => {
		expect(commissionSummary([tr({ confirmed: false })], [])).toEqual([]);
	});

	it('does not drop pennies', () => {
		const out = commissionSummary([tr({ commission: 0.1 }), tr({ commission: 0.2 })], []);
		expect(out[0]?.expected).toBe(0.3);
	});
});
