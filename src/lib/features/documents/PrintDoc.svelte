<script lang="ts">
	import { ArrowLeft, Printer } from 'lucide-svelte';
	import { Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import type { Currency, QuotationLineType } from '$lib/database.types';
	import { getQuery } from '$features/queries/api';
	import { getBookingForQuery, listBookingItems } from '$features/bookings/api';
	import { listQuotations, getQuotationLines } from '$features/quotations/api';
	import type { Query } from '$features/queries/types';

	let { queryId, kind }: { queryId: string; kind: 'voucher' | 'itinerary' } = $props();

	interface Row {
		lineType: QuotationLineType;
		label: string;
		currency: Currency;
		amount: number;
		meta: Record<string, unknown>;
	}

	let query = $state<Query | null>(null);
	let rows = $state<Row[]>([]);
	let totalPkr = $state(0);
	let loaded = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (loaded) return;
		loaded = true;
		(async () => {
			try {
				query = await getQuery(queryId);
				const booking = await getBookingForQuery(queryId);
				if (booking) {
					const items = await listBookingItems(booking.id);
					rows = items.map((i) => ({
						lineType: i.line_type,
						label: i.label,
						currency: i.currency,
						amount: Number(i.actual_sell),
						meta: i.meta ?? {}
					}));
					totalPkr = Number(booking.actual_sell_pkr);
				} else {
					const quotes = await listQuotations(queryId);
					const accepted = quotes.find((q) => q.status === 'accepted') ?? quotes[0];
					if (accepted) {
						const lines = await getQuotationLines(accepted.id);
						rows = lines.map((l) => ({
							lineType: l.line_type,
							label: l.label,
							currency: l.currency,
							amount: Number(l.line_sell),
							meta: l.meta ?? {}
						}));
						totalPkr = Number(accepted.total_sell_pkr);
					}
				}
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to load';
			}
		})();
	});

	const title = $derived(kind === 'voucher' ? 'Booking Voucher' : 'Travel Itinerary');

	const hotels = $derived(rows.filter((r) => r.lineType === 'hotel'));
	const transfers = $derived(rows.filter((r) => r.lineType === 'transfer'));
	const visas = $derived(rows.filter((r) => r.lineType === 'visa'));
	const tickets = $derived(rows.filter((r) => r.lineType === 'ticket'));

	function str(meta: Record<string, unknown>, key: string): string {
		const v = meta[key];
		return v == null ? '' : String(v);
	}
	function hotelDates(meta: Record<string, unknown>): string {
		const ci = str(meta, 'check_in');
		const co = str(meta, 'check_out');
		const nights = str(meta, 'nights');
		if (ci && co) return `${ci} → ${co}${nights ? ` (${nights} nights)` : ''}`;
		return nights ? `${nights} nights` : '';
	}
</script>

{#snippet statusPill(meta: Record<string, unknown>)}
	{#if meta.booked === true}
		<span class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">Booked</span>
	{:else}
		<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pending</span>
	{/if}
{/snippet}

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
				<div class="text-lg font-semibold text-slate-800">{title}</div>
				<div class="font-mono text-xs text-slate-400">{query.query_number}</div>
			</div>
		</div>

		<div class="mb-6 grid grid-cols-2 gap-4 text-sm">
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Passenger</div>
				<div class="font-medium text-slate-800">{query.client_name}</div>
				<div class="text-slate-500">{query.client_phone}</div>
			</div>
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Package</div>
				<div class="font-medium text-slate-800">{query.package_type ?? query.destination}</div>
				<div class="text-slate-500">
					{query.adults} adult{query.adults === 1 ? '' : 's'}{query.children ? `, ${query.children} child` : ''}{query.infants ? `, ${query.infants} infant` : ''}
				</div>
			</div>
		</div>

		<!-- Itinerary: structured by component, with dates & room types. -->
		{#if hotels.length}
			<div class="mb-5">
				<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Accommodation</h3>
				{#each hotels as h, i (i)}
					<div class="mb-2 flex items-start justify-between gap-4 text-sm">
						<div>
							<div class="font-medium text-slate-800">{str(h.meta, 'city')} · {str(h.meta, 'hotel')}</div>
							<div class="text-slate-500">
								{str(h.meta, 'room_type')}{str(h.meta, 'qty') ? ` ×${str(h.meta, 'qty')}` : ''}
								{#if hotelDates(h.meta)}· {hotelDates(h.meta)}{/if}
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							{@render statusPill(h.meta)}
							{#if kind === 'voucher'}<div class="text-slate-600">{formatAmount(h.amount, h.currency)}</div>{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if transfers.length}
			<div class="mb-5">
				<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Transfers</h3>
				{#each transfers as t, i (i)}
					<div class="mb-1 flex items-center justify-between text-sm">
						<span class="text-slate-700">{t.label}</span>
						<div class="flex shrink-0 items-center gap-2">
							{@render statusPill(t.meta)}
							{#if kind === 'voucher'}<span class="text-slate-600">{formatAmount(t.amount, t.currency)}</span>{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if visas.length || tickets.length}
			<div class="mb-5">
				<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Visa & Tickets</h3>
				{#each [...visas, ...tickets] as r, i (i)}
					<div class="mb-1 flex items-center justify-between text-sm">
						<span class="text-slate-700">{r.label}</span>
						<div class="flex shrink-0 items-center gap-2">
							{@render statusPill(r.meta)}
							{#if kind === 'voucher'}<span class="text-slate-600">{formatAmount(r.amount, r.currency)}</span>{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if rows.length === 0}
			<p class="py-3 text-sm text-slate-400">No items — create a booking or accept a quotation first.</p>
		{/if}

		{#if kind === 'voucher'}
			<div class="flex justify-end border-t border-slate-200 pt-3">
				<div class="text-right">
					<div class="text-xs uppercase tracking-wide text-slate-400">Total</div>
					<div class="text-xl font-bold text-slate-800">{formatAmount(totalPkr, 'PKR')}</div>
				</div>
			</div>
		{/if}

		<p class="mt-8 text-center text-xs text-slate-400">
			Generated by Billoo Travel · {new Date().toLocaleDateString()}
		</p>
	</div>
{/if}
