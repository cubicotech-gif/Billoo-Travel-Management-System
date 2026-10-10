import {
	add,
	convertToPkr,
	money,
	multiply,
	subtract,
	sum,
	toNumber,
	type Money
} from '$lib/money';
import type { HajjAddonKind } from '$lib/database.types';
import type { HajjAddon, HajjCurrency, HajjOptionCode, HajjPackage, HajjRoomType } from './types';
import { ROOM_TYPES } from './types';

// ---------------------------------------------------------------------------
// Hajj pricing. Pure functions — no I/O — so the rules are unit-tested.
//
//  * The catalogue price is OUR COST. The selling price is set per quote.
//  * The base package may be sold below cost; add-ons never below their cost.
//  * A traveller's base currency follows their catalogue (USD or SAR). USD is
//    never converted; SAR converts to PKR at the quote's ROE. Tickets are PKR.
//  * GMC is a pooled vehicle: one price per vehicle, split by headcount.
// All money goes through $lib/money (integer minor units).
// ---------------------------------------------------------------------------

// --- Catalogue lookups ----------------------------------------------------

/** Hotel options a package offers (a single-option package only has 'A'). */
export function availableOptions(pkg: HajjPackage | undefined): HajjOptionCode[] {
	if (!pkg) return [];
	return pkg.options.map((o) => o.code).sort();
}

/** Room sharings priced for an option (N/A combinations are absent). */
export function availableRooms(
	pkg: HajjPackage | undefined,
	option: HajjOptionCode
): HajjRoomType[] {
	const opt = pkg?.options.find((o) => o.code === option);
	if (!opt) return [];
	const priced = new Set(opt.prices.map((p) => p.room_type));
	return ROOM_TYPES.filter((r) => priced.has(r));
}

/** Catalogue cost of the base package for one person, or null if not offered. */
export function baseCost(
	pkg: HajjPackage | undefined,
	option: HajjOptionCode,
	room: HajjRoomType
): number | null {
	const price = pkg?.options
		.find((o) => o.code === option)
		?.prices.find((p) => p.room_type === room);
	return price ? Number(price.price) : null;
}

/** Whether an add-on can be offered on a package (NULL list = every package). */
export function addonApplies(
	addon: Pick<HajjAddon, 'package_codes'>,
	packageCode: string
): boolean {
	return !addon.package_codes || addon.package_codes.includes(packageCode);
}

/** Room-dependent add-ons need a price for the traveller's room sharing. */
export function addonOfferedForRoom(addon: HajjAddon, room: HajjRoomType): boolean {
	if (addon.pricing_kind === 'per_person_by_room' || addon.pricing_kind === 'per_night_by_room')
		return addon.room_prices.some((p) => p.room_type === room);
	return true;
}

// --- Quote computation ----------------------------------------------------

/** What the calculator needs to know about an add-on definition. */
export interface CalcAddonDef {
	id: string;
	kind: HajjAddonKind;
	/** The add-on's own currency (its catalogue's). */
	currency: HajjCurrency;
	unitPrice: number | null;
	capacity: number | null;
	roomPrices: Partial<Record<HajjRoomType, number>>;
}

export interface CalcAddonLine {
	/** hajj_traveller_addons.id */
	id: string;
	def: CalcAddonDef;
	qty: number;
	costOverride: number | null;
	sellPrice: number | null;
	/** Settled GMC share (once the query is in Booking); null while still quoting. */
	poolCost?: number | null;
	poolSharers?: number | null;
}

export interface CalcTraveller {
	id: string;
	currency: HajjCurrency;
	room: HajjRoomType;
	/** Catalogue cost of the base package; null when not offered. */
	baseCost: number | null;
	baseSell: number;
	ticketCost: number;
	ticketSell: number;
	/** Commission the vendor pays us for this person (base currency); 0 if not set. */
	commission?: number;
	addons: CalcAddonLine[];
}

export interface LineResult {
	lineId: string;
	currency: HajjCurrency;
	cost: number;
	sell: number;
	/** No catalogue price and no manual override — cost shown as 0. */
	missingPrice: boolean;
	/** The entered selling price was below cost and was raised to cost. */
	floored: boolean;
	/** Pooled vehicle: how many travellers share it. */
	sharers: number | null;
}

