<script lang="ts">
	import { ArrowLeft, Printer } from 'lucide-svelte';
	import { Button } from '$ui';
	import { formatAmount, toNumber } from '$lib/money';
	import type { Currency, QuotationLineType } from '$lib/database.types';
	import { getQuery } from '$features/queries/api';
	import { getBookingForQuery, listBookingItems } from '$features/bookings/api';
	import { ratesOf, toPkr, type Rates } from '$features/bookings/totals';
	import { listQuotations, getQuotationLines, getQuotation } from '$features/quotations/api';
	import type { Query } from '$features/queries/types';

	// Client-facing invoice for the booking: the final agreed selling prices,
	// every service converted to PKR through the booking's rates. Reads the live
	// booking items (falls back to the accepted quotation) so it always reflects
	// the latest edits — change a service amount and reprint, it follows.
	let { queryId }: { queryId: string } = $props();

	interface Row {
		lineType: QuotationLineType;
		label: string;
		currency: Currency;
		amountPkr: number;
		booked: boolean;
	}

	let query = $state<Query | null>(null);
	let rows = $state<Row[]>([]);
	let totalPkr = $state(0);
	let invoiceNo = $state('');
	// Pax from the quotation/booking being invoiced, not the (possibly stale)
	// query intake — the booking stage can change the counts.
	let paxCounts = $state({ adults: 0, children: 0, infants: 0 });
	let loaded = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (loaded) return;
		loaded = true;
		(async () => {
			try {
				query = await getQuery(queryId);
				const booking = await getBookingForQuery(queryId);
				const items = booking ? await listBookingItems(booking.id) : [];
				let source = null;
				if (booking && items.length > 0) {
					const rates: Rates = ratesOf(booking);
					rows = items.map((i) => ({
						lineType: i.line_type,
						label: i.label,
						currency: i.currency,
						amountPkr: toNumber(toPkr(Number(i.actual_sell), i.currency, rates)),
						booked: (i.meta as Record<string, unknown>)?.booked === true
					}));
					totalPkr = Number(booking.actual_sell_pkr);
					invoiceNo = `INV-${query?.query_number ?? booking.id.slice(0, 8)}`;
					source = booking.quotation_id ? await getQuotation(booking.quotation_id) : null;
				} else {
					const quotes = await listQuotations(queryId);
					const accepted = quotes.find((q) => q.status === 'accepted') ?? quotes[0];
					if (accepted) {
						const rates: Rates = { roe: Number(accepted.roe) || 0, usdRate: Number(accepted.usd_rate ?? 0) || Number(accepted.roe) || 0 };
						const lines = await getQuotationLines(accepted.id);
						rows = lines.map((l) => ({
							lineType: l.line_type,
							label: l.label,
							currency: l.currency,
							amountPkr: toNumber(toPkr(Number(l.line_sell), l.currency, rates)),
							booked: (l.meta as Record<string, unknown>)?.booked === true
						}));
						totalPkr = Number(accepted.total_sell_pkr);
						invoiceNo = `INV-${query?.query_number ?? accepted.id.slice(0, 8)}`;
						source = accepted;
					}
				}
				paxCounts = source
					? { adults: source.adults, children: source.children, infants: source.infants }
					: { adults: query.adults, children: query.children, infants: query.infants };
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to load';
			}
		})();
	});

	const today = new Date().toLocaleDateString();
</script>

<div class="no-print mb-4 flex items-center justify-between">
	<a href="/queries/{queryId}" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
		<ArrowLeft class="h-4 w-4" /> Back to query
	</a>
	<Button onclick={() => window.print()}><Printer class="h-4 w-4" /> Print / Save PDF</Button>
</div>

{#if error}
	<p class="text-red-600">{error}</p>
{:else if !query}
	<p class="text-slate-400">Loading…</p>
{:else}
	<div class="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8">
		<div class="mb-6 flex items-start justify-between border-b border-slate-200 pb-4">
			<div>
				<div class="text-xl font-bold text-brand-700">Billoo Travel</div>
				<div class="text-xs text-slate-400">Umrah & Travel Services</div>
			</div>
			<div class="text-right">
				<div class="text-lg font-semibold text-slate-800">Invoice</div>
				<div class="font-mono text-xs text-slate-400">{invoiceNo}</div>
				<div class="text-xs text-slate-400">{today}</div>
			</div>
		</div>

		<div class="mb-6 grid grid-cols-2 gap-4 text-sm">
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Bill to</div>
				<div class="font-medium text-slate-800">{query.client_name}</div>
				<div class="text-slate-500">{query.client_phone}</div>
			</div>
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Package</div>
				<div class="font-medium text-slate-800">{query.package_type ?? query.destination}</div>
				<div class="text-slate-500">
					{paxCounts.adults} adult{paxCounts.adults === 1 ? '' : 's'}{paxCounts.children ? `, ${paxCounts.children} child` : ''}{paxCounts.infants ? `, ${paxCounts.infants} infant` : ''}
				</div>
			</div>
		</div>

		<table class="w-full text-sm">
			<thead class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
				<tr>
					<th class="py-2 font-medium">Service</th>
					<th class="py-2 text-center font-medium">Status</th>
					<th class="py-2 text-right font-medium">Amount (PKR)</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#each rows as r, i (i)}
					<tr>
						<td class="py-2 text-slate-700">{r.label}</td>
						<td class="py-2 text-center">
							{#if r.booked}
								<span class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">Booked</span>
							{:else}
								<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pending</span>
							{/if}
						</td>
						<td class="py-2 text-right font-medium text-slate-700">{formatAmount(r.amountPkr, 'PKR')}</td>
					</tr>
				{/each}
				{#if rows.length === 0}
					<tr><td colspan="3" class="py-4 text-center text-slate-400">No services yet.</td></tr>
				{/if}
			</tbody>
		</table>

		<div class="mt-4 flex justify-end border-t border-slate-200 pt-3">
			<div class="text-right">
				<div class="text-xs uppercase tracking-wide text-slate-400">Total payable</div>
				<div class="text-2xl font-bold text-slate-800">{formatAmount(totalPkr, 'PKR')}</div>
			</div>
		</div>

		<p class="mt-8 text-center text-xs text-slate-400">
			Computer-generated invoice · Billoo Travel · {today}
		</p>
	</div>
{/if}
