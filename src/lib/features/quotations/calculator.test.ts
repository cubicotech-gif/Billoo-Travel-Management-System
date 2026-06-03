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
		{
			city: 'Makkah',
			name: 'Hilton',
			nights: 5,
			rooms: [{ label: 'Double', occupancy: 2, qty: 1, costSar: 200, sellSar: 250 }]
		},
		{
			city: 'Madinah',
			name: 'Anwar',
			nights: 4,
			rooms: [{ label: 'Double', occupancy: 2, qty: 1, costSar: 150, sellSar: 190 }]
		}
	],
	transfers: [{ vehicleType: '7-seater', route: 'Airport → Makkah', costSar: 300, sellSar: 380, vehicles: 1 }],
	visa: { visaType: 'Umrah', costSar: 180, sellSar: 220 },
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
	it('derives rooms from occupancy and counts persons', () => {
		expect(roomsFor(5, 2)).toBe(3);
		expect(totalPersons({ adults: 2, children: 1, infants: 1 })).toBe(4);
	});

	it('sums the SAR side (sell) across hotels, transfer and visa', () => {
		// Makkah 250*1*5 + Madinah 190*1*4 + transfer 380 + visa 220*2 = 1250+760+380+440 = 2830
		expect(calculateQuotation(base).sarSell).toBe(2830);
		// cost: 200*5 + 150*4 + 300 + 180*2 = 1000+600+300+360 = 2260
		expect(calculateQuotation(base).sarCost).toBe(2260);
	});

	it('mixes room types within one hotel', () => {
		const r = calculateQuotation({
			...base,
			hotels: [
				{
					city: 'Makkah',
					name: 'Hilton',
					nights: 5,
					rooms: [
						{ label: 'Quad', occupancy: 4, qty: 1, costSar: 400, sellSar: 480 },
						{ label: 'Double', occupancy: 2, qty: 1, costSar: 200, sellSar: 250 }
					]
				}
			],
			transfers: [],
			visa: null,
			tickets: null
		});
		// (480 + 250) * 5 nights = 3650 sell
		expect(r.sarSell).toBe(3650);
		expect(r.lines).toHaveLength(2);
	});

	it('converts SAR via ROE and adds PKR tickets for the grand total', () => {
		const r = calculateQuotation(base);
		// sell: 2830*75 + 180000*2 = 212250 + 360000 = 572250
		expect(r.totalSellPkr).toBe(572250);
		expect(r.totalCostPkr).toBe(469500);
		expect(r.profitPkr).toBe(102750);
	});

	it('bills infant visa at the adult (per-person) rate', () => {
		const r = calculateQuotation({
			...base,
			pax: { adults: 1, children: 0, infants: 1 },
			hotels: [],
			transfers: [],
			tickets: null
		});
		expect(r.sarSell).toBe(440); // 220 * 2 persons
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
	});

	it('handles an empty quotation as zero', () => {
		const r = calculateQuotation({
			roe: 75,
			pax: { adults: 1, children: 0, infants: 0 },
			hotels: [],
			transfers: [],
			visa: null,
			tickets: null
		});
		expect(r.totalSellPkr).toBe(0);
		expect(r.lines).toHaveLength(0);
	});
});
