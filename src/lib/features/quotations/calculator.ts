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

/**
 * Per-service booking status (booking stage only). A service is the agreed,
 * final thing we actually pay a vendor for; once arranged it's marked booked,
 * with an optional vendor reference and a flag for whether its proof/voucher
 * has been filed. Stamped into every line a service produces so the booking,
 * itinerary and invoice all reflect it. Absent/false in plain quote mode.
 */
export interface BookedStatus {
	booked?: boolean;
	bookedAt?: string | null;
	bookingRef?: string | null;
	proof?: boolean;
	/** Id of the document linked as this service's proof (uploaded or existing). */
	proofDocId?: string | null;
}

/** Normalise booked status into the flat keys carried on each line's meta. */
export function bookedMeta(s: BookedStatus): Record<string, unknown> {
	return {
		booked: !!s.booked,
		booked_at: s.bookedAt ?? null,
		booking_ref: s.bookingRef || null,
		proof: !!s.proof,
		proof_doc_id: s.proofDocId || null
	};
}

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

export interface HotelInput extends BookedStatus {
	city: string;
	name: string;
	currency?: LineCurrency; // SAR (default) or USD
	parallel?: boolean; // 2nd hotel sharing the previous stay's dates
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

export interface TransferRow extends BookedStatus {
	vehicleType: string; // 4 / 7 / 14 / 50-seater / custom
	route: string; // Airport → Makkah, etc.
	date?: string | null; // pick-up date (confirmation voucher)
	currency?: LineCurrency;
	vendorId?: string | null;
	costSar: number; // in `currency` (named for the SAR default)
	sellSar: number; // per vehicle, in `currency`
	vehicles: number;
}

export interface VisaInput extends BookedStatus {
	visaType: string; // 'Umrah' or a custom label
	currency?: LineCurrency;
	vendorId?: string | null;
	costSar: number; // in `currency`
	sellSar: number; // per person (infant = adult rate), in `currency`
	/** How many people this visa line covers. 0/undefined = all passengers. */
	persons?: number;
}

/** A free-form add-on (Polio cert, insurance, …). Priced like any line. */
export interface OtherServiceInput extends BookedStatus {
	label: string;
	currency?: LineCurrency;
	vendorId?: string | null;
	costSar: number; // in `currency`
	sellSar: number; // in `currency`, per unit
	qty: number;
}

/**
 * A fare tier: a sub-group of one passenger type booked at its own fare. Same
 * airline/flight, different price — e.g. of 12 adults, 1 @ 144 and 11 @ 155.
 * The UI validates that a type's tier counts sum to that type's passenger total.
 */
export interface FareTier {
	count: number;
	cost: number;
	sell: number;
}

export interface TicketsInput extends BookedStatus {
	airlineName: string;
	rateCardId?: string | null;
	// Flights are in-house (no vendor) — capture flight detail instead.
	route?: string | null;
	fareClass?: string | null;
	pnr?: string | null;
	// Single fare per passenger type — used when that type isn't split into
	// tiers. (`adultCost` also feeds the airline rate auto-save.)
	adultCost: number;
	adultSell: number;
	childCost: number;
	childSell: number;
	infantCost: number;
	infantSell: number;
	// Optional fare tiers per passenger type. When a type's array is present and
	// non-empty, the calculator prices each tier as its own line (tier.count ×
	// fare) instead of the single fare × pax count above.
	adultTiers?: FareTier[];
	childTiers?: FareTier[];
	infantTiers?: FareTier[];
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
					check_out: h.checkOut ?? null,
					parallel: !!h.parallel,
					...bookedMeta(h)
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
						nights: h.nights,
						parallel: !!h.parallel,
						...bookedMeta(h)
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
			meta: { vehicle_type: t.vehicleType, route: t.route, date: t.date ?? null, ...bookedMeta(t) }
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
			meta: { visa_type: v.visaType, visa_index: vi, persons: vpersons, ...bookedMeta(v) }
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
			meta: { other_index: si, ...bookedMeta(s) }
		});
	});

	const ticketsCost: Money[] = [];
	const ticketsSell: Money[] = [];
	if (input.tickets) {
		const t = input.tickets;
		const types = [
			{ key: 'adult', count: input.pax.adults, cost: t.adultCost, sell: t.adultSell, tiers: t.adultTiers },
			{ key: 'child', count: input.pax.children, cost: t.childCost, sell: t.childSell, tiers: t.childTiers },
			{ key: 'infant', count: input.pax.infants, cost: t.infantCost, sell: t.infantSell, tiers: t.infantTiers }
		];
		for (const ty of types) {
			// A type is either one fare for everyone (count from pax) or split into
			// fare tiers with explicit per-tier counts (validated in the UI to sum
			// to the pax total). Each priced group becomes its own ticket line.
			const groups: FareTier[] =
				ty.tiers && ty.tiers.length > 0
					? ty.tiers
					: [{ count: ty.count, cost: ty.cost, sell: ty.sell }];
			groups.forEach((g, gi) => {
				if (g.count <= 0) return;
				const lineCost = multiply(money(g.cost, 'PKR'), g.count);
				const lineSell = multiply(money(g.sell, 'PKR'), g.count);
				ticketsCost.push(lineCost);
				ticketsSell.push(lineSell);
				lines.push({
					line_type: 'ticket',
					label: `${t.airlineName} (${ty.key} ×${g.count})`,
					rateCardId: t.rateCardId ?? null,
					vendorId: null, // in-house ticketing
					currency: 'PKR',
					unitCost: g.cost,
					unitSell: g.sell,
					quantity: g.count,
					lineCost: toNumber(lineCost),
					lineSell: toNumber(lineSell),
					meta: {
						pax_type: ty.key,
						tier_index: gi,
						route: t.route ?? null,
						fare_class: t.fareClass ?? null,
						pnr: t.pnr ?? null,
						...bookedMeta(t)
					}
				});
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
