<script lang="ts">
	import { ArrowLeft, Printer } from 'lucide-svelte';
	import { Button } from '$ui';
	import { formatAmount, money, subtract, toNumber } from '$lib/money';
	import type { Currency, QuotationLineType } from '$lib/database.types';
	import { getQuery } from '$features/queries/api';
	import { getBookingForQuery, listBookingItems } from '$features/bookings/api';
	import { ratesOf, toPkr, type Rates } from '$features/bookings/totals';
	import { paidTotal } from '$features/bookings/lifecycle';
	import { listQuotations, getQuotationLines } from '$features/quotations/api';
	import { listPayments, type Payment } from '$features/payments/api';
	import { getOrgSettings, type OrgSettings } from '$features/settings/api';
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
	let org = $state<OrgSettings | null>(null);
	let rows = $state<Row[]>([]);
	let totalPkr = $state(0);
	let discountPkr = $state(0);
	let payments = $state<Payment[]>([]);
	let invoiceNo = $state('');
	let loaded = $state(false);
	let error = $state<string | null>(null);
	// Print-time choice: per-service amounts, or just the grand total.
	let showBreakup = $state(true);
	// Print-time choice: show the paid-so-far / balance-due settlement, or just
	// the total payable (some clients get a clean bill with no payment history).
	let showPayments = $state(true);
	// Print-time choice: itemise every installment (with its date), or collapse
	// the received payments into a single "Amount paid" figure.
	let showPaymentSchedule = $state(true);

	// The client's received installments, oldest first — clients pay in parts on
	// different dates, so the invoice lists each one with the date it was paid.
	const paidRows = $derived(
		payments
			.filter((p) => p.status === 'paid')
			.map((p) => ({
				date: p.paid_date ?? p.created_at,
				amountPkr: Number(p.amount),
				method: p.method,
				reference: p.reference
			}))
			.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
	);

	// Settlement math — all through the money layer, never raw float arithmetic.
	// Total payable = package total − order discount; balance = payable − paid.
	const paidPkr = $derived(paidTotal(payments));
	const payablePkr = $derived(
		toNumber(subtract(money(totalPkr, 'PKR'), money(discountPkr, 'PKR')))
	);
	const balancePkr = $derived(
		toNumber(subtract(money(payablePkr, 'PKR'), money(paidPkr, 'PKR')))
	);

	function fmtDate(d: string): string {
		const t = new Date(d);
		return isNaN(t.getTime()) ? d : t.toLocaleDateString();
	}

	$effect(() => {
		if (loaded) return;
		loaded = true;
		(async () => {
			try {
				query = await getQuery(queryId);
				org = await getOrgSettings().catch(() => null);
				// Payments are query-scoped (they survive across quote/booking edits),
				// so load them regardless of which price source we render below.
				payments = await listPayments(queryId).catch(() => []);
				const booking = await getBookingForQuery(queryId);
				const items = booking ? await listBookingItems(booking.id) : [];
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
					discountPkr = Number(booking.discount_pkr) || 0;
					invoiceNo = `INV-${query?.query_number ?? booking.id.slice(0, 8)}`;
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
					}
				}
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to load';
			}
		})();
	});

	const today = new Date().toLocaleDateString();
</script>

<div class="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
	<a href="/queries/{queryId}" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
		<ArrowLeft class="h-4 w-4" /> Back to query
	</a>
	<div class="flex items-center gap-3">
		<label class="flex items-center gap-1.5 text-sm text-slate-600">
			<input type="checkbox" bind:checked={showBreakup} class="rounded border-slate-300" /> Show price breakup
		</label>
		<label class="flex items-center gap-1.5 text-sm text-slate-600">
			<input type="checkbox" bind:checked={showPayments} class="rounded border-slate-300" /> Show payments
		</label>
		<label class="flex items-center gap-1.5 text-sm text-slate-600" class:opacity-40={!showPayments}>
			<input type="checkbox" bind:checked={showPaymentSchedule} disabled={!showPayments} class="rounded border-slate-300" /> Show payment dates
		</label>
		<Button onclick={() => window.print()}><Printer class="h-4 w-4" /> Print / Save PDF</Button>
	</div>
