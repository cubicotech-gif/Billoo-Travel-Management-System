import {
	add,
	convertToPkr,
	type Money,
	money,
	multiply,
	subtract,
	sum,
	toNumber
} from '$lib/money';

// ---------------------------------------------------------------------------
// Quotation calculator. Pure functions — no UI, no I/O — so it can be unit
// tested to the penny. Hotels / Transfer / Visa are SAR; Tickets are PKR; a
// single ROE (SAR->PKR) converts the SAR side. ALL math goes through the money
// layer; we only drop to numbers at the very end for storage/display.
// ---------------------------------------------------------------------------

export interface PaxCounts {
	adults: number;
	children: number;
	infants: number;
}

export interface HotelInput {
	city: string;
	name: string;
	rateCardId?: string | null;
	vendorId?: string | null;
	costSar: number;
	sellSar: number; // per room per night
	nights: number;
	rooms: number;
	checkIn?: string | null;
	checkOut?: string | null;
}

export interface TransferInput {
	name: string;
	rateCardId?: string | null;
	vendorId?: string | null;
	costSar: number;
	sellSar: number; // per vehicle
	vehicles: number;
}

export interface VisaInput {
	name: string;
	rateCardId?: string | null;
	vendorId?: string | null;
	costSar: number;
	sellSar: number; // per person (infant = adult rate)
}

export interface TicketsInput {
	airlineName: string;
	rateCardId?: string | null;
	vendorId?: string | null;
	adultCost: number;
	adultSell: number;
	childCost: number;
	childSell: number;
	infantCost: number;
	infantSell: number;
}

export interface QuotationInput {
	roe: number;
	pax: PaxCounts;
	hotels: HotelInput[];
	transfer: TransferInput | null;
	visa: VisaInput | null;
	tickets: TicketsInput | null;
}

export interface QuotationLineResult {
	line_type: 'hotel' | 'transfer' | 'visa' | 'ticket';
	label: string;
	rateCardId: string | null;
	vendorId: string | null;
	currency: 'SAR' | 'PKR';
	unitCost: number;
	unitSell: number;
	quantity: number;
	lineCost: number;
	lineSell: number;
	meta: Record<string, unknown>;
}

export interface QuotationResult {
	lines: QuotationLineResult[];
	sarCost: number;
	sarSell: number;
	ticketsCostPkr: number;
	ticketsSellPkr: number;
	totalCostPkr: number;
	totalSellPkr: number;
	profitPkr: number;
}

/** persons = adults + children + infants (infant visa billed at adult rate). */
export function totalPersons(pax: PaxCounts): number {
	return pax.adults + pax.children + pax.infants;
}

/** Divisor for per-person pricing: adults + children, optionally + infants. */
export function perPersonDivisor(pax: PaxCounts, includeInfants: boolean): number {
	const n = pax.adults + pax.children + (includeInfants ? pax.infants : 0);
	return n > 0 ? n : 1;
}

/** Per-person PKR = total / divisor (informational; rounded to 2dp). */
export function perPerson(totalPkr: number, divisor: number): number {
	return Math.round((totalPkr / (divisor || 1)) * 100) / 100;
}

/** Rooms needed for N persons at a given occupancy, rounded up. */
export function roomsFor(persons: number, occupancy: number): number {
	if (occupancy <= 0) return persons;
	return Math.ceil(persons / occupancy);
}

