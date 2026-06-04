import { supabase } from '$lib/supabase';
import { updateQuery } from '$features/queries/api';
import type { PaxCounts, QuotationResult } from './calculator';
import type { Quotation, QuotationLine } from './types';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export async function listQuotations(queryId: string): Promise<Quotation[]> {
	return unwrap(
		await supabase
			.from('quotations')
			.select('*')
			.eq('query_id', queryId)
			.order('version', { ascending: false })
	);
}

export async function getQuotationLines(quotationId: string): Promise<QuotationLine[]> {
	return unwrap(
		await supabase
			.from('quotation_lines')
			.select('*')
			.eq('quotation_id', quotationId)
			.order('created_at', { ascending: true })
	);
}

export async function getQuotation(id: string): Promise<Quotation> {
	return unwrap(await supabase.from('quotations').select('*').eq('id', id).single());
}

async function nextVersion(queryId: string): Promise<number> {
	const { data, error } = await supabase
		.from('quotations')
		.select('version')
		.eq('query_id', queryId)
		.order('version', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data?.version ?? 0) + 1;
}

export interface SaveQuotationArgs {
	queryId: string;
	roe: number;
	pax: PaxCounts;
	result: QuotationResult;
	whatsappText: string;
	label?: string | null;
	perPersonPkr?: number;
	ppIncludeInfants?: boolean;
	validUntil?: string | null;
	inclusions?: string[];
	exclusions?: string[];
}

/** Persist a calculated quotation as a new version, with its line breakdown. */
export async function createQuotation(args: SaveQuotationArgs): Promise<Quotation> {
	const version = await nextVersion(args.queryId);
	const quotation = unwrap<Quotation>(
		await supabase
			.from('quotations')
			.insert({
				query_id: args.queryId,
				version,
				roe: args.roe,
				adults: args.pax.adults,
				children: args.pax.children,
				infants: args.pax.infants,
				sar_cost: args.result.sarCost,
				sar_sell: args.result.sarSell,
				tickets_cost_pkr: args.result.ticketsCostPkr,
				tickets_sell_pkr: args.result.ticketsSellPkr,
				total_cost_pkr: args.result.totalCostPkr,
				total_sell_pkr: args.result.totalSellPkr,
				profit_pkr: args.result.profitPkr,
				per_person_pkr: args.perPersonPkr ?? 0,
				pp_include_infants: args.ppIncludeInfants ?? false,
				label: args.label ?? null,
				valid_until: args.validUntil ?? null,
				inclusions: args.inclusions ?? [],
				exclusions: args.exclusions ?? [],
				whatsapp_text: args.whatsappText
			})
			.select()
			.single()
	);

	if (args.result.lines.length > 0) {
		const rows = args.result.lines.map((l) => ({
			quotation_id: quotation.id,
			line_type: l.line_type,
			label: l.label,
			rate_card_id: l.rateCardId,
			vendor_id: l.vendorId,
			currency: l.currency,
			unit_cost: l.unitCost,
			unit_sell: l.unitSell,
			quantity: l.quantity,
			line_cost: l.lineCost,
			line_sell: l.lineSell,
			meta: l.meta
		}));
		const { error } = await supabase.from('quotation_lines').insert(rows);
		if (error) throw new Error(error.message);
	}

	return quotation;
}

export async function setQuotationStatus(
	id: string,
	status: Quotation['status']
): Promise<Quotation> {
	return unwrap<Quotation>(
		await supabase.from('quotations').update({ status }).eq('id', id).select().single()
	);
}

/** Edit a saved quotation's message text and/or label. */
export async function updateQuotation(
	id: string,
	patch: { whatsapp_text?: string; label?: string | null }
): Promise<Quotation> {
	return unwrap<Quotation>(
		await supabase.from('quotations').update(patch).eq('id', id).select().single()
	);
}

/**
 * Accept a quotation: mark it accepted and copy its PKR totals onto the query
 * so the booking auto-populates and dashboard figures reflect the deal.
 */
export async function acceptQuotation(quotation: Quotation): Promise<void> {
	await setQuotationStatus(quotation.id, 'accepted');
	// Accepting a tier moves the query into the Booking stage and copies its
	// totals onto the query (so the booking auto-populates).
	await updateQuery(quotation.query_id, {
		cost_price: quotation.total_cost_pkr,
		selling_price: quotation.total_sell_pkr,
		status: 'Booking',
		stage_changed_at: new Date().toISOString()
	});
}

/** Drafts hard-delete; sent/accepted ones archive (history integrity). */
export async function removeQuotation(quotation: Quotation): Promise<void> {
	if (quotation.status === 'draft') {
		const { error } = await supabase.from('quotations').delete().eq('id', quotation.id);
		if (error) throw new Error(error.message);
	} else {
		await setQuotationStatus(quotation.id, 'archived');
	}
}
