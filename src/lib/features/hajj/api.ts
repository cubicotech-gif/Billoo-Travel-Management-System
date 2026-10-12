import { supabase } from '$lib/supabase';
import { setQueryStatus } from '$features/queries/api';
import { snapshotToTravellers } from './snapshot';
import type {
	HajjAddon,
	HajjCatalogue,
	HajjCommissionReceipt,
	HajjDay,
	HajjPackage,
	HajjProposal,
	HajjProposalStatus,
	HajjProposalUpdate,
	HajjQuote,
	HajjQuoteUpdate,
	HajjTraveller,
	HajjTravellerAddonRow,
	HajjTravellerAddonUpdate,
	HajjTravellerRow,
	HajjTravellerUpdate,
	NewHajjCommissionReceipt,
	NewHajjProposal,
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

// --- Saved proposals (options) ------------------------------------------------

export async function listProposals(queryId: string): Promise<HajjProposal[]> {
	return unwrap(
		await supabase
			.from('hajj_proposals')
			.select('*')
			.eq('query_id', queryId)
			.order('version', { ascending: false })
	);
}

async function nextProposalVersion(queryId: string): Promise<number> {
	const { data, error } = await supabase
		.from('hajj_proposals')
		.select('version')
		.eq('query_id', queryId)
		.order('version', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data?.version ?? 0) + 1;
}

/** Save a new option; a New Query / Working query moves on to Quoted unless told not to. */
export async function createProposal(
	input: Omit<NewHajjProposal, 'version'>,
	opts: { advance: boolean; currentStatus: string }
): Promise<HajjProposal> {
	const version = await nextProposalVersion(input.query_id);
	const row = unwrap<HajjProposal>(
		await supabase
			.from('hajj_proposals')
			.insert({ ...input, version })
			.select()
			.single()
	);
	if (opts.advance && (opts.currentStatus === 'New Query' || opts.currentStatus === 'Working'))
		await setQueryStatus(input.query_id, 'Quoted');
	return row;
}

export async function updateProposal(
	id: string,
	patch: HajjProposalUpdate
): Promise<HajjProposal> {
	return unwrap<HajjProposal>(
		await supabase.from('hajj_proposals').update(patch).eq('id', id).select().single()
	);
}

export function setProposalStatus(id: string, status: HajjProposalStatus) {
	return updateProposal(id, { status });
}

/** Drafts are deleted outright; sent / accepted ones are archived (history). */
export async function removeProposal(p: Pick<HajjProposal, 'id' | 'status'>): Promise<void> {
	if (p.status === 'draft') {
		const { error } = await supabase.from('hajj_proposals').delete().eq('id', p.id);
		if (error) throw new Error(error.message);
	} else await setProposalStatus(p.id, 'archived');
}

/**
 * Replace the live working copy with a saved option: the family's travellers
 * and their add-ons are rewritten from the snapshot, plus the ROE / USD rate.
 */
export async function loadProposalIntoBuilder(p: HajjProposal): Promise<void> {
	const queryId = p.query_id;
	const quote = await getOrCreateQuote(queryId);
	const { error: delErr } = await supabase.from('hajj_travellers').delete().eq('query_id', queryId);
	if (delErr) throw new Error(delErr.message);

	const snap = snapshotToTravellers(p.snapshot, queryId);
	const idByRef = new Map<string, string>();
	for (const t of snap) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { id, addons, created_at, updated_at, mehram_traveller_id, ...fields } = t;
		const row = await createTraveller({ ...fields, mehram_traveller_id: null });
		idByRef.set(id, row.id);
		if (addons.length > 0) {
			const { error } = await supabase.from('hajj_traveller_addons').insert(
				addons.map((a) => ({
					traveller_id: row.id,
					addon_id: a.addon_id,
					qty: a.qty,
					cost_override: a.cost_override,
					sell_price: a.sell_price
				}))
			);
			if (error) throw new Error(error.message);
		}
	}
	// Mehram links point at other travellers, so they are set once all exist.
	for (const t of snap) {
		const target = t.mehram_traveller_id ? idByRef.get(t.mehram_traveller_id) : undefined;
		const mine = idByRef.get(t.id);
		if (target && mine) await updateTraveller(mine, { mehram_traveller_id: target });
	}
	await updateQuote(quote.id, { roe: Number(p.snapshot.roe), usd_rate: p.snapshot.usd_rate });
}

/** Accept an option: it becomes the working copy and the query moves to Booking. */
export async function acceptProposal(p: HajjProposal): Promise<void> {
	await loadProposalIntoBuilder(p);
	await setProposalStatus(p.id, 'accepted');
	await setQueryStatus(p.query_id, 'Booking');
}