</div>

{#if error}
	<p class="text-red-600">{error}</p>
{:else if !query}
	<p class="text-slate-400">Loading…</p>
{:else}
	<div class="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8">
		<div class="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
			{#if org?.logo_url}
				<img src={org.logo_url} alt={org.company_name} style="height: {org.logo_height}px" class="w-auto max-h-56 max-w-[55%] object-contain" />
			{:else}
				<div>
					<div class="text-xl font-bold text-brand-700">{org?.company_name ?? 'Billoo Travels'}</div>
					{#if org?.tagline}<div class="text-xs text-slate-400">{org.tagline}</div>{/if}
				</div>
			{/if}
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
					{query.adults} adult{query.adults === 1 ? '' : 's'}{query.children ? `, ${query.children} child` : ''}{query.infants ? `, ${query.infants} infant` : ''}
				</div>
			</div>
		</div>

		<table class="w-full text-sm">
			<thead class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
				<tr>
					<th class="py-2 font-medium">Service</th>
					<th class="py-2 text-center font-medium">Status</th>
					{#if showBreakup}<th class="py-2 text-right font-medium">Amount (PKR)</th>{/if}
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
						{#if showBreakup}<td class="py-2 text-right font-medium text-slate-700">{formatAmount(r.amountPkr, 'PKR')}</td>{/if}
					</tr>
				{/each}
				{#if rows.length === 0}
					<tr><td colspan={showBreakup ? 3 : 2} class="py-4 text-center text-slate-400">No services yet.</td></tr>
				{/if}
			</tbody>
		</table>

		<div class="mt-4 flex justify-end border-t border-slate-200 pt-3">
			<div class="w-full max-w-xs space-y-1.5 text-sm">
				{#if discountPkr > 0}
					<div class="flex justify-between text-slate-500">
						<span>Subtotal</span>
						<span>{formatAmount(totalPkr, 'PKR')}</span>
					</div>
					<div class="flex justify-between text-slate-500">
						<span>Discount</span>
						<span>− {formatAmount(discountPkr, 'PKR')}</span>
					</div>
				{/if}
				<div class="flex items-center justify-between border-t border-slate-200 pt-2">
					<span class="text-xs uppercase tracking-wide text-slate-400">Total payable</span>
					<span class="text-2xl font-bold text-slate-800">{formatAmount(payablePkr, 'PKR')}</span>
				</div>
				{#if showPayments && (paidPkr > 0 || balancePkr !== payablePkr)}
					{#if showPaymentSchedule && paidRows.length > 0}
						<div class="border-t border-slate-200 pt-2">
							<div class="mb-1 text-xs uppercase tracking-wide text-slate-400">Payments received</div>
							<div class="space-y-1">
								{#each paidRows as p, i (i)}
									<div class="flex justify-between text-slate-500">
										<span>
											{fmtDate(p.date)}{#if p.method}<span class="text-slate-400"> · {p.method}</span>{/if}
										</span>
										<span>{formatAmount(p.amountPkr, 'PKR')}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
					<div class="flex justify-between {showPaymentSchedule && paidRows.length > 0 ? 'text-slate-600' : 'border-t border-slate-200 pt-2 text-slate-500'}">
						<span>{showPaymentSchedule && paidRows.length > 0 ? 'Total paid' : 'Amount paid'}</span>
						<span>− {formatAmount(paidPkr, 'PKR')}</span>
					</div>
					<div class="flex items-center justify-between border-t border-slate-200 pt-2">
						<span class="text-xs uppercase tracking-wide text-slate-400">
							{balancePkr < 0 ? 'Advance / credit' : 'Balance due'}
						</span>
						<span class="text-lg font-bold {balancePkr <= 0 ? 'text-green-700' : 'text-slate-800'}">
							{formatAmount(Math.abs(balancePkr), 'PKR')}
						</span>
					</div>
				{/if}
			</div>
		</div>

		<p class="mt-8 text-center text-xs text-slate-400">
			Computer-generated invoice · {org?.company_name ?? 'Billoo Travels'} · {today}
		</p>
	</div>
{/if}
