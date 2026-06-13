import { supabase } from '$lib/supabase';
import type { ExchangeRate, NewRateCard, RateCard, RateCardUpdate } from './types';
import type { RateObservation, RateObservationInsert, ReconcilePlan } from './observations';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

// --- Rate cards ----------------------------------------------------------

export async function listRates(): Promise<RateCard[]> {
	return unwrap(
		await supabase
			.from('rate_cards')
			.select('*')
			.order('item_type', { ascending: true })
			.order('rate_date', { ascending: false })
			.order('name', { ascending: true })
	);
}

export async function createRate(input: NewRateCard): Promise<RateCard> {
	return unwrap<RateCard>(await supabase.from('rate_cards').insert(input).select().single());
}

/** Insert many rates at once (bulk import). Returns the count inserted. */
export async function bulkCreateRates(rows: NewRateCard[]): Promise<number> {
	if (rows.length === 0) return 0;
	const { error, data } = await supabase.from('rate_cards').insert(rows).select('id');
	if (error) throw new Error(error.message);
	return data?.length ?? 0;
}

/** All live observations for a hotel — the builder's rate-intelligence panel. */
export async function listHotelObservations(hotelId: string): Promise<RateObservation[]> {
	const { data, error } = await supabase
		.from('rate_observations')
		.select('*')
		.eq('hotel_id', hotelId)
		.eq('invalidated', false)
		.order('captured_at', { ascending: false })
		.limit(300);
	if (error) throw new Error(error.message);
	return data ?? [];
}

/** Every observation — the Hotel Rates explorer loads and filters client-side. */
export async function listAllObservations(): Promise<RateObservation[]> {
	const { data, error } = await supabase
		.from('rate_observations')
		.select('*')
		.order('captured_at', { ascending: false })
		.limit(5000);
	if (error) throw new Error(error.message);
	return data ?? [];
}

export async function createObservation(input: RateObservationInsert): Promise<RateObservation> {
	const { data, error } = await supabase.from('rate_observations').insert(input).select().single();
	if (error) throw new Error(error.message);
	return data;
}

export async function updateObservation(
	id: string,
	patch: Partial<RateObservationInsert>
): Promise<RateObservation> {
	const { data, error } = await supabase
		.from('rate_observations')
		.update(patch)
		.eq('id', id)
		.select()
		.single();
	if (error) throw new Error(error.message);
	return data;
}

export async function deleteObservation(id: string): Promise<void> {
	const { error } = await supabase.from('rate_observations').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

/** Append rate observations (silent workshop capture). Returns count inserted. */
export async function insertRateObservations(rows: RateObservationInsert[]): Promise<number> {
	if (rows.length === 0) return 0;
	const { error, data } = await supabase.from('rate_observations').insert(rows).select('id');
	if (error) throw new Error(error.message);
	return data?.length ?? 0;
}

/**
 * Apply a smart-capture reconcile plan: insert new seasons, refresh+stretch the
 * bands that overlapped, and invalidate the older bands folded into a merge.
 */
export async function applyObservationPlan(plan: ReconcilePlan): Promise<void> {
	if (plan.inserts.length) {
		const { error } = await supabase.from('rate_observations').insert(plan.inserts);
		if (error) throw new Error(error.message);
	}
	for (const u of plan.updates) {
		const { error } = await supabase.from('rate_observations').update(u.patch).eq('id', u.id);
		if (error) throw new Error(error.message);
	}
	for (const inv of plan.invalidations) {
		const { error } = await supabase
			.from('rate_observations')
			.update({ invalidated: true, invalidated_reason: inv.reason })
			.eq('id', inv.id);
		if (error) throw new Error(error.message);
	}
}

export async function updateRate(id: string, patch: RateCardUpdate): Promise<RateCard> {
	return unwrap<RateCard>(
		await supabase.from('rate_cards').update(patch).eq('id', id).select().single()
	);
}

export async function deleteRate(id: string): Promise<void> {
	const { error } = await supabase.from('rate_cards').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

// --- Exchange rate (daily ROE) ------------------------------------------

/** The most recent ROE, or null if none set yet. */
export async function getLatestRoe(): Promise<ExchangeRate | null> {
	const { data, error } = await supabase
		.from('exchange_rates')
		.select('*')
		.order('rate_date', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data;
}

/** Set the ROE for a date (defaults to today), upserting on rate_date. */
export async function setRoe(sarToPkr: number, date?: string): Promise<ExchangeRate> {
	const rate_date = date ?? new Date().toISOString().slice(0, 10);
	return unwrap<ExchangeRate>(
		await supabase
			.from('exchange_rates')
			.upsert({ rate_date, sar_to_pkr: sarToPkr }, { onConflict: 'rate_date' })
			.select()
			.single()
	);
}
