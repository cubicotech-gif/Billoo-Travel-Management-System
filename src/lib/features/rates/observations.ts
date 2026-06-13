import type { Database, MealPlan, ObsRoomType } from '$lib/database.types';

// Silent rate capture. On quotation save, each *complete* hotel room line
// (canonical hotel + room type + dates + cost) becomes an append-only
// rate_observation. Pure builder — no I/O — so it can be unit tested. A re-save
// with a changed rate just produces new rows; nothing is ever updated.

export type RateObservationInsert = Database['public']['Tables']['rate_observations']['Insert'];
export type RateObservation = Database['public']['Tables']['rate_observations']['Row'];

export interface ObsRoom {
	roomType: ObsRoomType;
	occupancy: number;
	cost: number; // SAR cost_price — what the vendor charges us
}
export interface ObsStay {
	hotelId: string;
	vendorId: string;
	checkIn: string;
	checkOut: string;
	nights: number;
	mealPlan: string;
	rooms: ObsRoom[];
}
export interface ObsContext {
	quotationId: string;
	queryId: string;
	capturedBy: string | null;
}

const MEAL_PLANS: MealPlan[] = ['RO', 'BB', 'HB', 'FB'];
const asMealPlan = (m: string): MealPlan => (MEAL_PLANS.includes(m as MealPlan) ? (m as MealPlan) : 'RO');

/**
 * Build workshop-capture observations from the builder's stays. Only complete
 * lines are captured: a canonical hotel, dates, positive nights, and a room
 * with a positive cost.
 */
export function buildObservations(stays: ObsStay[], ctx: ObsContext): RateObservationInsert[] {
	const out: RateObservationInsert[] = [];
	for (const s of stays) {
		if (!s.hotelId || !s.checkIn || !s.checkOut || s.nights <= 0) continue;
		for (const r of s.rooms) {
			if (!(r.cost > 0)) continue;
			out.push({
				hotel_id: s.hotelId,
				room_type: r.roomType,
				occupancy: r.occupancy || null,
				vendor_id: s.vendorId || null,
				check_in: s.checkIn,
				check_out: s.checkOut,
				rate: r.cost,
				currency: 'SAR',
				meal_plan: asMealPlan(s.mealPlan),
				source: 'workshop_capture',
				quotation_id: ctx.quotationId,
				query_id: ctx.queryId || null,
				captured_by: ctx.capturedBy
			});
		}
	}
	return out;
}

// --- Read side: group a hotel's observations for the builder rate panel -----

const ROOM_ORDER: Record<string, number> = { double: 0, triple: 1, quad: 2, sharing: 3, custom: 4 };
const MEAL_ORDER: Record<string, number> = { RO: 0, BB: 1, HB: 2, FB: 3 };

export interface ObsRateRow {
	roomType: string | null;
	occupancy: number | null;
	mealPlan: string;
	rate: number;
	validFrom: string | null;
	validTo: string | null;
	needsVerify: boolean;
	capturedAt: string;
	source: string;
}
export interface VendorRateGroup {
	vendor: string;
	rows: ObsRateRow[];
}

/**
 * Group a hotel's observations by vendor → sorted rate rows. De-dupes identical
 * (vendor, room, meal, dates, rate) entries keeping the most recent capture, and
 * flags rows whose notes were marked "VERIFY:". Pure & unit tested.
 */
export function groupHotelObservations(
	obs: RateObservation[],
	vendorName: (id: string | null) => string
): VendorRateGroup[] {
	const byKey = new Map<string, RateObservation>();
	for (const o of obs) {
		if (o.invalidated) continue;
		const key = `${o.vendor_id ?? ''}|${o.room_type ?? ''}|${o.meal_plan}|${o.check_in ?? ''}|${o.check_out ?? ''}|${o.rate}`;
		const ex = byKey.get(key);
		if (!ex || o.captured_at > ex.captured_at) byKey.set(key, o);
	}

	const groups = new Map<string, ObsRateRow[]>();
	for (const o of byKey.values()) {
		const vendor = vendorName(o.vendor_id);
		const row: ObsRateRow = {
			roomType: o.room_type,
			occupancy: o.occupancy,
			mealPlan: o.meal_plan,
			rate: Number(o.rate),
			validFrom: o.check_in,
			validTo: o.check_out,
			needsVerify: (o.notes ?? '').startsWith('VERIFY:'),
			capturedAt: o.captured_at,
			source: o.source
		};
		const list = groups.get(vendor);
		if (list) list.push(row);
		else groups.set(vendor, [row]);
	}

	const out: VendorRateGroup[] = [];
	for (const [vendor, rows] of groups) {
		rows.sort(
			(a, b) =>
				(ROOM_ORDER[a.roomType ?? ''] ?? 9) - (ROOM_ORDER[b.roomType ?? ''] ?? 9) ||
				(MEAL_ORDER[a.mealPlan] ?? 9) - (MEAL_ORDER[b.mealPlan] ?? 9) ||
				(a.validFrom ?? '').localeCompare(b.validFrom ?? '')
		);
		out.push({ vendor, rows });
	}
	out.sort((a, b) => a.vendor.localeCompare(b.vendor));
	return out;
}
