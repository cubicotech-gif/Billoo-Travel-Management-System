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
// penny. Hotels / Transfer / Visa are priced in SAR by default, but any line
// may be USD (Umrah-Plus / non-Saudi components); Tickets are PKR. Each foreign
// line converts to PKR via its currency's rate (ROE for SAR, USD rate for USD),
// then everything sums in PKR. All math goes through the money layer.
// ---------------------------------------------------------------------------

/** Currency a line can be priced in. PKR is used as-is (no conversion). */
export type LineCurrency = 'SAR' | 'USD' | 'PKR';

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

/**
 * Optional breakfast. Either *included* in the room rate (display only, no
 * charge — some hotels bundle it / make it compulsory) or charged *separately*
 * per person per night. `persons` is supplied by the caller (room occupancy by
 * default, or a manual override e.g. "breakfast for 2 only").
 */
export interface BreakfastInput {
	costSar: number;
	sellSar: number;
	persons: number;
	personsAuto?: boolean; // true when persons came from occupancy (not overridden)
	included?: boolean; // bundled in the room rate — show it, don't price it
}

export interface HotelInput {
	city: string;
	name: string;
	currency?: LineCurrency; // SAR (default) or USD
	hotelId?: string | null;
	mealPlan?: string | null;
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
	currency?: LineCurrency;
	vendorId?: string | null;
	costSar: number; // in `currency` (named for the SAR default)
	sellSar: number; // per vehicle, in `currency`
	vehicles: number;
}

export interface VisaInput {
	visaType: string; // 'Umrah' or a custom label
	currency?: LineCurrency;
	vendorId?: string | null;
	costSar: number; // in `currency`
	sellSar: number; // per person (infant = adult rate), in `currency`
	/** How many people this visa line covers. 0/undefined = all passengers. */
	persons?: number;
}

/** A free-form add-on (Polio cert, insurance, …). Priced like any line. */
export interface OtherServiceInput {
	label: string;
	currency?: LineCurrency;
	vendorId?: string | null;
	costSar: number; // in `currency`
	sellSar: number; // in `currency`, per unit
	qty: number;
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
	roe: number; // 1 SAR = ? PKR
	usd?: number; // 1 USD = ? PKR (required only if any line is USD)
	pax: PaxCounts;
	hotels: HotelInput[];
	transfers: TransferRow[];
	/** Visa(s). `visas` (multiple) is preferred; `visa` kept for back-compat. */
	visa?: VisaInput | null;
	visas?: VisaInput[];
	otherServices?: OtherServiceInput[];
	tickets: TicketsInput | null;
}

