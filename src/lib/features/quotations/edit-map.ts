import type { ObsRoomType } from '$lib/database.types';
import type { Quotation, QuotationLine } from './types';

// Form model for the quote builder, shared with the edit-mapping below so a
// saved quotation can be reopened. Kept in sync with QuoteBuilder.svelte.

export const OTHER = '__other__';
// Room types mirror the rate_observations enum (double/triple/quad/sharing/custom).
export const ROOM_TYPES = ['Double', 'Triple', 'Quad', 'Sharing', 'Custom'];
export const OCCUPANCY: Record<string, number> = { Double: 2, Triple: 3, Quad: 4, Sharing: 5 };

/** Map a room-type display label to the rate_observations enum value. */
export function roomTypeEnum(rt: string): ObsRoomType {
	switch (rt) {
		case 'Double':
			return 'double';
		case 'Triple':
			return 'triple';
		case 'Quad':
			return 'quad';
		case 'Sharing':
			return 'sharing';
		default:
			return 'custom';
	}
}
/** Reverse of roomTypeEnum: map an observation enum back to a display label. */
export function roomLabelFromEnum(rt: string | null): string {
	switch (rt) {
		case 'double':
			return 'Double';
		case 'triple':
			return 'Triple';
		case 'quad':
			return 'Quad';
		case 'sharing':
			return 'Sharing';
		default:
			return 'Custom';
	}
}

export const VEHICLES = ['4-seater', '7-seater', '14-seater', '50-seater', 'Custom'];
// Named airports (Jeddah vs Madinah) so a route reads unambiguously on the quote.
export const ROUTES = [
	'Jeddah Airport → Makkah',
	'Makkah → Madinah',
	'Madinah → Madinah Airport',
	'Madinah Airport → Madinah',
	'Madinah → Makkah',
	'Makkah → Jeddah Airport',
	'Jeddah Airport → Madinah',
	'Makkah → Madinah Airport',
	'Madinah → Jeddah Airport',
	'Custom'
];

// One-tap full-transport chains. Picking one fills the transfer list with its
// legs (vehicle/price still entered per leg). Covers the common arrival/return
// airport combinations agents quote most.
export const TRANSFER_PRESETS: { label: string; routes: string[] }[] = [
	{ label: 'Jeddah in → Madinah out', routes: ['Jeddah Airport → Makkah', 'Makkah → Madinah', 'Madinah → Madinah Airport'] },
	{ label: 'Madinah in → Jeddah out', routes: ['Madinah Airport → Madinah', 'Madinah → Makkah', 'Makkah → Jeddah Airport'] },
	{ label: 'Round-trip via Jeddah', routes: ['Jeddah Airport → Makkah', 'Makkah → Madinah', 'Madinah → Jeddah Airport'] }
];

// Common air-ticket routings (incl. multi-city). Chips that fill the route field.
export const AIRLINE_ROUTES = [
	'KHI → JED → KHI',
	'KHI → JED → MED → KHI',
	'KHI → MED → JED → KHI',
	'LHE → JED → LHE',
	'LHE → JED → MED → LHE',
	'ISB → JED → ISB',
	'ISB → MED → JED → ISB'
];

let uidSeq = 0;
/** Local-only stable id for keying/reordering stay cards. */
export const uid = (): string => `s${Date.now().toString(36)}_${uidSeq++}`;

export interface RoomRow {
	rt: string;
	customLabel: string;
	occupancy: number;
	qty: number;
	cost: number;
	sell: number;
}
// A "stay" = city + hotel + dates + nights + rooms. The itinerary is a sequence
// of stays (split-stay and return visits are just more stays), dates auto-chain.
export type BreakfastMode = 'none' | 'included' | 'separate';
/** Foreign currency a line is priced in (final selling price is always PKR). */
export type LineCurrency = 'SAR' | 'USD';