export interface Amounts {
	cost: number;
	sell: number;
}

export interface TravellerResult {
	id: string;
	currency: HajjCurrency;
	baseCost: number;
	baseSell: number;
	baseMissing: boolean;
	addons: LineResult[];
	/** Base + add-ons, per currency. */
	amounts: Partial<Record<HajjCurrency, Amounts>>;
	ticketCost: number;
	ticketSell: number;
	commission: number;
}

export interface CurrencyTotals extends Amounts {
	currency: HajjCurrency;
	profit: number;
}

export interface QuoteResult {
	travellers: TravellerResult[];
	/** Per currency actually used, USD before SAR. */
	byCurrency: CurrencyTotals[];
	ticket: Amounts & { profit: number };
	roe: number;
	/** Commission receivable from the vendor, per currency (staff only). */
	commission: Partial<Record<HajjCurrency, number>>;
	/** SAR side converted to PKR at the ROE, plus tickets. USD is never converted. */
	pkr: Amounts & { profit: number };
	usd: CurrencyTotals | null;
}

const CURRENCY_ORDER: HajjCurrency[] = ['USD', 'SAR'];

/** Cost of one non-pooled add-on line for one traveller; null if no price known. */
function lineUnitCost(line: CalcAddonLine, room: HajjRoomType): number | null {
	const { def, qty } = line;
	switch (def.kind) {
		case 'per_person':
			return def.unitPrice === null
				? null
				: toNumber(multiply(money(def.unitPrice, def.currency), qty));
		case 'per_person_by_room': {
			const p = def.roomPrices[room];
			return p === undefined ? null : p;
		}
		case 'per_night_by_room': {
			const p = def.roomPrices[room];
			return p === undefined ? null : toNumber(multiply(money(p, def.currency), qty));
		}
		case 'pooled_vehicle':
			return null; // handled by the pool split
	}
}

/**
 * Split one vehicle price across its sharers. n sharers need ceil(n/capacity)
 * vehicles, split evenly by headcount in whole minor units (the first `r`
 * sharers carry the odd cent), so the shares always add up exactly.
 */
export function splitVehicle(vehiclePrice: number, capacity: number, sharers: number): number[] {
	if (sharers <= 0) return [];
	const vehicles = Math.ceil(sharers / Math.max(1, capacity));
	const totalMinor = Math.round(vehiclePrice * 100) * vehicles;
	const base = Math.floor(totalMinor / sharers);
	const rem = totalMinor - base * sharers;
	return Array.from({ length: sharers }, (_, i) => (base + (i < rem ? 1 : 0)) / 100);
}

