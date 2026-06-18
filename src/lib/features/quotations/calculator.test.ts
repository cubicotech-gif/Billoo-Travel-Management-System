import { describe, expect, it } from 'vitest';
import {
	calculateQuotation,
	perPerson,
	perPersonAdvanced,
	perPersonDivisor,
	personsInRooms,
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

	it('sums the SAR land side (sell) across hotels and transfers, visa kept separate', () => {
		// Land only: Makkah 250*1*5 + Madinah 190*1*4 + transfer 380 = 1250+760+380 = 2390.
		// Visa (220*2) is its own total, NOT in the SAR subtotal.
		expect(calculateQuotation(base).sarSell).toBe(2390);
		// land cost: 200*5 + 150*4 + 300 = 1000+600+300 = 1900
		expect(calculateQuotation(base).sarCost).toBe(1900);
		// Visa surfaces separately (converted at the ROE).
		expect(calculateQuotation(base).visaSellPkr).toBe(220 * 2 * 75);
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
		// Visa covers all persons incl. the infant: 220 * 2 → PKR at the ROE.
		expect(r.visaSellPkr).toBe(220 * 2 * 75);
		expect(r.sarSell).toBe(0); // no land lines; visa isn't in the SAR subtotal
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

	it('charges breakfast per person per night by room occupancy', () => {
		const r = calculateQuotation({
			...base,
			pax: { adults: 4, children: 0, infants: 0 },
			hotels: [
				{
					city: 'Makkah',
					name: 'Hilton',
					nights: 5,
					rooms: [{ label: 'Quad', occupancy: 4, qty: 1, costSar: 400, sellSar: 480 }],
					breakfast: { costSar: 10, sellSar: 15, persons: 4 }
				}
			],
			transfers: [],
			visa: null,
			tickets: null
		});
		// rooms: 480 * 5 = 2400; breakfast: 15 * (4 persons * 5 nights) = 300 → 2700 sell.
		expect(r.sarSell).toBe(2700);
		expect(personsInRooms([{ label: 'Quad', occupancy: 4, qty: 1, costSar: 0, sellSar: 0 }])).toBe(4);
		const bk = r.lines.find((l) => l.meta?.kind === 'breakfast');
		expect(bk?.lineSell).toBe(300);
	});

	it('supports a manual breakfast persons override (e.g. 2 of 4)', () => {
		const r = calculateQuotation({
			...base,
			pax: { adults: 4, children: 0, infants: 0 },
			hotels: [
				{
					city: 'Makkah',
					name: 'Hilton',
					nights: 5,
					rooms: [{ label: 'Quad', occupancy: 4, qty: 1, costSar: 400, sellSar: 480 }],
					breakfast: { costSar: 10, sellSar: 15, persons: 2, personsAuto: false }
				}
			],
			transfers: [],
			visa: null,
			tickets: null
		});
		// breakfast: 15 * (2 persons * 5 nights) = 150.
		expect(r.lines.find((l) => l.meta?.kind === 'breakfast')?.lineSell).toBe(150);
	});

	it('breakfast included in the room rate adds no charge but is flagged', () => {
		const r = calculateQuotation({
			...base,
			hotels: [
				{
					city: 'Makkah',
					name: 'Hilton',
					nights: 5,
					rooms: [{ label: 'Double', occupancy: 2, qty: 1, costSar: 200, sellSar: 250 }],
					breakfast: { costSar: 0, sellSar: 0, persons: 2, included: true }
				}
			],
			transfers: [],
			visa: null,
			tickets: null
		});
		// 250 * 5 = 1250 only; breakfast line present at 0 with included flag.
		expect(r.sarSell).toBe(1250);
		const bk = r.lines.find((l) => l.meta?.kind === 'breakfast');
		expect(bk?.lineSell).toBe(0);
		expect(bk?.meta?.included).toBe(true);
	});

	it('advanced per-person shares hotels across adults, children pay only their items', () => {
		const r = calculateQuotation({
			...base,
			pax: { adults: 2, children: 1, infants: 0 },
			tickets: {
				airlineName: 'Saudia',
				adultCost: 150000,
				adultSell: 180000,
				childCost: 100000,
				childSell: 120000,
				infantCost: 0,
				infantSell: 0
			}
		});
		const adv = perPersonAdvanced(r, base.roe, { adults: 2, children: 1, infants: 0 });
		// Visa is now its own total (excluded from per-person). Child pays only the
		// child ticket; adult shares accommodation+transfer and pays the adult ticket.
		expect(adv.perChild).toBe(120000); // child ticket only
		expect(adv.perAdult).toBeGreaterThan(adv.perChild);
		// Visa surfaces as a separate PKR total: 220 SAR × 3 persons × 75.
		expect(r.visaSellPkr).toBe(220 * 3 * 75);
	});

	it('charges each visa line only for its own headcount and totals them', () => {
		const r = calculateQuotation({
			...base,
			pax: { adults: 4, children: 0, infants: 0 },
			visas: [
				{ visaType: 'Masar', costSar: 200, sellSar: 300, persons: 2 },
				{ visaType: 'Non-Masar', costSar: 150, sellSar: 220, persons: 2 }
			]
		});
		// 2×300 + 2×220 = 1040 SAR → ×75 PKR.
		expect(r.visaSellPkr).toBe((300 * 2 + 220 * 2) * 75);
		const visaLines = r.lines.filter((l) => l.line_type === 'visa');
		expect(visaLines.map((l) => l.quantity)).toEqual([2, 2]);
	});

	it('adds other services as their own PKR total, honouring the line currency', () => {
		const r = calculateQuotation({
			...base,
			pax: { adults: 2, children: 0, infants: 0 },
			otherServices: [
				{ label: 'Polio certificate', currency: 'PKR', costSar: 1000, sellSar: 1500, qty: 2 }
			]
		});
		expect(r.otherSellPkr).toBe(3000); // 1500 × 2, no conversion
		expect(r.lines.find((l) => l.line_type === 'other')?.label).toBe('Polio certificate');
	});

	it('converts USD lines via the USD rate and keeps the SAR subtotal separate', () => {
		const r = calculateQuotation({
			roe: 75,
			usd: 280,
			pax: { adults: 2, children: 0, infants: 0 },
			hotels: [
				// SAR stay: 250*1*5 = 1250 SAR
				{ city: 'Makkah', name: 'Hilton', nights: 5, rooms: [{ label: 'Double', occupancy: 2, qty: 1, costSar: 200, sellSar: 250 }] },
				// USD stay (Umrah Plus, Baku): 100*1*3 = 300 USD
				{ city: 'Baku', name: 'Fairmont', currency: 'USD', nights: 3, rooms: [{ label: 'Double', occupancy: 2, qty: 1, costSar: 80, sellSar: 100 }] }
			],
			transfers: [],
			visa: null,
			tickets: null
		});
		expect(r.sarSell).toBe(1250);
		expect(r.usdSell).toBe(300);
		// total sell PKR = 1250*75 + 300*280 = 93750 + 84000 = 177750
		expect(r.totalSellPkr).toBe(177750);
	});

	it('prices multiple visas (mixed currency) as their own total, not in the land subtotals', () => {
		const r = calculateQuotation({
			roe: 75,
			usd: 280,
			pax: { adults: 2, children: 0, infants: 0 },
			hotels: [],
			transfers: [],
			visas: [
				{ visaType: 'Umrah', costSar: 180, sellSar: 220 }, // SAR, per person
				{ visaType: 'Azerbaijan', currency: 'USD', costSar: 40, sellSar: 50 } // USD, per person
			],
			tickets: null
		});
		const visaLines = r.lines.filter((l) => l.line_type === 'visa');
		expect(visaLines).toHaveLength(2);
		// Visa stays OUT of the SAR/USD land subtotals — it's a separate PKR total.
		expect(r.sarSell).toBe(0);
		expect(r.usdSell).toBe(0);
		expect(r.visaSellPkr).toBe(220 * 2 * 75 + 50 * 2 * 280);
		// Grand total is unchanged by where visa is bucketed.
		expect(r.totalSellPkr).toBe(440 * 75 + 100 * 280);
	});

	it('staff breakdown reconciles: land + tickets + visa + other == total', () => {
		const r = calculateQuotation({
			roe: 78,
			usd: 280,
			pax: { adults: 6, children: 0, infants: 0 },
			hotels: [
				{ city: 'Makkah', name: 'A', nights: 4, rooms: [{ label: 'Quad', occupancy: 4, qty: 1, costSar: 400, sellSar: 490 }] },
				{ city: 'Baku', name: 'B', currency: 'USD', nights: 2, rooms: [{ label: 'Double', occupancy: 2, qty: 1, costSar: 80, sellSar: 100 }] }
			],
			transfers: [{ vehicleType: '7-seater', route: 'A → B', currency: 'PKR', costSar: 5000, sellSar: 7000, vehicles: 1 }],
			visas: [{ visaType: 'Umrah', costSar: 450, sellSar: 550 }],
			otherServices: [{ label: 'Polio', currency: 'PKR', costSar: 0, sellSar: 1500, qty: 6 }],
			tickets: { airlineName: 'X', adultCost: 120000, adultSell: 145000, childCost: 0, childSell: 0, infantCost: 0, infantSell: 0 }
		});
		// Every line the staff breakdown lists, summed, must equal the grand total.
		const reconciled =
			r.sarSell * 78 +
			r.usdSell * 280 +
			r.pkrLandSell +
			r.ticketsSellPkr +
			r.visaSellPkr +
			r.otherSellPkr;
		expect(reconciled).toBeCloseTo(r.totalSellPkr, 2);
		// Visa is its own total, not folded into the SAR subtotal.
		expect(r.sarSell).toBe(490 * 4); // hotel only, no visa
		expect(r.visaSellPkr).toBe(550 * 6 * 78);
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
