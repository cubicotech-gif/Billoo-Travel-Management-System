<script lang="ts">
	import { untrack } from 'svelte';
	import { formatAmount } from '$lib/money';
	import { useQuotationLines } from './queries';

	// Inline line-item breakdown for a saved quotation — which service/hotel and
	// what we quoted — so the figures are visible without opening the builder.
	let { quotationId }: { quotationId: string } = $props();

	const lines = untrack(() => useQuotationLines(quotationId));

	// meta sometimes carries extra detail (hotel name, room, nights, route).
	function detail(meta: Record<string, unknown>): string {
		const parts = ['hotel', 'room_type', 'nights', 'route', 'detail']
			.map((k) => meta?.[k])
			.filter((v): v is string | number => typeof v === 'string' || typeof v === 'number');
		return parts.join(' · ');
	}
</script>

{#if $lines.isLoading}
	<p class="px-1 py-2 text-xs text-slate-400">Loading breakdown…</p>
{:else if ($lines.data ?? []).length === 0}
	<p class="px-1 py-2 text-xs text-slate-400">No line items recorded for this version.</p>
{:else}
	<table class="w-full text-xs">
		<thead>
			<tr class="text-left text-[10px] uppercase tracking-wide text-slate-400">
				<th class="py-1 pr-2 font-medium">Item</th>
				<th class="py-1 px-2 text-right font-medium">Qty</th>
				<th class="py-1 px-2 text-right font-medium">Cost</th>
				<th class="py-1 pl-2 text-right font-medium">Sell</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-slate-100">
			{#each $lines.data ?? [] as l (l.id)}
				{@const d = detail(l.meta)}
				<tr>
					<td class="py-1.5 pr-2 align-top">
						<div class="font-medium text-slate-700">{l.label}</div>
						{#if d}<div class="text-[10px] text-slate-400">{d}</div>{/if}
					</td>
					<td class="py-1.5 px-2 text-right align-top text-slate-500">{l.quantity}</td>
					<td class="py-1.5 px-2 text-right align-top text-slate-500">{formatAmount(Number(l.line_cost), l.currency)}</td>
					<td class="py-1.5 pl-2 text-right align-top font-medium text-slate-700">{formatAmount(Number(l.line_sell), l.currency)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
