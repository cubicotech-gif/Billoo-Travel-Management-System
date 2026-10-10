<script lang="ts">
	import { ArrowLeft, Printer } from 'lucide-svelte';
	import { Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import type { HajjDocContext } from './doc-context';
	import { invoiceModel } from './documents';
	import HajjDocLoader from './HajjDocLoader.svelte';
	import HajjLetterhead from './HajjLetterhead.svelte';

	// Client invoice for a Hajj booking: each traveller's package and add-ons at
	// the selling price, converted to PKR (SAR at the ROE, USD at the USD rate),
	// settled against the booking's discount and the payments received.
	// Selling prices only — never cost, margin or commission.
	let { queryId }: { queryId: string } = $props();

	let showBreakup = $state(true);
	let showPayments = $state(true);
	let showSchedule = $state(true);

	const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
	const fmtDate = (d: string) => {
		const t = new Date(d);
		return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	};
	const model = (c: HajjDocContext) =>
		invoiceModel(c.proposal, {
			roe: c.roe,
			usdRate: c.usdRate,
			discountPkr: c.discountPkr,
			payments: c.payments
		});
	const money = (n: number, cur: 'SAR' | 'USD' | 'PKR') => formatAmount(n, cur);
</script>

<div class="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
	<a href="/queries/{queryId}" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
		<ArrowLeft class="h-4 w-4" /> Back to query
	</a>
	<div class="flex flex-wrap items-center gap-3">
		<label class="flex items-center gap-1.5 text-sm text-slate-600">
			<input type="checkbox" bind:checked={showBreakup} class="rounded border-slate-300" /> Show price breakup
		</label>
		<label class="flex items-center gap-1.5 text-sm text-slate-600">
			<input type="checkbox" bind:checked={showPayments} class="rounded border-slate-300" /> Show payments
		</label>
		<label class="flex items-center gap-1.5 text-sm text-slate-600" class:opacity-40={!showPayments}>
			<input type="checkbox" bind:checked={showSchedule} disabled={!showPayments} class="rounded border-slate-300" /> Show payment dates
		</label>
		<Button onclick={() => window.print()}><Printer class="h-4 w-4" /> Print / Save PDF</Button>
	</div>
</div>

<HajjDocLoader {queryId}>
	{#snippet children(c)}
		{@const m = model(c)}
		<div class="print-card print-doc print-flush mx-auto max-w-3xl bg-white p-8 text-slate-800 shadow-sm print:shadow-none" data-testid="hajj-invoice">
			<HajjLetterhead org={c.org} />

			<div class="doc-section mb-5 flex items-start justify-between gap-4">
				<div>
					<div class="text-xs uppercase tracking-wide text-slate-400">Bill to</div>
					<div class="text-base font-semibold text-slate-800">{c.query.client_name}</div>
					<div class="text-sm text-slate-500">{c.query.client_phone}</div>
				</div>
				<div class="text-right">
					<div class="text-lg font-semibold text-slate-800">Invoice</div>
					<div class="font-mono text-xs text-slate-400">INV-{c.query.query_number}</div>
					<div class="text-xs text-slate-400">{today}</div>
					<div class="mt-1 text-xs text-slate-500">
						Hajj 2027 · {c.proposal.travellerCount} pilgrim{c.proposal.travellerCount === 1 ? '' : 's'} · Ref {c.proposal.reference}
					</div>
				</div>
			</div>

			<div class="doc-section table-scroll">
				<table class="w-full text-sm">
					<thead class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
						<tr>
							<th class="py-2 pr-3 font-medium">Pilgrim</th>
							<th class="py-2 pr-3 font-medium">Service</th>
							{#if showBreakup}
								<th class="py-2 pr-3 text-right font-medium">Amount</th>
								<th class="py-2 text-right font-medium">PKR</th>
							{/if}
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each m.rows as r, i (i)}
							<tr>
								<td class="py-1.5 pr-3 align-top font-medium text-slate-800">{r.first ? r.traveller : ''}</td>
								<td class="py-1.5 pr-3 text-slate-700">{r.description}</td>
								{#if showBreakup}
									<td class="py-1.5 pr-3 text-right tabular-nums text-slate-500">{r.currency === 'PKR' ? '' : money(r.amount, r.currency)}</td>
									<td class="py-1.5 text-right tabular-nums font-medium text-slate-700">
										{r.amountPkr === null ? '—' : money(r.amountPkr, 'PKR')}
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="doc-section mt-4 flex justify-end border-t border-slate-200 pt-3">
				<div class="w-full max-w-sm space-y-1.5 text-sm">
					{#if m.discountPkr > 0}
						<div class="flex justify-between text-slate-500"><span>Subtotal</span><span class="tabular-nums">{money(m.subtotalPkr, 'PKR')}</span></div>
						<div class="flex justify-between text-slate-500"><span>Discount</span><span class="tabular-nums">− {money(m.discountPkr, 'PKR')}</span></div>
					{/if}
					<div class="flex items-center justify-between border-t border-slate-200 pt-2">
						<span class="text-xs uppercase tracking-wide text-slate-400">Total payable</span>
						<span class="text-2xl font-bold tabular-nums text-slate-800">{money(m.payablePkr, 'PKR')}</span>
					</div>
					{#if m.usdOutstanding !== null}
						<div class="flex items-center justify-between text-slate-700">
							<span class="text-xs uppercase tracking-wide text-slate-400">Plus, payable in USD</span>
							<span class="text-lg font-bold tabular-nums">{money(m.usdOutstanding, 'USD')}</span>
						</div>
					{/if}

					{#if showPayments && (m.paidPkr > 0 || m.received.length > 0)}
						{#if showSchedule && m.received.length > 0}
							<div class="border-t border-slate-200 pt-2">
								<div class="mb-1 text-xs uppercase tracking-wide text-slate-400">Payments received</div>
								{#each m.received as p, i (i)}
									<div class="flex justify-between text-slate-500">
										<span>{fmtDate(p.date)}{#if p.method}<span class="text-slate-400"> · {p.method}</span>{/if}</span>
										<span class="tabular-nums">{money(p.amount, 'PKR')}</span>
									</div>
								{/each}
							</div>
						{/if}
						<div class="flex justify-between border-t border-slate-200 pt-2 text-slate-600">
							<span>{showSchedule && m.received.length > 0 ? 'Total paid' : 'Amount paid'}</span>
							<span class="tabular-nums">− {money(m.paidPkr, 'PKR')}</span>
						</div>
						<div class="flex items-center justify-between border-t border-slate-200 pt-2">
							<span class="text-xs uppercase tracking-wide text-slate-400">{m.balancePkr < 0 ? 'Advance / credit' : 'Balance due'}</span>
							<span class="text-lg font-bold tabular-nums {m.balancePkr <= 0 ? 'text-green-700' : 'text-slate-800'}">{money(Math.abs(m.balancePkr), 'PKR')}</span>
						</div>
					{/if}
				</div>
			</div>

			{#if showPayments && showSchedule && m.upcoming.length > 0}
				<div class="doc-section mt-5 rounded border border-slate-200 p-3 text-xs">
					<div class="mb-1 font-bold uppercase tracking-wide text-slate-500">Payment schedule</div>
					{#each m.upcoming as u, i (i)}
						<div class="flex justify-between py-0.5 text-slate-600">
							<span>{u.label}{#if u.due}<span class="text-slate-400"> · due {fmtDate(u.due)}</span>{/if}</span>
							<span class="tabular-nums font-medium">{money(u.amount, 'PKR')}</span>
						</div>
					{/each}
				</div>
			{/if}

			<p class="mt-8 text-center text-xs text-slate-400">
				Computer-generated invoice · {c.org?.company_name ?? 'Billoo Travels'} · {today}
			</p>
		</div>
	{/snippet}
</HajjDocLoader>
