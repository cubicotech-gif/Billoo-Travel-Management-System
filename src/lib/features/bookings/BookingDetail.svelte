<script lang="ts">
	import { untrack } from 'svelte';
	import { Card } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useBookingItems } from './queries';
	import BookingItemRow from './BookingItemRow.svelte';
	import type { Booking } from './types';

	// `booking` is stable for this instance (parent keys on booking.id).
	let { booking, queryId }: { booking: Booking; queryId: string } = $props();

	const items = untrack(() => useBookingItems(booking.id));

	const variance = $derived(
		Number(booking.actual_sell_pkr) -
			Number(booking.actual_cost_pkr) -
			(Number(booking.quoted_sell_pkr) - Number(booking.quoted_cost_pkr))
	);
</script>

<div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
	<Card>
		<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Actual Cost</div>
		<div class="mt-1 text-lg font-bold text-slate-800">{formatAmount(Number(booking.actual_cost_pkr), 'PKR')}</div>
	</Card>
	<Card>
		<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Actual Selling</div>
		<div class="mt-1 text-lg font-bold text-slate-800">{formatAmount(Number(booking.actual_sell_pkr), 'PKR')}</div>
	</Card>
	<Card>
		<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Profit</div>
		<div class="mt-1 text-lg font-bold text-green-600">{formatAmount(Number(booking.profit_pkr), 'PKR')}</div>
	</Card>
	<Card>
		<div class="text-xs font-medium uppercase tracking-wide text-slate-400">vs Quote</div>
		<div class="mt-1 text-lg font-bold {variance >= 0 ? 'text-green-600' : 'text-red-600'}">
			{variance >= 0 ? '+' : ''}{formatAmount(variance, 'PKR')}
		</div>
	</Card>
</div>

<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
	<table class="w-full text-sm">
		<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
			<tr>
				<th class="px-3 py-2 font-medium">Component</th>
				<th class="px-3 py-2 font-medium">Actual vendor</th>
				<th class="px-3 py-2 text-right font-medium">Quoted c/s</th>
				<th class="px-3 py-2 font-medium">Act. cost</th>
				<th class="px-3 py-2 font-medium">Act. sell</th>
				<th class="px-3 py-2 text-right font-medium">Profit</th>
				<th class="px-3 py-2 text-right font-medium">vs quote</th>
				<th class="px-3 py-2"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-slate-50">
			{#each $items.data ?? [] as item (item.id)}
				<BookingItemRow {item} {booking} {queryId} />
			{/each}
		</tbody>
	</table>
</div>
<p class="mt-2 text-xs text-slate-400">
	SAR components convert at ROE {booking.roe}. Edit a row's vendor/costs and press ✓ to save.
</p>
