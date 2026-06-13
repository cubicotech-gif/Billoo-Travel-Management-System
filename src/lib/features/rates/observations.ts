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
	now?: string; // ISO timestamp to stamp merged rows fresh; omit to keep DB value
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

// --- Smart capture: merge overlapping windows instead of always appending ----
//
// Old behaviour appended a fresh row on every save, so one hotel grew to 8–10
// near-identical lines. Instead we now reconcile each captured room line against
// the hotel's live observations for the same vendor + room + occupancy + meal:
//   • dates overlap an existing band  → update its price and STRETCH the window
//     to cover the new range (e.g. a 17 Jun start widens a 20 Jun band back).
//   • dates are wholly separate        → keep a new band (a new season line).
// Pure & unit tested; the I/O wrapper is api.applyObservationPlan.

export interface ReconcilePlan {
	inserts: RateObservationInsert[];
	updates: { id: string; patch: Partial<RateObservationInsert> }[];
	invalidations: { id: string; reason: string }[];
}

interface Capture {
	hotelId: string;
	vendorId: string | null;
	roomType: ObsRoomType;
	occupancy: number | null;
	mealPlan: MealPlan;
	checkIn: string;
	checkOut: string;
	rate: number;
}

// A logical rate line is one hotel + vendor + room + occupancy + meal. Its date
// bands (seasons) live under that key; price is a property we update, not a key.
const captureKey = (c: Capture) =>
	`${c.hotelId}|${c.vendorId ?? ''}|${c.roomType}|${c.occupancy ?? ''}|${c.mealPlan}`;
const obsKey = (o: RateObservation) =>
	`${o.hotel_id}|${o.vendor_id ?? ''}|${o.room_type ?? ''}|${o.occupancy ?? ''}|${o.meal_plan}`;

// Inclusive overlap on ISO yyyy-mm-dd (lexical compare is chronological).
const overlaps = (aIn: string, aOut: string, bIn: string, bOut: string) => aIn <= bOut && bIn <= aOut;
const minDate = (a: string, b: string) => (a <= b ? a : b);
const maxDate = (a: string, b: string) => (a >= b ? a : b);

function staysToCaptures(stays: ObsStay[]): Capture[] {
	const out: Capture[] = [];
	for (const s of stays) {
		if (!s.hotelId || !s.checkIn || !s.checkOut || s.nights <= 0) continue;
		for (const r of s.rooms) {
			if (!(r.cost > 0)) continue;
			out.push({
				hotelId: s.hotelId,
				vendorId: s.vendorId || null,
				roomType: r.roomType,
				occupancy: r.occupancy || null,
				mealPlan: asMealPlan(s.mealPlan),
				checkIn: s.checkIn,
				checkOut: s.checkOut,
				rate: r.cost
			});
		}
	}
	return out;
}

// Fold captures from a single save into non-overlapping bands per key first, so
// two stays touching the same room/season don't each spawn a row.
function mergeCaptures(caps: Capture[]): Capture[] {
	const byKey = new Map<string, Capture[]>();
	for (const c of caps) {
		const list = byKey.get(captureKey(c));
		if (list) list.push(c);
		else byKey.set(captureKey(c), [c]);
	}
	const out: Capture[] = [];
	for (const list of byKey.values()) {
		list.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
		let cur: Capture | null = null;
		for (const c of list) {
			if (cur && overlaps(cur.checkIn, cur.checkOut, c.checkIn, c.checkOut)) {
				cur.checkIn = minDate(cur.checkIn, c.checkIn);
				cur.checkOut = maxDate(cur.checkOut, c.checkOut);
				cur.rate = c.rate; // later-starting capture wins on price
			} else {
				cur = { ...c };
				out.push(cur);
			}
		}
	}
	return out;
}

function insertFromCapture(cap: Capture, ctx: ObsContext): RateObservationInsert {
	return {
		hotel_id: cap.hotelId,
		room_type: cap.roomType,
		occupancy: cap.occupancy,
		vendor_id: cap.vendorId,
		check_in: cap.checkIn,
		check_out: cap.checkOut,
		rate: cap.rate,
		currency: 'SAR',
		meal_plan: cap.mealPlan,
		source: 'workshop_capture',
		quotation_id: ctx.quotationId,
		query_id: ctx.queryId || null,
		captured_by: ctx.capturedBy
	};
}

/**
 * Reconcile a save's captured stays against the hotel's existing observations,
 * producing a plan of inserts (new seasons), updates (price refresh + window
 * stretch on overlap), and invalidations (older bands folded into the merge).
 */
