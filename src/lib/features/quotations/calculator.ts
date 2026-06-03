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

export interface HotelInput {
	city: string;
	name: string;
	rateCardId?: string | null;
	vendorId?: string | null;
	nights: number;
	checkIn?: string | null;
	checkOut?: string | null;
	rooms: RoomType[];
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

export function calculateQuotation(input: QuotationInput): QuotationResult {
	const lines: QuotationLineResult[] = [];
	const sarCosts: Money[] = [];
	const sarSells: Money[] = [];

	// Hotels: one line per room type — total = perNight × qty × nights.
	for (const h of input.hotels) {
		if (h.nights <= 0) continue;
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