export function calculateQuotation(input: QuotationInput): QuotationResult {
	const lines: QuotationLineResult[] = [];

	// SAR accumulators.
	const sarCosts: Money[] = [];
	const sarSells: Money[] = [];

	for (const h of input.hotels) {
		const qty = h.nights * h.rooms;
		const lineCost = multiply(money(h.costSar, 'SAR'), qty);
		const lineSell = multiply(money(h.sellSar, 'SAR'), qty);
		sarCosts.push(lineCost);
		sarSells.push(lineSell);
		lines.push({
			line_type: 'hotel',
			label: `${h.city} — ${h.name}`,
			rateCardId: h.rateCardId ?? null,
			vendorId: h.vendorId ?? null,
			currency: 'SAR',
			unitCost: h.costSar,
			unitSell: h.sellSar,
			quantity: qty,
			lineCost: toNumber(lineCost),
			lineSell: toNumber(lineSell),
			meta: {
				city: h.city,
				nights: h.nights,
				rooms: h.rooms,
				check_in: h.checkIn ?? null,
				check_out: h.checkOut ?? null
			}
		});
	}

	if (input.transfer) {
		const t = input.transfer;
		const lineCost = multiply(money(t.costSar, 'SAR'), t.vehicles);
		const lineSell = multiply(money(t.sellSar, 'SAR'), t.vehicles);
		sarCosts.push(lineCost);
		sarSells.push(lineSell);
		lines.push({
			line_type: 'transfer',
			label: t.name,
			rateCardId: t.rateCardId ?? null,
			vendorId: t.vendorId ?? null,
			currency: 'SAR',
			unitCost: t.costSar,
			unitSell: t.sellSar,
			quantity: t.vehicles,
			lineCost: toNumber(lineCost),
			lineSell: toNumber(lineSell),
			meta: { vehicles: t.vehicles }
		});
	}

	if (input.visa) {
		const v = input.visa;
		const persons = totalPersons(input.pax);
		const lineCost = multiply(money(v.costSar, 'SAR'), persons);
		const lineSell = multiply(money(v.sellSar, 'SAR'), persons);
		sarCosts.push(lineCost);
		sarSells.push(lineSell);
		lines.push({
			line_type: 'visa',
			label: v.name,
			rateCardId: v.rateCardId ?? null,
			vendorId: v.vendorId ?? null,
			currency: 'SAR',
			unitCost: v.costSar,
			unitSell: v.sellSar,
			quantity: persons,
			lineCost: toNumber(lineCost),
			lineSell: toNumber(lineSell),
			meta: { persons }
		});
	}

	// Tickets: PKR, per pax type. One line per type that has any pax.
	const ticketsCost: Money[] = [];
	const ticketsSell: Money[] = [];
	if (input.tickets) {
		const t = input.tickets;
		const types: { key: string; count: number; cost: number; sell: number }[] = [
			{ key: 'adult', count: input.pax.adults, cost: t.adultCost, sell: t.adultSell },
			{ key: 'child', count: input.pax.children, cost: t.childCost, sell: t.childSell },
			{ key: 'infant', count: input.pax.infants, cost: t.infantCost, sell: t.infantSell }
		];
		for (const ty of types) {
			if (ty.count <= 0) continue;
			const lineCost = multiply(money(ty.cost, 'PKR'), ty.count);
			const lineSell = multiply(money(ty.sell, 'PKR'), ty.count);
			ticketsCost.push(lineCost);
			ticketsSell.push(lineSell);
			lines.push({
				line_type: 'ticket',
				label: `${t.airlineName} (${ty.key} ×${ty.count})`,
				rateCardId: t.rateCardId ?? null,
				vendorId: t.vendorId ?? null,
				currency: 'PKR',
				unitCost: ty.cost,
				unitSell: ty.sell,
				quantity: ty.count,
				lineCost: toNumber(lineCost),
				lineSell: toNumber(lineSell),
				meta: { pax_type: ty.key }
			});
		}
	}

	const sarCost = sum(sarCosts, 'SAR');
	const sarSell = sum(sarSells, 'SAR');
	const ticketsCostPkr = sum(ticketsCost, 'PKR');
	const ticketsSellPkr = sum(ticketsSell, 'PKR');

	const totalCostPkr = add(convertToPkr(sarCost, input.roe), ticketsCostPkr);
	const totalSellPkr = add(convertToPkr(sarSell, input.roe), ticketsSellPkr);
	const profitPkr = subtract(totalSellPkr, totalCostPkr);

	return {
		lines,
		sarCost: toNumber(sarCost),
		sarSell: toNumber(sarSell),
		ticketsCostPkr: toNumber(ticketsCostPkr),
		ticketsSellPkr: toNumber(ticketsSellPkr),
		totalCostPkr: toNumber(totalCostPkr),
		totalSellPkr: toNumber(totalSellPkr),
		profitPkr: toNumber(profitPkr)
	};
}
