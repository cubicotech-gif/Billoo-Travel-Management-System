import { financeBridge } from './bridge';
import { buildQuote, type QuoteData } from './quote';
import type { QuoteResult } from './calc';
import type {
	HajjProposal,
	HajjProposalSnapshot,
	HajjSnapshotTraveller,
	HajjTraveller,
	HajjTravellerAddonRow,
	NewHajjProposal
} from './types';

// Saved Hajj proposals. The builder edits one live working copy; "Save" freezes
// it as a labelled option. The snapshot keeps every traveller's package choice,
// add-ons and — crucially — the SELLING prices as they were, so an option still
// shows what was quoted after the working copy (or the catalogue) moves on.
// Pure functions: the DB side lives in api.ts.

/** Freeze the working copy. Add-on selling prices are written out in full. */
export function makeSnapshot(
	data: QuoteData,
	usdRate: number | null,
	result: QuoteResult = buildQuote(data)
): HajjProposalSnapshot {
	const refOf = new Map(data.travellers.map((t) => [t.id, t.id]));
	return {
		roe: data.roe,
		usd_rate: usdRate,
		travellers: data.travellers.map((t): HajjSnapshotTraveller => {
			const r = result.travellers.find((x) => x.id === t.id);
			return {
				ref: t.id,
				passenger_id: t.passenger_id,
				is_lead: t.is_lead,
				package_id: t.package_id,
				option_code: t.option_code,
				room_type: t.room_type,
				sell_price: Number(t.sell_price),
				ticket_airline: t.ticket_airline,
				ticket_cost_pkr: Number(t.ticket_cost_pkr),
				ticket_sell_pkr: Number(t.ticket_sell_pkr),
				notes: t.notes,
				sort_order: t.sort_order,
				marital_status: t.marital_status ?? null,
				blood_group: t.blood_group ?? null,
				fiqah: t.fiqah ?? null,
				performed_hajj_5y: t.performed_hajj_5y ?? null,
				hajj_e_badal: t.hajj_e_badal ?? null,
				group_worker: t.group_worker ?? null,
				is_diabetic: t.is_diabetic ?? null,
				is_smoker: t.is_smoker ?? null,
				profession: t.profession ?? null,
				mehram_ref: t.mehram_traveller_id ? (refOf.get(t.mehram_traveller_id) ?? null) : null,
				mehram_relation: t.mehram_relation ?? null,
				kin_name: t.kin_name ?? null,
				kin_phone: t.kin_phone ?? null,
				kin_cnic: t.kin_cnic ?? null,
				kin_relation: t.kin_relation ?? null,
				addons: t.addons.map((row) => ({
					addon_id: row.addon_id,
					qty: row.qty,
					cost_override: row.cost_override === null ? null : Number(row.cost_override),
					// Materialise "sell at cost" / pooled shares into a fixed price.
					sell_price: r?.addons.find((l) => l.lineId === row.id)?.sell ?? Number(row.sell_price ?? 0)
				})),
				extras: (t.extras ?? []).map((e) => ({
					label: e.label,
					currency: e.currency,
					cost: Number(e.cost),
					// Never below cost, same as in the quote.
					sell_price: r?.extras.find((x) => x.id === e.id)?.sell ?? Number(e.sell_price)
				}))
			};
		})
	};
}

/**
 * Turn a snapshot back into traveller objects that buildQuote / buildProposal
 * accept. Ids are the snapshot refs (stable, unique); add-on line ids are made up.
 */
export function snapshotToTravellers(snapshot: HajjProposalSnapshot, queryId: string): HajjTraveller[] {
	return snapshot.travellers.map((s) => {
		const { ref, mehram_ref, addons, extras, ...rest } = s;
		return {
			...rest,
			id: ref,
			query_id: queryId,
			mehram_traveller_id: mehram_ref,
			created_at: '',
			updated_at: '',
			extras: (extras ?? []).map((e, i) => ({
				id: `${ref}:extra:${i}`,
				traveller_id: ref,
				label: e.label,
				currency: e.currency,
				cost: e.cost,
				sell_price: e.sell_price,
				sort_order: i,
				created_at: '',
				updated_at: ''
			})),
			addons: addons.map(
				(a): HajjTravellerAddonRow => ({
					id: `${ref}:${a.addon_id}`,
					traveller_id: ref,
					addon_id: a.addon_id,
					qty: a.qty,
					cost_override: a.cost_override,
					sell_price: a.sell_price,
					pool_cost: null,
					pool_sharers: null,
					pool_vehicle: null,
					created_at: '',
					updated_at: ''
				})
			)
		};
	});
}

/** Price a saved proposal against the live catalogue (costs) with its frozen selling prices. */
export function quoteFromSnapshot(
	p: Pick<HajjProposal, 'snapshot' | 'query_id'>,
	catalogue: Omit<QuoteData, 'travellers' | 'roe'>
): QuoteResult {
	return buildQuote({
		...catalogue,
		roe: Number(p.snapshot.roe),
		travellers: snapshotToTravellers(p.snapshot, p.query_id)
	});
}

/** The row to insert for a new saved proposal (the version is assigned on save). */
export function proposalRow(
	queryId: string,
	data: QuoteData,
	usdRate: number | null,
	extra: { label?: string | null; validUntil?: string | null; whatsappText?: string | null } = {}
): Omit<NewHajjProposal, 'version'> {
	const result = buildQuote(data);
	const bridge = financeBridge(result, usdRate);
	return {
		query_id: queryId,
		label: extra.label?.trim() || null,
		roe: data.roe,
		usd_rate: usdRate,
		snapshot: makeSnapshot(data, usdRate, result),
		traveller_count: data.travellers.length,
		total_sell_pkr: result.pkr.sell,
		total_sell_usd: result.usd?.sell ?? null,
		profit_pkr: bridge.profitPkr,
		valid_until: extra.validUntil || null,
		whatsapp_text: extra.whatsappText ?? null
	};
}

/** Options shown to the client by default: everything still in play. */
export function isLive(p: Pick<HajjProposal, 'status'>): boolean {
	return p.status !== 'archived' && p.status !== 'rejected';
}

/** Short heading for an option: its label, else "Option N". */
export function optionTitle(p: Pick<HajjProposal, 'label' | 'version'>): string {
	return p.label?.trim() || `Option ${p.version}`;
}