export function reconcileObservations(
	existing: RateObservation[],
	stays: ObsStay[],
	ctx: ObsContext
): ReconcilePlan {
	const plan: ReconcilePlan = { inserts: [], updates: [], invalidations: [] };

	const liveByKey = new Map<string, RateObservation[]>();
	for (const o of existing) {
		if (o.invalidated || !o.check_in || !o.check_out) continue;
		const list = liveByKey.get(obsKey(o));
		if (list) list.push(o);
		else liveByKey.set(obsKey(o), [o]);
	}

	for (const cap of mergeCaptures(staysToCaptures(stays))) {
		const key = captureKey(cap);
		const candidates = liveByKey.get(key) ?? [];
		const hit = candidates.filter((o) =>
			overlaps(o.check_in as string, o.check_out as string, cap.checkIn, cap.checkOut)
		);
		if (hit.length === 0) {
			plan.inserts.push(insertFromCapture(cap, ctx));
			continue;
		}
		// Stretch to cover every overlapping band plus the new range.
		let lo = cap.checkIn;
		let hi = cap.checkOut;
		for (const o of hit) {
			lo = minDate(lo, o.check_in as string);
			hi = maxDate(hi, o.check_out as string);
		}
		// Keep the most recently captured band; refresh it, fold the rest in.
		const target = hit.reduce((a, b) => (a.captured_at >= b.captured_at ? a : b));
		plan.updates.push({
			id: target.id,
			patch: {
				check_in: lo,
				check_out: hi,
				rate: cap.rate,
				meal_plan: cap.mealPlan,
				source: 'workshop_capture',
				quotation_id: ctx.quotationId,
				query_id: ctx.queryId || null,
				captured_by: ctx.capturedBy,
				...(ctx.now ? { captured_at: ctx.now } : {})
			}
		});
		for (const o of hit) {
			if (o.id !== target.id) plan.invalidations.push({ id: o.id, reason: 'merged' });
		}
		// Drop consumed bands so a later capture this batch can't re-merge them.
		liveByKey.set(
			key,
			candidates.filter((o) => !hit.includes(o))
		);
	}
	return plan;
}

// --- Read side: latest captured cost per room, to prefill the quote builder -

export interface HotelRoomRate {
	roomType: ObsRoomType | null;
	occupancy: number | null;
	cost: number; // SAR vendor cost
	vendorId: string | null;
	mealPlan: string;
	capturedAt: string;
}

/**
 * Latest live observation per (room type, occupancy) for one hotel. Drives the
 * builder's hotel auto-fill now that hotel costs live as observations, not rate
 * cards. Only vendor cost is captured — selling price stays a margin decision.
 * Pure & unit tested.
 */
export function latestHotelRoomRates(obs: RateObservation[], hotelId: string): HotelRoomRate[] {
	if (!hotelId) return [];
	const byKey = new Map<string, RateObservation>();
	for (const o of obs) {
		if (o.hotel_id !== hotelId || o.invalidated) continue;
		const key = `${o.room_type ?? ''}|${o.occupancy ?? ''}`;
		const ex = byKey.get(key);
		if (!ex || o.captured_at > ex.captured_at) byKey.set(key, o);
	}
	return [...byKey.values()]
		.map((o) => ({
			roomType: o.room_type as ObsRoomType | null,
			occupancy: o.occupancy,
			cost: Number(o.rate),
			vendorId: o.vendor_id,
			mealPlan: o.meal_plan,
			capturedAt: o.captured_at
		}))
		.sort((a, b) => (a.occupancy ?? 0) - (b.occupancy ?? 0));
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
	vendorId: string | null;
	rows: ObsRateRow[];
}

// One-click prefill payload: a saved rate the builder drops into the open stay.
export interface RatePick {
	roomType: string | null;
	occupancy: number | null;
	mealPlan: string;
	cost: number;
	vendorId: string | null;
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

	const groups = new Map<string, { vendorId: string | null; rows: ObsRateRow[] }>();
	for (const o of byKey.values()) {
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
		const gkey = o.vendor_id ?? '';
		const grp = groups.get(gkey);
		if (grp) grp.rows.push(row);
		else groups.set(gkey, { vendorId: o.vendor_id, rows: [row] });
	}

	const out: VendorRateGroup[] = [];
	for (const { vendorId, rows } of groups.values()) {
		rows.sort(
			(a, b) =>
				(ROOM_ORDER[a.roomType ?? ''] ?? 9) - (ROOM_ORDER[b.roomType ?? ''] ?? 9) ||
				(MEAL_ORDER[a.mealPlan] ?? 9) - (MEAL_ORDER[b.mealPlan] ?? 9) ||
				(a.validFrom ?? '').localeCompare(b.validFrom ?? '')
		);
		out.push({ vendor: vendorName(vendorId), vendorId, rows });
	}
	out.sort((a, b) => a.vendor.localeCompare(b.vendor));
	return out;
}
