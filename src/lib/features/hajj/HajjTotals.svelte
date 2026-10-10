<script lang="ts">
	import { AlertTriangle } from 'lucide-svelte';
	import { Card } from '$ui';
	import { formatAmount } from '$lib/money';
	import type { QuoteResult } from './calc';
	import { financeBridge } from './bridge';

	// Family totals. USD is never converted; SAR is converted to PKR at the ROE
	// (and tickets, which are PKR, join that PKR figure).
	let {
		result,
		names,
		usdRate = null
	}: { result: QuoteResult; names: Record<string, string>; usdRate?: number | null } = $props();

	// What the rest of the app (payments, finance, the booking lifecycle) sees, in PKR.
	const bridge = $derived(financeBridge(result, usdRate));
	const hasCommission = $derived(Object.keys(result.commission).length > 0);

	const hasMixed = $derived(result.usd !== null && result.byCurrency.some((c) => c.currency === 'SAR'));
	const sar = $derived(result.byCurrency.find((c) => c.currency === 'SAR'));
	const warnings = $derived(
		result.travellers.flatMap((t) => [
			...(t.baseMissing ? [`${names[t.id] ?? 'A traveller'}: package has no price for this room`] : []),
			...t.addons
				.filter((l) => l.missingPrice)
				.map(() => `${names[t.id] ?? 'A traveller'}: an add-on has no price — enter its cost`)
		])
	);
</script>

<Card title="Family totals">
	<div class="space-y-4 text-sm">
		{#if warnings.length}
			<ul class="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
				{#each warnings as w, i (i)}
					<li class="flex items-start gap-1.5"><AlertTriangle class="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}</li>
				{/each}
			</ul>
		{/if}

		{#snippet block(title: string, cost: number, sell: number, profit: number, cur: 'USD' | 'SAR' | 'PKR')}
			<div class="border-t border-slate-100 pt-2">
				<p class="mb-1 font-medium text-slate-700">{title}</p>
				<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs tabular-nums">
					<dt class="text-slate-400">Cost</dt>
					<dd class="text-right">{formatAmount(cost, cur)}</dd>
					<dt class="text-slate-400">Sell</dt>
					<dd class="text-right font-medium text-slate-800">{formatAmount(sell, cur)}</dd>
					<dt class="text-slate-400">Profit</dt>
					<dd class="text-right {profit >= 0 ? 'text-green-600' : 'text-red-600'}">{formatAmount(profit, cur)}</dd>
				</dl>
			</div>
		{/snippet}

		{#each result.byCurrency as c (c.currency)}
			{@render block(`${c.currency} packages${c.currency === 'USD' ? ' (not converted)' : ''}`, c.cost, c.sell, c.profit, c.currency)}
		{/each}
		{#if result.ticket.sell > 0 || result.ticket.cost > 0}
			{@render block('Air tickets (PKR)', result.ticket.cost, result.ticket.sell, result.ticket.profit, 'PKR')}
		{/if}

		{#if sar || result.ticket.sell > 0}
			<div class="rounded-lg bg-brand-50 px-3 py-2.5">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<span class="text-xs font-medium text-brand-700">
						Total in PKR{sar ? ` — SAR × ${result.roe}` : ''}{result.ticket.sell > 0 ? ' + tickets' : ''}
					</span>
					<span class="text-lg font-semibold tabular-nums text-brand-800">{formatAmount(result.pkr.sell, 'PKR')}</span>
				</div>
				<p class="mt-0.5 text-right text-xs tabular-nums text-slate-500">
					cost {formatAmount(result.pkr.cost, 'PKR')} · profit
					<span class={result.pkr.profit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatAmount(result.pkr.profit, 'PKR')}</span>
				</p>
			</div>
		{/if}
		{#if result.usd}
			<div class="rounded-lg bg-amber-50 px-3 py-2.5">
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<span class="text-xs font-medium text-amber-700">Total in USD{hasMixed ? ' — payable separately' : ''}</span>
					<span class="text-lg font-semibold tabular-nums text-amber-800">{formatAmount(result.usd.sell, 'USD')}</span>
				</div>
			</div>
		{/if}

		<!-- Staff only: never shown to the client -->
		<div class="rounded-lg border border-slate-200 px-3 py-2 text-xs">
			<p class="mb-1 font-semibold text-slate-600">Books &amp; finance (staff only)</p>
			<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
				{#if hasCommission}
					<dt class="text-slate-400">Vendor commission</dt>
					<dd class="text-right">
						{#each Object.entries(result.commission) as [cur, amt], i (cur)}
							{i ? ' + ' : ''}{formatAmount(amt, cur as 'USD' | 'SAR')}
						{/each}
					</dd>
				{/if}
				<dt class="text-slate-400">Client owes (PKR)</dt>
				<dd class="text-right font-medium text-slate-800">{formatAmount(bridge.sellPkr, 'PKR')}</dd>
				<dt class="text-slate-400">Cost, net of commission</dt>
				<dd class="text-right">{formatAmount(bridge.costPkr, 'PKR')}</dd>
				<dt class="text-slate-400">Profit incl. commission</dt>
				<dd class="text-right {bridge.profitPkr >= 0 ? 'text-green-600' : 'text-red-600'}">{formatAmount(bridge.profitPkr, 'PKR')}</dd>
			</dl>
			{#if bridge.usdMissingRate}
				<p class="mt-1.5 flex items-start gap-1 text-amber-700">
					<AlertTriangle class="mt-0.5 h-3 w-3 shrink-0" /> USD charges are not counted above — set the USD → PKR rate.
				</p>
			{/if}
		</div>

		<details>
			<summary class="cursor-pointer text-xs font-medium text-slate-500">Per traveller</summary>
			<ul class="mt-2 space-y-1 text-xs tabular-nums">
				{#each result.travellers as t (t.id)}
					<li class="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-1">
						<span class="text-slate-700">{names[t.id] ?? 'Traveller'}</span>
						<span class="text-slate-500">
							{#each Object.entries(t.amounts) as [cur, a] (cur)}
								<span class="ml-2">{formatAmount(a.sell, cur as 'USD' | 'SAR')}</span>
							{/each}
							{#if t.ticketSell > 0}<span class="ml-2">+ {formatAmount(t.ticketSell, 'PKR')} ticket</span>{/if}
						</span>
					</li>
				{/each}
			</ul>
		</details>
	</div>
</Card>