export interface QuotationLineResult {
	line_type: 'hotel' | 'transfer' | 'visa' | 'ticket' | 'other';
	label: string;
	rateCardId: string | null;
	vendorId: string | null;
	currency: 'SAR' | 'USD' | 'PKR';
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
	usdCost: number;
	usdSell: number;
	ticketsCostPkr: number;
	ticketsSellPkr: number;
	/** Land lines priced directly in PKR (excludes tickets). */
	pkrLandCost: number;
	pkrLandSell: number;
	/** Visa total in PKR — shown as its own line (visas vary per person). */
	visaCostPkr: number;
	visaSellPkr: number;
	/** Other add-on services, total in PKR. */
	otherCostPkr: number;
	otherSellPkr: number;
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
	share: ChildShare = DEFAULT_CHILD_SHARE,
	usd = 0
): AdvancedPerPerson {
	const adults = pax.adults > 0 ? pax.adults : 1;
	const children = pax.children;

	// Convert a line amount to PKR by its own currency.
	const rateOf = (c: QuotationLineResult['currency']) => (c === 'USD' ? usd : c === 'PKR' ? 1 : roe);
	const sumSellPkr = (pred: (l: QuotationLineResult) => boolean) =>
		result.lines.filter(pred).reduce((a, l) => a + l.lineSell * rateOf(l.currency), 0);

	const hotelsPkr = sumSellPkr((l) => l.line_type === 'hotel');
	const transfersPkr = sumSellPkr((l) => l.line_type === 'transfer');
	const ticketUnit = (paxType: string) =>
		result.lines.find((l) => l.line_type === 'ticket' && l.meta?.pax_type === paxType)?.unitSell ?? 0;
	const adultTicketPkr = ticketUnit('adult');
	const childTicketPkr = ticketUnit('child');

	const hotelsDiv = adults + (share.hotels ? children : 0);
	const transfersDiv = adults + (share.transfers ? children : 0);

	// Visa is no longer a per-person component — visas vary per person, so they're
	// quoted as their own total (result.visaSellPkr). Same for other services.
	const adultBreakdown = [
		{ label: 'Accommodation', amount: roundPkr(hotelsPkr / hotelsDiv) },
		{ label: 'Transfers', amount: roundPkr(transfersPkr / transfersDiv) },
		{ label: 'Air ticket', amount: roundPkr(adultTicketPkr) }
	].filter((b) => b.amount > 0);

	const childBreakdown = [
		{ label: 'Accommodation', amount: share.hotels ? roundPkr(hotelsPkr / hotelsDiv) : 0 },
		{ label: 'Transfers', amount: share.transfers ? roundPkr(transfersPkr / transfersDiv) : 0 },
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
	const usdCosts: Money[] = [];
	const usdSells: Money[] = [];
	const pkrCosts: Money[] = [];
	const pkrSells: Money[] = [];
	// Route a line's money into its currency bucket. PKR is not converted.
	const push = (cur: LineCurrency, cost: Money, sell: Money) => {
		if (cur === 'USD') {
			usdCosts.push(cost);
			usdSells.push(sell);
		} else if (cur === 'PKR') {
			pkrCosts.push(cost);
			pkrSells.push(sell);
		} else {
			sarCosts.push(cost);
			sarSells.push(sell);
		}
	};

	// Hotels: one line per room type — total = perNight × qty × nights.
	for (let hi = 0; hi < input.hotels.length; hi++) {
		const h = input.hotels[hi];
		if (!h || h.nights <= 0) continue;
		const hcur: LineCurrency = h.currency ?? 'SAR';
		for (const rt of h.rooms) {
			const units = rt.qty * h.nights;
			if (units <= 0) continue;
			const lineCost = multiply(money(rt.costSar, hcur), units);
			const lineSell = multiply(money(rt.sellSar, hcur), units);
			push(hcur, lineCost, lineSell);
			lines.push({
				line_type: 'hotel',
				label: `${h.city} — ${h.name} (${rt.label} ×${rt.qty})`,
				rateCardId: h.rateCardId ?? null,
				vendorId: h.vendorId ?? null,
				currency: hcur,
				unitCost: rt.costSar,
				unitSell: rt.sellSar,
				quantity: units,
				lineCost: toNumber(lineCost),
				lineSell: toNumber(lineSell),
				meta: {
					stay: hi,
					city: h.city,
					hotel: h.name,
					hotel_id: h.hotelId ?? null,
					meal_plan: h.mealPlan ?? null,
					room_type: rt.label,
					occupancy: rt.occupancy,
					qty: rt.qty,
					nights: h.nights,
					check_in: h.checkIn ?? null,
					check_out: h.checkOut ?? null
				}
			});
		}

		// Breakfast: included (display, no charge) or per person per night.
		if (h.breakfast) {
			const b = h.breakfast;
			const priced = !b.included && (b.costSar > 0 || b.sellSar > 0);
			if (b.included || priced) {
				const units = b.persons * h.nights;
				const unitCost = b.included ? 0 : b.costSar;
				const unitSell = b.included ? 0 : b.sellSar;
				const lineCost = multiply(money(unitCost, hcur), units);
				const lineSell = multiply(money(unitSell, hcur), units);
				push(hcur, lineCost, lineSell);
				lines.push({
					line_type: 'hotel',
					label: b.included
						? `${h.city} — ${h.name} (breakfast included)`
						: `${h.city} — ${h.name} (breakfast ×${b.persons}/night)`,
					rateCardId: null,
					vendorId: h.vendorId ?? null,
					currency: hcur,
					unitCost,
					unitSell,
					quantity: units,
					lineCost: toNumber(lineCost),
					lineSell: toNumber(lineSell),
					meta: {
						stay: hi,
						kind: 'breakfast',
						included: !!b.included,
						city: h.city,
						hotel: h.name,
						hotel_id: h.hotelId ?? null,
						meal_plan: h.mealPlan ?? null,
						persons: b.persons,
						persons_auto: b.personsAuto ?? true,
						nights: h.nights
					}
				});
			}
		}
	}

	// Transfers: one line per route.
	for (const t of input.transfers) {
		if (t.vehicles <= 0) continue;
		const tcur: LineCurrency = t.currency ?? 'SAR';
		const lineCost = multiply(money(t.costSar, tcur), t.vehicles);
		const lineSell = multiply(money(t.sellSar, tcur), t.vehicles);
		push(tcur, lineCost, lineSell);
		lines.push({
			line_type: 'transfer',
			label: `${t.route} (${t.vehicleType})`,
			rateCardId: null,
			vendorId: t.vendorId ?? null,
			currency: tcur,
			unitCost: t.costSar,
			unitSell: t.sellSar,
			quantity: t.vehicles,
			lineCost: toNumber(lineCost),
			lineSell: toNumber(lineSell),
			meta: { vehicle_type: t.vehicleType, route: t.route }
		});
	}

	const visaList = input.visas ?? (input.visa ? [input.visa] : []);
	const persons = totalPersons(input.pax);
	const usdRate = input.usd ?? 0;
	// Convert any line Money to PKR by its currency (PKR is used as-is).
	const toPkr = (m: Money, cur: LineCurrency): Money =>
		cur === 'PKR' ? m : convertToPkr(m, cur === 'USD' ? usdRate : input.roe);

	let visaCostPkrM = money(0, 'PKR');
	let visaSellPkrM = money(0, 'PKR');
	visaList.forEach((v, vi) => {
		if (!v) return;
		const vcur: LineCurrency = v.currency ?? 'SAR';
		// Each visa line covers its own headcount; 0 = all passengers.
		const vpersons = v.persons && v.persons > 0 ? v.persons : persons;
		const lineCost = multiply(money(v.costSar, vcur), vpersons);
		const lineSell = multiply(money(v.sellSar, vcur), vpersons);
		// Visa is tracked as its own PKR total (below) — kept OUT of the land
		// SAR/USD/PKR subtotals so the staff breakdown reconciles to the grand total.
		visaCostPkrM = add(visaCostPkrM, toPkr(lineCost, vcur));
		visaSellPkrM = add(visaSellPkrM, toPkr(lineSell, vcur));
		lines.push({
			line_type: 'visa',
			label: `${v.visaType} visa`,
			rateCardId: null,
			vendorId: v.vendorId ?? null,
			currency: vcur,
			unitCost: v.costSar,
			unitSell: v.sellSar,
			quantity: vpersons,
			lineCost: toNumber(lineCost),
			lineSell: toNumber(lineSell),
			meta: { visa_type: v.visaType, visa_index: vi, persons: vpersons }
		});
	});

	// Other add-on services (Polio cert, insurance, …).
	let otherCostPkrM = money(0, 'PKR');
	let otherSellPkrM = money(0, 'PKR');
	(input.otherServices ?? []).forEach((s, si) => {
		if (!s || !s.label.trim()) return;
		const scur: LineCurrency = s.currency ?? 'PKR';
		const qty = s.qty > 0 ? s.qty : 1;
		const lineCost = multiply(money(s.costSar, scur), qty);
		const lineSell = multiply(money(s.sellSar, scur), qty);
		// Like visa: its own PKR total, excluded from the land subtotals.
		otherCostPkrM = add(otherCostPkrM, toPkr(lineCost, scur));
		otherSellPkrM = add(otherSellPkrM, toPkr(lineSell, scur));
		lines.push({
			line_type: 'other',
			label: s.label.trim(),
			rateCardId: null,
			vendorId: s.vendorId ?? null,
			currency: scur,
			unitCost: s.costSar,
			unitSell: s.sellSar,
			quantity: qty,
			lineCost: toNumber(lineCost),
			lineSell: toNumber(lineSell),
			meta: { other_index: si }
		});
	});

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
	const usdCost = sum(usdCosts, 'USD');
	const usdSell = sum(usdSells, 'USD');
	// PKR-priced land lines (hotels/transfers set to PKR) — used as-is.
	const pkrLandCost = sum(pkrCosts, 'PKR');
	const pkrLandSell = sum(pkrSells, 'PKR');
	// Land PKR + PKR tickets — neither needs conversion.
	const pkrCost = sum([...pkrCosts, ...ticketsCost], 'PKR');
	const pkrSell = sum([...pkrSells, ...ticketsSell], 'PKR');
	const ticketsCostPkr = sum(ticketsCost, 'PKR');
	const ticketsSellPkr = sum(ticketsSell, 'PKR');

	// Grand total = land (SAR+USD+PKR converted) + tickets (in pkr*) + visa + other.
	// Visa & other are their own PKR totals, added here once so the breakdown that
	// lists them separately reconciles exactly.
	const landCostPkr = add(
		add(convertToPkr(sarCost, input.roe), convertToPkr(usdCost, usdRate)),
		pkrCost
	);
	const landSellPkr = add(
		add(convertToPkr(sarSell, input.roe), convertToPkr(usdSell, usdRate)),
		pkrSell
	);
	const totalCostPkr = add(add(landCostPkr, visaCostPkrM), otherCostPkrM);
	const totalSellPkr = add(add(landSellPkr, visaSellPkrM), otherSellPkrM);
	const profitPkr = subtract(totalSellPkr, totalCostPkr);

	return {
		lines,
		sarCost: toNumber(sarCost),
		sarSell: toNumber(sarSell),
		usdCost: toNumber(usdCost),
		usdSell: toNumber(usdSell),
		ticketsCostPkr: toNumber(ticketsCostPkr),
		ticketsSellPkr: toNumber(ticketsSellPkr),
		pkrLandCost: toNumber(pkrLandCost),
		pkrLandSell: toNumber(pkrLandSell),
		visaCostPkr: toNumber(visaCostPkrM),
		visaSellPkr: toNumber(visaSellPkrM),
		otherCostPkr: toNumber(otherCostPkrM),
		otherSellPkr: toNumber(otherSellPkrM),
		totalCostPkr: toNumber(totalCostPkr),
		totalSellPkr: toNumber(totalSellPkr),
		profitPkr: toNumber(profitPkr)
	};
}