export interface HotelForm {
	id: string;
	hotelId: string; // canonical hotels.id (from the searchable select)
	city: string;
	currency: LineCurrency; // SAR (Umrah) or USD (Umrah-Plus / other)
	sel: string; // '' | OTHER | a saved hotel name
	name: string;
	vendorId: string;
	mealPlan: string; // RO / BB / HB / FB
	checkIn: string;
	checkOut: string;
	nights: number;
	lockCheckIn: boolean; // user pinned this stay's check-in (don't auto-chain)
	rooms: RoomRow[];
	breakfastMode: BreakfastMode;
	breakfastPersons: number; // 0 = auto (room occupancy)
	breakfastCost: number;
	breakfastSell: number;
}
export interface TransferForm {
	sel: string; // '' (custom) | a saved transfer rate id
	vehicle: string;
	customVehicle: string;
	route: string;
	customRoute: string;
	currency: LineCurrency;
	vendorId: string;
	cost: number;
	sell: number;
	vehicles: number;
}
export interface VisaForm {
	type: string;
	otherLabel: string;
	currency: LineCurrency;
	vendorId: string;
	cost: number;
	sell: number;
}
export interface AirlineForm {
	sel: string;
	name: string;
	route: string;
	fareClass: string;
	pnr: string;
	adultCost: number;
	adultSell: number;
	childCost: number;
	childSell: number;
	infantCost: number;
	infantSell: number;
}
export interface BuilderForm {
	roeValue: number;
	usdValue: number; // 1 USD = ? PKR (for USD components)
	adults: number;
	children: number;
	infants: number;
	ppIncludeInfants: boolean;
	label: string;
	validUntil: string;
	inclusions: string;
	exclusions: string;
	hotels: HotelForm[];
	transfers: TransferForm[];
	visas: VisaForm[];
	airline: AirlineForm;
	airlineInclude: boolean;
}

export const newRoom = (): RoomRow => ({ rt: 'Double', customLabel: '', occupancy: 2, qty: 1, cost: 0, sell: 0 });
export const blankHotel = (city = ''): HotelForm => ({ id: uid(), hotelId: '', city, currency: 'SAR', sel: '', name: '', vendorId: '', mealPlan: 'RO', checkIn: '', checkOut: '', nights: 0, lockCheckIn: false, rooms: [newRoom()], breakfastMode: 'none', breakfastPersons: 0, breakfastCost: 0, breakfastSell: 0 });
export const newTransfer = (): TransferForm => ({ sel: '', vehicle: '7-seater', customVehicle: '', route: 'Jeddah Airport → Makkah', customRoute: '', currency: 'SAR', vendorId: '', cost: 0, sell: 0, vehicles: 1 });
export const blankVisa = (): VisaForm => ({ type: 'Umrah', otherLabel: '', currency: 'SAR', vendorId: '', cost: 0, sell: 0 });
export const blankAirline = (): AirlineForm => ({ sel: '', name: '', route: '', fareClass: '', pnr: '', adultCost: 0, adultSell: 0, childCost: 0, childSell: 0, infantCost: 0, infantSell: 0 });

export function blankForm(): BuilderForm {
	return {
		roeValue: 0,
		usdValue: 0,
		adults: 1,
		children: 0,
		infants: 0,
		ppIncludeInfants: false,
		label: '',
		validUntil: '',
		inclusions: '',
		exclusions: '',
		hotels: [blankHotel('')],
		transfers: [newTransfer()],
		visas: [blankVisa()],
		airline: blankAirline(),
		airlineInclude: false
	};
}

function s(meta: Record<string, unknown>, key: string): string {
	const v = meta[key];
	return v == null ? '' : String(v);
}
function n(meta: Record<string, unknown>, key: string): number {
	return Number(meta[key]) || 0;
}
function pick(value: string, list: string[]): { choice: string; custom: string } {
	return list.includes(value) && value !== 'Custom'
		? { choice: value, custom: '' }
		: { choice: 'Custom', custom: value };
}

