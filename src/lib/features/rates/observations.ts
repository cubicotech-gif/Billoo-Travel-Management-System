import type { Database, MealPlan, ObsRoomType } from '$lib/database.types';

// Silent rate capture. On quotation save, each *complete* hotel room line
// (canonical hotel + room type + dates + cost) becomes an append-only
// rate_observation. Pure builder — no I/O — so it can be unit tested. A re-save
// with a changed rate just produces new rows; nothing is ever updated.

export type RateObservationInsert = Database['public']['Tables']['rate_observations']['Insert'];

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
