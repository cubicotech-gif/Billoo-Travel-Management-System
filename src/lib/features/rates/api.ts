import { supabase } from '$lib/supabase';
import type { ExchangeRate, NewRateCard, RateCard, RateCardUpdate } from './types';

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
