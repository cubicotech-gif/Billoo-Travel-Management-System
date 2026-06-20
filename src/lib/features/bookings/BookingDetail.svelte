<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus } from 'lucide-svelte';
	import { Button, Card, Input, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import type { Currency, QuotationLineType } from '$lib/database.types';
	import { useVendors } from '$features/vendors/queries';
	import { useBookingItems, useCreateBookingItem } from './queries';
	import BookingItemRow from './BookingItemRow.svelte';
	import type { Booking } from './types';

	// `booking` is stable for this instance (parent keys on booking.id).
	let { booking, queryId }: { booking: Booking; queryId: string } = $props();

	const items = untrack(() => useBookingItems(booking.id));
	const vendors = useVendors();
	const createItem = untrack(() => useCreateBookingItem(queryId));

	const LINE_TYPES: QuotationLineType[] = ['hotel', 'transfer', 'visa', 'ticket', 'other'];
	const CURRENCIES: Currency[] = ['SAR', 'PKR', 'USD'];

	let add = $state({
		line_type: 'hotel' as QuotationLineType,
		label: '',
		vendor_id: '',
		currency: 'SAR' as Currency,
		actual_cost: 0,
		actual_sell: 0
	});
	const vendorOptions = $derived([
		{ value: '', label: '— vendor —' },
		...($vendors.data ?? []).map((v) => ({ value: v.id, label: v.name }))
	]);

	function addService(e: SubmitEvent) {
		e.preventDefault();
		$createItem.mutate(
			{
				booking,
				input: {
					line_type: add.line_type,
					label: add.label.trim() || add.line_type,
					vendor_id: add.vendor_id || null,
					currency: add.currency,
					quoted_cost: 0,
					quoted_sell: 0,
					actual_cost: Number(add.actual_cost),
					actual_sell: Number(add.actual_sell),
					meta: {}
				}
			},
			{
				onSuccess: () => {
					add = { line_type: 'hotel', label: '', vendor_id: '', currency: 'SAR', actual_cost: 0, actual_sell: 0 };
				}
			}
		);
	}

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
			{#if ($items.data ?? []).length === 0}
				<tr><td colspan="8" class="px-3 py-6 text-center text-sm text-slate-400">No services yet — add what you're booking below.</td></tr>
			{/if}
		</tbody>
	</table>
</div>

<!-- Add a vendor service: cost + sell feed the vendor's account automatically. -->
<form onsubmit={addService} class="mt-3 rounded-xl border border-slate-200 bg-white p-3">
	<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Add a service</div>
	<div class="flex flex-wrap items-end gap-2">
		<div class="w-28"><Select label="Service" bind:value={add.line_type} options={[...LINE_TYPES]} /></div>
		<div class="min-w-[10rem] flex-1"><Input label="Description" bind:value={add.label} placeholder="e.g. Makkah hotel — Hilton" /></div>
		<div class="w-40"><Select label="Vendor" bind:value={add.vendor_id} options={vendorOptions} /></div>
		<div class="w-20"><Select label="Cur." bind:value={add.currency} options={[...CURRENCIES]} /></div>
		<div class="w-24"><Input label="Cost" type="number" min="0" step="0.01" bind:value={add.actual_cost} /></div>
		<div class="w-24"><Input label="Sell" type="number" min="0" step="0.01" bind:value={add.actual_sell} /></div>
		<Button type="submit" size="sm" disabled={$createItem.isPending}><Plus class="h-4 w-4" /> Add</Button>
	</div>
</form>
<p class="mt-2 text-xs text-slate-400">
	SAR components convert at ROE {booking.roe}. A row's cost + selected vendor post to that vendor's account automatically.
</p>
