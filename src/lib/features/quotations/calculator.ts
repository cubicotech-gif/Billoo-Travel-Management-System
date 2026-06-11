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
// Quotation calculator. Pure functions — no UI, no I/O — unit tested to the
// penny. Hotels / Transfer / Visa are SAR; Tickets are PKR; a single ROE
// (SAR->PKR) converts the SAR side. All math goes through the money layer.
// ---------------------------------------------------------------------------

export interface PaxCounts {
	adults: number;
	children: number;
	infants: number;
}

/** A room type within a hotel (mixed types allowed). Priced per night. */
export interface RoomType {
	label: string; // Double / Triple / Quad / Quint / custom
	occupancy: number;
	qty: number;
	costSar: number;
	sellSar: number;
}

/** Optional breakfast add-on, charged per person per night (room occupancy). */
export interface BreakfastInput {
	costSar: number;
	sellSar: number;
}

export interface HotelInput {
	city: string;
	name: string;
	rateCardId?: string | null;
	vendorId?: string | null;
	nights: number;
	checkIn?: string | null;
	checkOut?: string | null;
	rooms: RoomType[];
	breakfast?: BreakfastInput | null;
}

/** Persons sleeping in a stay = Σ(occupancy × qty) across its room types. */
export function personsInRooms(rooms: RoomType[]): number {
	return rooms.reduce((a, r) => a + r.occupancy * r.qty, 0);
}

export interface TransferRow {
	vehicleType: string; // 4 / 7 / 14 / 50-seater / custom
	route: string; // Airport → Makkah, etc.
	vendorId?: string | null;
	costSar: number;
	sellSar: number; // per vehicle
	vehicles: number;
}

export interface VisaInput {
	visaType: string; // 'Umrah' or a custom label
	vendorId?: string | null;
	costSar: number;
	sellSar: number; // per person (infant = adult rate)
}

