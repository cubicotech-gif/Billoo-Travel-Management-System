import type { Quotation, QuotationLine } from './types';

// Form model for the quote builder, shared with the edit-mapping below so a
// saved quotation can be reopened. Kept in sync with QuoteBuilder.svelte.

export const OTHER = '__other__';
export const ROOM_TYPES = ['Double', 'Triple', 'Quad', 'Quint', 'Custom'];
export const OCCUPANCY: Record<string, number> = { Double: 2, Triple: 3, Quad: 4, Quint: 5 };
export const VEHICLES = ['4-seater', '7-seater', '14-seater', '50-seater', 'Custom'];
export const ROUTES = [
	'Airport → Makkah',
	'Makkah → Madinah',
	'Madinah → Makkah',
	'Madinah → Airport',
	'Makkah → Airport',
	'Airport → Madinah',
	'Custom'
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
export interface HotelForm {
	id: string;
	city: string;
	sel: string; // '' | OTHER | a saved hotel name
	name: string;
	vendorId: string;
	checkIn: string;
	checkOut: string;
	nights: number;
	rooms: RoomRow[];
	breakfast: boolean;
	breakfastCost: number;
	breakfastSell: number;
}
export interface TransferForm {
	sel: string; // '' (custom) | a saved transfer rate id
	vehicle: string;
	customVehicle: string;
	route: string;
	customRoute: string;
	vendorId: string;
	cost: number;
	sell: number;
	vehicles: number;
}
export interface VisaForm {
	type: string;
	otherLabel: string;
	vendorId: string;
	cost: number;
	sell: number;
	include: boolean;
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
	visa: VisaForm;
	airline: AirlineForm;
	airlineInclude: boolean;
}

export const newRoom = (): RoomRow => ({ rt: 'Double', customLabel: '', occupancy: 2, qty: 1, cost: 0, sell: 0 });
export const blankHotel = (city = ''): HotelForm => ({ id: uid(), city, sel: '', name: '', vendorId: '', checkIn: '', checkOut: '', nights: 0, rooms: [newRoom()], breakfast: false, breakfastCost: 0, breakfastSell: 0 });
export const newTransfer = (): TransferForm => ({ sel: '', vehicle: '7-seater', customVehicle: '', route: 'Airport → Makkah', customRoute: '', vendorId: '', cost: 0, sell: 0, vehicles: 1 });
export const blankVisa = (): VisaForm => ({ type: 'Umrah', otherLabel: '', vendorId: '', cost: 0, sell: 0, include: true });
export const blankAirline = (): AirlineForm => ({ sel: '', name: '', route: '', fareClass: '', pnr: '', adultCost: 0, adultSell: 0, childCost: 0, childSell: 0, infantCost: 0, infantSell: 0 });

export function blankForm(): BuilderForm {
	return {
		roeValue: 0,
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
		visa: blankVisa(),
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
	let visaSet = false;
	let airlineSet = false;

	form.visa.include = false; // only enable if a visa line exists

	for (const l of lines) {
		const meta = l.meta ?? {};
		if (l.line_type === 'hotel') {
			const city = s(meta, 'city') || 'Hotel';
			const key = meta.stay != null ? `stay${meta.stay}` : `city:${city}`;
			let slot = staySlots.get(key);
			if (!slot) {
				slot = blankHotel(city);
				slot.rooms = [];
				slot.sel = OTHER;
				slot.name = s(meta, 'hotel') || l.label;
				slot.vendorId = l.vendor_id ?? '';
				slot.nights = n(meta, 'nights');
				slot.checkIn = s(meta, 'check_in');
				slot.checkOut = s(meta, 'check_out');
				staySlots.set(key, slot);
				stayOrder.push(key);
			}
			if (meta.kind === 'breakfast') {
				slot.breakfast = true;
				slot.breakfastCost = Number(l.unit_cost);
				slot.breakfastSell = Number(l.unit_sell);
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
				vendorId: l.vendor_id ?? '',
				cost: Number(l.unit_cost),
				sell: Number(l.unit_sell),
				vehicles: l.quantity
			});
		} else if (l.line_type === 'visa') {
			const vt = s(meta, 'visa_type') || 'Umrah';
			form.visa = {
				include: true,
				type: vt === 'Umrah' ? 'Umrah' : 'Other',
				otherLabel: vt === 'Umrah' ? '' : vt,
				vendorId: l.vendor_id ?? '',
				cost: Number(l.unit_cost),
				sell: Number(l.unit_sell)
			};
			visaSet = true;
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
	if (!visaSet) form.visa.include = false;

	return form;
}
