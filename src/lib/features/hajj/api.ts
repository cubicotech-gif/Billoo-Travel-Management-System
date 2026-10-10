import { supabase } from '$lib/supabase';
import type {
	HajjAddon,
	HajjCatalogue,
	HajjCommissionReceipt,
	HajjDay,
	HajjPackage,
	HajjQuote,
	HajjQuoteUpdate,
	HajjTraveller,
	HajjTravellerAddonRow,
	HajjTravellerAddonUpdate,
	HajjTravellerRow,
	HajjTravellerUpdate,
	NewHajjCommissionReceipt,
	NewHajjTraveller,
	NewHajjTravellerAddon
} from './types';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

// --- Catalogue (read-only here; loaded from the vendor price lists) --------

export async function listCatalogues(): Promise<HajjCatalogue[]> {
	return unwrap(
		await supabase
			.from('hajj_catalogues')
			.select('*')
			.eq('is_active', true)
			.order('currency', { ascending: false }) // USD before SAR
	);
}

/** Every active package with its hotel options and per-room prices. */
export async function listPackages(): Promise<HajjPackage[]> {
	const rows = unwrap(
		await supabase
			.from('hajj_packages')
			.select('*, options:hajj_package_options(*, prices:hajj_package_prices(*))')
			.eq('is_active', true)
			.order('sort_order', { ascending: true })
	);
	return rows as unknown as HajjPackage[];
}

export async function listPackageDays(packageId: string): Promise<HajjDay[]> {
	return unwrap(
		await supabase
			.from('hajj_package_days')
			.select('*')
			.eq('package_id', packageId)
			.order('day_no', { ascending: true })
	);
}

/** Every active add-on with its room-dependent prices. */
export async function listAddons(): Promise<HajjAddon[]> {
	const rows = unwrap(
		await supabase
			.from('hajj_addons')
			.select('*, room_prices:hajj_addon_room_prices(*)')
			.eq('is_active', true)
			.order('sort_order', { ascending: true })
	);
	return rows as unknown as HajjAddon[];
}

// --- The family's quote ----------------------------------------------------

/** The query's Hajj quote (ROE + notes); created on first open. */
export async function getOrCreateQuote(queryId: string): Promise<HajjQuote> {
	const existing = await supabase
		.from('hajj_quotes')
		.select('*')
		.eq('query_id', queryId)
		.maybeSingle();
	if (existing.error) throw new Error(existing.error.message);
	if (existing.data) return existing.data;
	return unwrap<HajjQuote>(
		await supabase.from('hajj_quotes').insert({ query_id: queryId }).select().single()
	);
}

export async function updateQuote(id: string, patch: HajjQuoteUpdate): Promise<HajjQuote> {
	return unwrap<HajjQuote>(
		await supabase.from('hajj_quotes').update(patch).eq('id', id).select().single()
	);
}

// --- Travellers ------------------------------------------------------------

export async function listTravellers(queryId: string): Promise<HajjTraveller[]> {
	const rows = unwrap(
		await supabase
			.from('hajj_travellers')
			.select('*, addons:hajj_traveller_addons(*)')
			.eq('query_id', queryId)
			.order('sort_order', { ascending: true })
			.order('created_at', { ascending: true })
	);
	return rows as unknown as HajjTraveller[];
}

export async function createTraveller(input: NewHajjTraveller): Promise<HajjTravellerRow> {
	return unwrap<HajjTravellerRow>(
		await supabase.from('hajj_travellers').insert(input).select().single()
	);
}

export async function updateTraveller(
	id: string,
	patch: HajjTravellerUpdate
): Promise<HajjTravellerRow> {
	return unwrap<HajjTravellerRow>(
		await supabase.from('hajj_travellers').update(patch).eq('id', id).select().single()
	);
}

