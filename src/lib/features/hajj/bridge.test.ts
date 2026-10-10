import { describe, expect, it } from 'vitest';
import { financeBridge } from './bridge';
import { computeQuote, type CalcTraveller } from './calc';

const t = (over: Partial<CalcTraveller>): CalcTraveller => ({
	id: 't',
	currency: 'SAR',
	room: 'Quad',
	baseCost: 54500,
	baseSell: 58400,
	ticketCost: 0,
	ticketSell: 0,
	commission: 0,
	addons: [],
	...over
});

describe('financeBridge', () => {
	it('carries SAR at the ROE and records cost net of commission', () => {
		const q = computeQuote({ roe: 77, travellers: [t({ commission: 1000 })] });
		const b = financeBridge(q, null);
		expect(b.sellPkr).toBe(58400 * 77);
		expect(b.grossCostPkr).toBe(54500 * 77);
		expect(b.commissionPkr).toBe(1000 * 77);
		expect(b.costPkr).toBe(54500 * 77 - 1000 * 77);
		// profit = sell - (cost - commission): the margin plus the commission
		expect(b.profitPkr).toBe((58400 - 54500 + 1000) * 77);
		expect(b.usdMissingRate).toBe(false);
	});

	it('includes USD only once a USD rate is set, and says so when it is not', () => {
		const q = computeQuote({
			roe: 77,
			travellers: [
				t({}),
				t({ id: 'u', currency: 'USD', baseCost: 14950, baseSell: 15500, commission: 100 })
			]
		});
		const without = financeBridge(q, null);
		expect(without.usdMissingRate).toBe(true);
		expect(without.sellPkr).toBe(58400 * 77);

		const withRate = financeBridge(q, 280);
		expect(withRate.usdMissingRate).toBe(false);
		expect(withRate.sellPkr).toBe(58400 * 77 + 15500 * 280);
		expect(withRate.commissionPkr).toBe(100 * 280);
	});

	it('adds tickets (already PKR) to both sides', () => {
		const q = computeQuote({
			roe: 77,
			travellers: [t({ ticketCost: 335000, ticketSell: 345000 })]
		});
		const b = financeBridge(q, null);
		expect(b.sellPkr).toBe(58400 * 77 + 345000);
		expect(b.grossCostPkr).toBe(54500 * 77 + 335000);
	});

	it('is all zero for an empty quote', () => {
		const b = financeBridge(computeQuote({ roe: 77, travellers: [] }), null);
		expect(b).toMatchObject({ sellPkr: 0, costPkr: 0, profitPkr: 0, usdMissingRate: false });
	});
});