export function computeQuote(input: { roe: number; travellers: CalcTraveller[] }): QuoteResult {
	const { roe, travellers } = input;

	// Pooled vehicles: group the lines taking the same GMC add-on, in order.
	const pools = new Map<string, string[]>();
	for (const t of travellers)
		for (const l of t.addons)
			if (l.def.kind === 'pooled_vehicle' && l.costOverride === null && l.poolCost == null) {
				const arr = pools.get(l.def.id) ?? [];
				arr.push(l.id);
				pools.set(l.def.id, arr);
			}
	const poolShare = new Map<string, { share: number; sharers: number }>();
	for (const [defId, lineIds] of pools) {
		const def = travellers.flatMap((t) => t.addons).find((l) => l.def.id === defId)?.def;
		if (!def || def.unitPrice === null) continue;
		const shares = splitVehicle(def.unitPrice, def.capacity ?? 6, lineIds.length);
		lineIds.forEach((lineId, i) =>
			poolShare.set(lineId, { share: shares[i] ?? 0, sharers: lineIds.length })
		);
	}

	const results: TravellerResult[] = travellers.map((t) => {
		const baseCostN = t.baseCost ?? 0;
		const lines: LineResult[] = t.addons.map((l) => {
			let cost: number | null;
			let sharers: number | null = null;
			if (l.costOverride !== null) cost = l.costOverride;
			else if (l.def.kind === 'pooled_vehicle' && l.poolCost != null) {
				// Settled across clients at booking.
				cost = l.poolCost;
				sharers = l.poolSharers ?? null;
			} else if (l.def.kind === 'pooled_vehicle') {
				const p = poolShare.get(l.id);
				cost = p ? p.share : null;
				sharers = p ? p.sharers : null;
			} else cost = lineUnitCost(l, t.room);
			const costN = cost ?? 0;
			// Add-ons are never sold below cost.
			const wanted = l.sellPrice ?? costN;
			const sell = Math.max(wanted, costN);
			return {
				lineId: l.id,
				currency: l.def.currency,
				cost: costN,
				sell,
				missingPrice: cost === null,
				floored: l.sellPrice !== null && l.sellPrice < costN,
				sharers
			};
		});

		const acc: Partial<Record<HajjCurrency, { cost: Money; sell: Money }>> = {};
		const put = (cur: HajjCurrency, cost: number, sell: number) => {
			const cur0 = acc[cur] ?? { cost: money(0, cur), sell: money(0, cur) };
			acc[cur] = { cost: add(cur0.cost, money(cost, cur)), sell: add(cur0.sell, money(sell, cur)) };
		};
		put(t.currency, baseCostN, t.baseSell);
		for (const l of lines) put(l.currency, l.cost, l.sell);

		const amounts: Partial<Record<HajjCurrency, Amounts>> = {};
		for (const cur of CURRENCY_ORDER) {
			const a = acc[cur];
			if (a) amounts[cur] = { cost: toNumber(a.cost), sell: toNumber(a.sell) };
		}
		return {
			id: t.id,
			currency: t.currency,
			baseCost: baseCostN,
			baseSell: t.baseSell,
			baseMissing: t.baseCost === null,
			addons: lines,
			amounts,
			ticketCost: t.ticketCost,
			ticketSell: t.ticketSell,
			commission: t.commission ?? 0
		};
	});

	// Family totals per currency.
	const byCurrency: CurrencyTotals[] = [];
	for (const cur of CURRENCY_ORDER) {
		const parts = results.map((r) => r.amounts[cur]).filter((a): a is Amounts => !!a);
		if (!parts.length) continue;
		const cost = sum(
			parts.map((a) => money(a.cost, cur)),
			cur
		);
		const sell = sum(
			parts.map((a) => money(a.sell, cur)),
			cur
		);
		byCurrency.push({
			currency: cur,
			cost: toNumber(cost),
			sell: toNumber(sell),
			profit: toNumber(subtract(sell, cost))
		});
	}

	// Commission is paid in the traveller's package currency.
	const commission: Partial<Record<HajjCurrency, number>> = {};
	for (const cur of CURRENCY_ORDER) {
		const parts = results.filter((r) => r.currency === cur && r.commission > 0);
		if (parts.length)
			commission[cur] = toNumber(
				sum(
					parts.map((r) => money(r.commission, cur)),
					cur
				)
			);
	}

	const ticketCost = sum(
		results.map((r) => money(r.ticketCost, 'PKR')),
		'PKR'
	);
	const ticketSell = sum(
		results.map((r) => money(r.ticketSell, 'PKR')),
		'PKR'
	);

	const sar = byCurrency.find((c) => c.currency === 'SAR');
	const pkrCost = add(convertToPkr(money(sar?.cost ?? 0, 'SAR'), roe), ticketCost);
	const pkrSell = add(convertToPkr(money(sar?.sell ?? 0, 'SAR'), roe), ticketSell);

	return {
		travellers: results,
		byCurrency,
		ticket: {
			cost: toNumber(ticketCost),
			sell: toNumber(ticketSell),
			profit: toNumber(subtract(ticketSell, ticketCost))
		},
		roe,
		commission,
		pkr: {
			cost: toNumber(pkrCost),
			sell: toNumber(pkrSell),
			profit: toNumber(subtract(pkrSell, pkrCost))
		},
		usd: byCurrency.find((c) => c.currency === 'USD') ?? null
	};
}