/** Reverse-map a saved quotation (+ its lines) into the builder form. */
export function quotationToForm(q: Quotation, lines: QuotationLine[]): BuilderForm {
	const form = blankForm();
	form.roeValue = Number(q.roe);
	form.usdValue = q.usd_rate ? Number(q.usd_rate) : 0;
	form.adults = q.adults;
	form.children = q.children;
	form.infants = q.infants;
	form.ppIncludeInfants = q.pp_include_infants;
	form.label = q.label ?? '';
	form.validUntil = q.valid_until ?? '';
	form.inclusions = (q.inclusions ?? []).join('\n');
	form.exclusions = (q.exclusions ?? []).join('\n');

	// Group hotel lines by their stay index (falls back to city for old data),
	// so split-stays and return visits to the same city stay separate.
	const staySlots = new Map<string, HotelForm>();
	const stayOrder: string[] = [];
	const transfers: TransferForm[] = [];
	const visas: VisaForm[] = [];
	let airlineSet = false;
	const cur = (c: string | null | undefined): LineCurrency => (c === 'USD' ? 'USD' : 'SAR');

	for (const l of lines) {
		const meta = l.meta ?? {};
		if (l.line_type === 'hotel') {
			const city = s(meta, 'city') || 'Hotel';
			const key = meta.stay != null ? `stay${meta.stay}` : `city:${city}`;
			let slot = staySlots.get(key);
			if (!slot) {
				slot = blankHotel(city);
				slot.rooms = [];
				slot.currency = cur(l.currency);
				slot.sel = OTHER;
				slot.hotelId = s(meta, 'hotel_id');
				slot.name = s(meta, 'hotel') || l.label;
				slot.vendorId = l.vendor_id ?? '';
				slot.mealPlan = s(meta, 'meal_plan') || 'RO';
				slot.nights = n(meta, 'nights');
				slot.checkIn = s(meta, 'check_in');
				slot.checkOut = s(meta, 'check_out');
				staySlots.set(key, slot);
				stayOrder.push(key);
			}
			if (meta.kind === 'breakfast') {
				slot.breakfastMode = meta.included ? 'included' : 'separate';
				slot.breakfastCost = Number(l.unit_cost);
				slot.breakfastSell = Number(l.unit_sell);
				// Restore a manual persons override; leave 0 (auto) otherwise.
				slot.breakfastPersons = meta.persons_auto === false ? n(meta, 'persons') : 0;
				continue;
			}
			const rt = s(meta, 'room_type') || 'Double';
			const m = pick(rt, ROOM_TYPES);
			slot.rooms.push({
				rt: m.choice,
				customLabel: m.custom,
				occupancy: n(meta, 'occupancy') || 2,
				qty: n(meta, 'qty') || 1,
				cost: Number(l.unit_cost),
				sell: Number(l.unit_sell)
			});
		} else if (l.line_type === 'transfer') {
			const veh = pick(s(meta, 'vehicle_type'), VEHICLES);
			const rt = pick(s(meta, 'route') || l.label, ROUTES);
			transfers.push({
				sel: '',
				vehicle: veh.choice,
				customVehicle: veh.custom,
				route: rt.choice,
				customRoute: rt.custom,
				currency: cur(l.currency),
				vendorId: l.vendor_id ?? '',
				cost: Number(l.unit_cost),
				sell: Number(l.unit_sell),
				vehicles: l.quantity
			});
		} else if (l.line_type === 'visa') {
			const vt = s(meta, 'visa_type') || 'Umrah';
			visas.push({
				type: vt === 'Umrah' ? 'Umrah' : 'Other',
				otherLabel: vt === 'Umrah' ? '' : vt,
				currency: cur(l.currency),
				vendorId: l.vendor_id ?? '',
				cost: Number(l.unit_cost),
				sell: Number(l.unit_sell)
			});
		} else if (l.line_type === 'ticket') {
			form.airlineInclude = true;
			if (!airlineSet) {
				form.airline.name = l.label.split(' (')[0] ?? '';
				form.airline.sel = l.rate_card_id ?? OTHER;
				form.airline.route = s(meta, 'route');
				form.airline.fareClass = s(meta, 'fare_class');
				form.airline.pnr = s(meta, 'pnr');
				airlineSet = true;
			}
			const t = s(meta, 'pax_type');
			if (t === 'adult') {
				form.airline.adultCost = Number(l.unit_cost);
				form.airline.adultSell = Number(l.unit_sell);
			} else if (t === 'child') {
				form.airline.childCost = Number(l.unit_cost);
				form.airline.childSell = Number(l.unit_sell);
			} else if (t === 'infant') {
				form.airline.infantCost = Number(l.unit_cost);
				form.airline.infantSell = Number(l.unit_sell);
			}
		}
	}

	if (staySlots.size) form.hotels = stayOrder.map((k) => staySlots.get(k)!);
	form.transfers = transfers.length ? transfers : [newTransfer()];
	form.visas = visas; // empty = no visa on this quote

	return form;
}