export interface TicketsInput {
	airlineName: string;
	rateCardId?: string | null;
	// Flights are in-house (no vendor) — capture flight detail instead.
	route?: string | null;
	fareClass?: string | null;
	pnr?: string | null;
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
	transfers: TransferRow[];
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

export function totalPersons(pax: PaxCounts): number {
	return pax.adults + pax.children + pax.infants;
}

export function perPersonDivisor(pax: PaxCounts, includeInfants: boolean): number {
	const n = pax.adults + pax.children + (includeInfants ? pax.infants : 0);
	return n > 0 ? n : 1;
}

export function perPerson(totalPkr: number, divisor: number): number {
	return Math.round((totalPkr / (divisor || 1)) * 100) / 100;
}

export function roomsFor(persons: number, occupancy: number): number {
	if (occupancy <= 0) return persons;
	return Math.ceil(persons / occupancy);
}

// --- Advanced per-person split ------------------------------------------
// Shared package costs (hotels, transfers — room/vehicle based) divide across
// the adults; children are charged only for the per-person items they actually
// use (visa, tickets) at their own rates. Which buckets children share is
// configurable so staff can fine-tune the breakdown.

export interface ChildShare {
	hotels: boolean;
	transfers: boolean;
	visa: boolean;
	tickets: boolean;
}

export const DEFAULT_CHILD_SHARE: ChildShare = {
	hotels: false,
	transfers: false,
	visa: true,
	tickets: true
};

export interface AdvancedPerPerson {
	perAdult: number;
	perChild: number;
	adultBreakdown: { label: string; amount: number }[];
	childBreakdown: { label: string; amount: number }[];
}

function roundPkr(n: number): number {
	return Math.round(n * 100) / 100;
}

/**
 * Advanced per-person split, computed from the calculated line breakdown.
 * SAR lines are converted to PKR via the ROE; tickets are already PKR.
 */
export function perPersonAdvanced(
	result: QuotationResult,
	roe: number,
	pax: PaxCounts,
	share: ChildShare = DEFAULT_CHILD_SHARE
): AdvancedPerPerson {
	const adults = pax.adults > 0 ? pax.adults : 1;
	const children = pax.children;

	const sar = (n: number) => n * roe;
	const sumSell = (pred: (l: QuotationLineResult) => boolean) =>
		result.lines.filter(pred).reduce((a, l) => a + l.lineSell, 0);

	const hotelsPkr = sar(sumSell((l) => l.line_type === 'hotel'));
	const transfersPkr = sar(sumSell((l) => l.line_type === 'transfer'));
	// Visa is stored per-person (quantity = persons); recover the unit rate.
	const visaLine = result.lines.find((l) => l.line_type === 'visa');
	const visaPerPersonPkr = visaLine ? sar(visaLine.unitSell) : 0;
	const ticketUnit = (paxType: string) =>
		result.lines.find((l) => l.line_type === 'ticket' && l.meta?.pax_type === paxType)?.unitSell ?? 0;
	const adultTicketPkr = ticketUnit('adult');
	const childTicketPkr = ticketUnit('child');

	const hotelsDiv = adults + (share.hotels ? children : 0);
	const transfersDiv = adults + (share.transfers ? children : 0);

	const adultBreakdown = [
		{ label: 'Accommodation', amount: roundPkr(hotelsPkr / hotelsDiv) },
		{ label: 'Transfers', amount: roundPkr(transfersPkr / transfersDiv) },
		{ label: 'Visa', amount: roundPkr(visaPerPersonPkr) },
		{ label: 'Air ticket', amount: roundPkr(adultTicketPkr) }
	].filter((b) => b.amount > 0);

	const childBreakdown = [
		{ label: 'Accommodation', amount: share.hotels ? roundPkr(hotelsPkr / hotelsDiv) : 0 },
		{ label: 'Transfers', amount: share.transfers ? roundPkr(transfersPkr / transfersDiv) : 0 },
		{ label: 'Visa', amount: share.visa ? roundPkr(visaPerPersonPkr) : 0 },
		{ label: 'Air ticket', amount: share.tickets ? roundPkr(childTicketPkr) : 0 }
	].filter((b) => b.amount > 0);

	return {
		perAdult: roundPkr(adultBreakdown.reduce((a, b) => a + b.amount, 0)),
		perChild: roundPkr(childBreakdown.reduce((a, b) => a + b.amount, 0)),
		adultBreakdown,
		childBreakdown
	};
}

export function calculateQuotation(input: QuotationInput): QuotationResult {
	const lines: QuotationLineResult[] = [];
	const sarCosts: Money[] = [];
	const sarSells: Money[] = [];

	// Hotels: one line per room type — total = perNight × qty × nights.
	for (let hi = 0; hi < input.hotels.length; hi++) {
		const h = input.hotels[hi];
		if (!h || h.nights <= 0) continue;
		for (const rt of h.rooms) {
			const units = rt.qty * h.nights;
			if (units <= 0) continue;
			const lineCost = multiply(money(rt.costSar, 'SAR'), units);
			const lineSell = multiply(money(rt.sellSar, 'SAR'), units);
			sarCosts.push(lineCost);
			sarSells.push(lineSell);
			lines.push({
				line_type: 'hotel',
				label: `${h.city} — ${h.name} (${rt.label} ×${rt.qty})`,
				rateCardId: h.rateCardId ?? null,
				vendorId: h.vendorId ?? null,
				currency: 'SAR',
				unitCost: rt.costSar,
				unitSell: rt.sellSar,
				quantity: units,
				lineCost: toNumber(lineCost),
				lineSell: toNumber(lineSell),
				meta: {
					stay: hi,
					city: h.city,
					hotel: h.name,
					room_type: rt.label,
					occupancy: rt.occupancy,
					qty: rt.qty,
					nights: h.nights,
					check_in: h.checkIn ?? null,
					check_out: h.checkOut ?? null
				}
			});
		}

		// Breakfast: per person per night, persons derived from room occupancy.
		if (h.breakfast && (h.breakfast.costSar > 0 || h.breakfast.sellSar > 0)) {
			const persons = personsInRooms(h.rooms);
			const units = persons * h.nights;
			if (units > 0) {
				const lineCost = multiply(money(h.breakfast.costSar, 'SAR'), units);
				const lineSell = multiply(money(h.breakfast.sellSar, 'SAR'), units);
				sarCosts.push(lineCost);
				sarSells.push(lineSell);
				lines.push({
					line_type: 'hotel',
					label: `${h.city} — ${h.name} (breakfast ×${persons}/night)`,
					rateCardId: null,
					vendorId: h.vendorId ?? null,
					currency: 'SAR',
					unitCost: h.breakfast.costSar,
					unitSell: h.breakfast.sellSar,
					quantity: units,
					lineCost: toNumber(lineCost),
					lineSell: toNumber(lineSell),
					meta: {
						stay: hi,
						kind: 'breakfast',
						city: h.city,
						hotel: h.name,
						persons,
						nights: h.nights
					}
				});
			}
		}
	}

	// Transfers: one line per route.
	for (const t of input.transfers) {
		if (t.vehicles <= 0) continue;
		const lineCost = multiply(money(t.costSar, 'SAR'), t.vehicles);
		const lineSell = multiply(money(t.sellSar, 'SAR'), t.vehicles);
		sarCosts.push(lineCost);
		sarSells.push(lineSell);
		lines.push({
			line_type: 'transfer',
			label: `${t.route} (${t.vehicleType})`,
			rateCardId: null,
			vendorId: t.vendorId ?? null,
			currency: 'SAR',
			unitCost: t.costSar,
			unitSell: t.sellSar,
			quantity: t.vehicles,
			lineCost: toNumber(lineCost),
			lineSell: toNumber(lineSell),
			meta: { vehicle_type: t.vehicleType, route: t.route }
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
			label: `${v.visaType} visa`,
			rateCardId: null,
			vendorId: v.vendorId ?? null,
			currency: 'SAR',
			unitCost: v.costSar,
			unitSell: v.sellSar,
			quantity: persons,
			lineCost: toNumber(lineCost),
			lineSell: toNumber(lineSell),
			meta: { visa_type: v.visaType }
		});
	}

	const ticketsCost: Money[] = [];
	const ticketsSell: Money[] = [];
	if (input.tickets) {
		const t = input.tickets;
		const types = [
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
				vendorId: null, // in-house ticketing
				currency: 'PKR',
				unitCost: ty.cost,
				unitSell: ty.sell,
				quantity: ty.count,
				lineCost: toNumber(lineCost),
				lineSell: toNumber(lineSell),
				meta: {
					pax_type: ty.key,
					route: t.route ?? null,
					fare_class: t.fareClass ?? null,
					pnr: t.pnr ?? null
				}
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
