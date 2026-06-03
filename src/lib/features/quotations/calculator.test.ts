import { describe, expect, it } from 'vitest';
import {
	calculateQuotation,
	perPerson,
	perPersonDivisor,
	roomsFor,
	totalPersons,
	type QuotationInput
} from './calculator';
import { addDays, nightsBetween } from './dates';

const base: QuotationInput = {
	roe: 75,
	pax: { adults: 2, children: 0, infants: 0 },
	hotels: [
		{ city: 'Makkah', name: 'Hilton', costSar: 200, sellSar: 250, nights: 5, rooms: 1 },
		{ city: 'Madinah', name: 'Anwar', costSar: 150, sellSar: 190, nights: 4, rooms: 1 }
	],
	transfer: { name: 'Sedan', costSar: 300, sellSar: 380, vehicles: 1 },
	visa: { name: 'Umrah visa', costSar: 180, sellSar: 220 },
	tickets: {
		airlineName: 'Saudia',
		adultCost: 150000,
		adultSell: 180000,
		childCost: 0,
		childSell: 0,
		infantCost: 0,
		infantSell: 0
	}
};

describe('quotation calculator', () => {
	it('derives rooms from occupancy (ceil)', () => {
		expect(roomsFor(5, 2)).toBe(3);
		expect(roomsFor(4, 4)).toBe(1);
		expect(totalPersons({ adults: 2, children: 1, infants: 1 })).toBe(4);
	});

	it('sums the SAR side correctly (sell)', () => {
		// Makkah 250*5 + Madinah 190*4 + transfer 380 + visa 220*2 persons
		// = 1250 + 760 + 380 + 440 = 2830
		const r = calculateQuotation(base);
		expect(r.sarSell).toBe(2830);
		// cost: 200*5 + 150*4 + 300 + 180*2 = 1000 + 600 + 300 + 360 = 2260
		expect(r.sarCost).toBe(2260);
	});

	it('converts SAR via ROE and adds PKR tickets for the grand total', () => {
		const r = calculateQuotation(base);
		// sell: 2830 * 75 + (180000 * 2) = 212250 + 360000 = 572250
		expect(r.totalSellPkr).toBe(572250);
		// cost: 2260 * 75 + (150000 * 2) = 169500 + 300000 = 469500
		expect(r.totalCostPkr).toBe(469500);
		expect(r.profitPkr).toBe(102750);
	});

	it('bills infant visa at the adult (per-person) rate', () => {
		const r = calculateQuotation({
			...base,
			pax: { adults: 1, children: 0, infants: 1 },
			hotels: [],
			transfer: null,
			tickets: null
		});
		// visa 220 * 2 persons = 440 SAR sell
		expect(r.sarSell).toBe(440);
	});

	it('handles an empty quotation as zero', () => {
		const r = calculateQuotation({
			roe: 75,
			pax: { adults: 1, children: 0, infants: 0 },
			hotels: [],
			transfer: null,
			visa: null,
			tickets: null
		});
		expect(r.totalSellPkr).toBe(0);
		expect(r.profitPkr).toBe(0);
		expect(r.lines).toHaveLength(0);
	});

	it('per-person divisor counts adults+children, infants optional', () => {
		const pax = { adults: 6, children: 1, infants: 2 };
		expect(perPersonDivisor(pax, false)).toBe(7);
		expect(perPersonDivisor(pax, true)).toBe(9);
		expect(perPerson(700000, 7)).toBe(100000);
	});

	it('nights/date helpers stay in sync', () => {
		expect(nightsBetween('2026-03-03', '2026-03-08')).toBe(5);
		expect(addDays('2026-03-03', 5)).toBe('2026-03-08');
		expect(nightsBetween('2026-03-08', '2026-03-03')).toBe(0);
	});

	it('keeps precision through ROE conversion', () => {
		const r = calculateQuotation({
			roe: 75.5,
			pax: { adults: 1, children: 0, infants: 0 },
			hotels: [{ city: 'Makkah', name: 'X', costSar: 199.99, sellSar: 249.99, nights: 3, rooms: 1 }],
			transfer: null,
			visa: null,
			tickets: null
		});
		// 249.99 * 3 = 749.97 SAR; * 75.5 = 56622.735 -> rounded to 56622.74
		expect(r.totalSellPkr).toBeCloseTo(56622.74, 2);
	});
});