export async function deleteTraveller(id: string): Promise<void> {
	const { error } = await supabase.from('hajj_travellers').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

// --- Traveller add-ons -----------------------------------------------------

/** Add an add-on to a traveller, or update it if they already have it. */
export async function upsertTravellerAddon(
	input: NewHajjTravellerAddon
): Promise<HajjTravellerAddonRow> {
	return unwrap<HajjTravellerAddonRow>(
		await supabase
			.from('hajj_traveller_addons')
			.upsert(input, { onConflict: 'traveller_id,addon_id' })
			.select()
			.single()
	);
}

export async function updateTravellerAddon(
	id: string,
	patch: HajjTravellerAddonUpdate
): Promise<HajjTravellerAddonRow> {
	return unwrap<HajjTravellerAddonRow>(
		await supabase.from('hajj_traveller_addons').update(patch).eq('id', id).select().single()
	);
}

export async function deleteTravellerAddon(id: string): Promise<void> {
	const { error } = await supabase.from('hajj_traveller_addons').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

// --- Booking bridge / settlement reads & writes ------------------------------

/** The query's Hajj quote, or null when it has none yet (read-only; never creates). */
export async function getQuoteRow(queryId: string): Promise<HajjQuote | null> {
	const { data, error } = await supabase
		.from('hajj_quotes')
		.select('*')
		.eq('query_id', queryId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data;
}

/** Every traveller-add-on row that takes one of the given (pooled) add-ons. */
export async function listAddonLines(addonIds: string[]): Promise<HajjTravellerAddonRow[]> {
	if (addonIds.length === 0) return [];
	return unwrap(await supabase.from('hajj_traveller_addons').select('*').in('addon_id', addonIds));
}

export async function listTravellerRefs(
	ids: string[]
): Promise<{ id: string; query_id: string; passenger_id: string }[]> {
	if (ids.length === 0) return [];
	return unwrap(
		await supabase.from('hajj_travellers').select('id, query_id, passenger_id').in('id', ids)
	);
}

export interface QueryRef {
	id: string;
	query_number: string;
	client_name: string;
	status: string;
	stage_changed_at: string | null;
	created_at: string;
	is_deleted: boolean;
}

export async function listQueryRefs(ids: string[]): Promise<QueryRef[]> {
	if (ids.length === 0) return [];
	return unwrap(
		await supabase
			.from('queries')
			.select('id, query_number, client_name, status, stage_changed_at, created_at, is_deleted')
			.in('id', ids)
	);
}

export async function setLinePool(
	lineId: string,
	pool: { pool_cost: number | null; pool_sharers: number | null; pool_vehicle: string | null }
): Promise<void> {
	const { error } = await supabase.from('hajj_traveller_addons').update(pool).eq('id', lineId);
	if (error) throw new Error(error.message);
}

/** Every Hajj traveller (id, query, package) — for commission and pool reports. */
export async function listAllTravellerRefs(): Promise<
	{ id: string; query_id: string; package_id: string }[]
> {
	return unwrap(await supabase.from('hajj_travellers').select('id, query_id, package_id'));
}

// --- Package commission ------------------------------------------------------

export async function setPackageCommission(
	packageId: string,
	commission: number | null
): Promise<void> {
	const { error } = await supabase
		.from('hajj_packages')
		.update({ commission_per_person: commission })
		.eq('id', packageId);
	if (error) throw new Error(error.message);
}

// --- Commission receipts -----------------------------------------------------

export async function listCommissionReceipts(): Promise<HajjCommissionReceipt[]> {
	return unwrap(
		await supabase
			.from('hajj_commission_receipts')
			.select('*')
			.order('received_date', { ascending: false })
			.order('created_at', { ascending: false })
	);
}

export async function addCommissionReceipt(
	input: NewHajjCommissionReceipt
): Promise<HajjCommissionReceipt> {
	return unwrap<HajjCommissionReceipt>(
		await supabase.from('hajj_commission_receipts').insert(input).select().single()
	);
}

export async function deleteCommissionReceipt(id: string): Promise<void> {
	const { error } = await supabase.from('hajj_commission_receipts').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

/** GMC lines that have been settled into a vehicle. */
export async function listSettledPoolLines(): Promise<HajjTravellerAddonRow[]> {
	return unwrap(
		await supabase.from('hajj_traveller_addons').select('*').not('pool_vehicle', 'is', null)
	);
}
