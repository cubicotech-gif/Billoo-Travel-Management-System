<script lang="ts">
	import { Card } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useVendorBalances } from '$features/vendors/queries';
	import { useClientReceivables, useCollections, useProfitSummary } from '$features/finance/queries';

	const balances = useVendorBalances();
	const receivables = useClientReceivables();
	const collections = useCollections();
	const profit = useProfitSummary();

	const totalPayable = $derived(($balances.data ?? []).reduce((a, b) => a + Math.max(0, b.balance), 0));
	const totalReceivable = $derived(($receivables.data ?? []).reduce((a, r) => a + r.balance, 0));
	const totalCollected = $derived(($collections.data ?? []).reduce((a, c) => a + c.amount, 0));

	function fmtDate(iso: string | null): string {
		return iso ? new Date(iso).toLocaleDateString() : '—';
	}
</script>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-slate-800">Finance</h1>
	<p class="text-sm text-slate-500">The money hub — collections, receivables, vendor payables and profit across all bookings.</p>
</div>

<div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
	<Card>
		<div class="text-xs uppercase tracking-wide text-slate-400">Collected</div>
		<div class="mt-1 text-2xl font-bold text-green-600">{formatAmount(totalCollected, 'PKR')}</div>
	</Card>
	<Card>
		<div class="text-xs uppercase tracking-wide text-slate-400">Receivable from clients</div>
		<div class="mt-1 text-2xl font-bold text-brand-700">{formatAmount(totalReceivable, 'PKR')}</div>
	</Card>
	<Card>
		<div class="text-xs uppercase tracking-wide text-slate-400">Payable to vendors</div>
		<div class="mt-1 text-2xl font-bold text-amber-600">{formatAmount(totalPayable, 'PKR')}</div>
	</Card>
	<Card>
		<div class="text-xs uppercase tracking-wide text-slate-400">Net position</div>
		<div class="mt-1 text-2xl font-bold text-slate-800">{formatAmount(totalReceivable - totalPayable, 'PKR')}</div>
	</Card>
	<Card>
		<div class="text-xs uppercase tracking-wide text-slate-400">Net profit</div>
		<div class="mt-1 text-2xl font-bold {($profit.data?.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}">
			{formatAmount($profit.data?.netProfit ?? 0, 'PKR')}
		</div>
	</Card>
</div>

<!-- Collections: money actually received from clients -->
<h2 class="mb-2 text-lg font-semibold text-slate-800">Collections</h2>
{#if $collections.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if ($collections.data ?? []).length === 0}
	<div class="mb-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
		No payments recorded yet.
	</div>
{:else}
	<div class="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
				<tr>
					<th class="px-4 py-2 font-medium">Date</th>
					<th class="px-4 py-2 font-medium">Client</th>
					<th class="px-4 py-2 font-medium">For</th>
					<th class="px-4 py-2 text-right font-medium">Amount</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-50">
				{#each $collections.data ?? [] as c (c.id)}
					<tr class="hover:bg-slate-50">
						<td class="px-4 py-2 text-xs text-slate-400">{fmtDate(c.date)}</td>
						<td class="px-4 py-2 font-medium text-slate-700">
							<a href="/queries/{c.queryId}" class="hover:text-brand-600">{c.clientName}</a>
						</td>
						<td class="px-4 py-2 text-slate-500">{c.label}</td>
						<td class="px-4 py-2 text-right font-medium text-green-600">{formatAmount(c.amount, 'PKR')}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<!-- Vendor payables -->
<h2 class="mb-2 text-lg font-semibold text-slate-800">Vendor payables</h2>
{#if $balances.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if ($balances.data ?? []).length === 0}
	<div class="mb-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
		No vendor activity yet.
	</div>
{:else}
	<div class="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
				<tr>
					<th class="px-4 py-2 font-medium">Vendor</th>
					<th class="px-4 py-2 text-right font-medium">Owed</th>
					<th class="px-4 py-2 text-right font-medium">Paid</th>
					<th class="px-4 py-2 text-right font-medium">Balance</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-50">
				{#each $balances.data ?? [] as b (b.vendor.id)}
					<tr class="hover:bg-slate-50">
						<td class="px-4 py-2 font-medium text-slate-700">
							<a href="/vendors/{b.vendor.id}" class="hover:text-brand-600">{b.vendor.name}</a>
						</td>
						<td class="px-4 py-2 text-right text-slate-600">{formatAmount(b.owed, 'PKR')}</td>
						<td class="px-4 py-2 text-right text-green-600">{formatAmount(b.paid, 'PKR')}</td>
						<td class="px-4 py-2 text-right font-medium {b.balance > 0 ? 'text-amber-600' : 'text-green-600'}">{formatAmount(b.balance, 'PKR')}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<!-- Client receivables -->
<h2 class="mb-2 text-lg font-semibold text-slate-800">Client receivables</h2>
{#if $receivables.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if ($receivables.data ?? []).length === 0}
	<div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
		Nothing outstanding from clients.
	</div>
{:else}
	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
				<tr>
					<th class="px-4 py-2 font-medium">Client</th>
					<th class="px-4 py-2 text-right font-medium">Package</th>
					<th class="px-4 py-2 text-right font-medium">Paid</th>
					<th class="px-4 py-2 text-right font-medium">Balance</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-50">
				{#each $receivables.data ?? [] as r (r.queryId)}
					<tr class="hover:bg-slate-50">
						<td class="px-4 py-2 font-medium text-slate-700">
							<a href="/queries/{r.queryId}" class="hover:text-brand-600">{r.clientName}</a>
						</td>
						<td class="px-4 py-2 text-right text-slate-600">{formatAmount(r.selling, 'PKR')}</td>
						<td class="px-4 py-2 text-right text-green-600">{formatAmount(r.paid, 'PKR')}</td>
						<td class="px-4 py-2 text-right font-medium text-amber-600">{formatAmount(r.balance, 'PKR')}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
