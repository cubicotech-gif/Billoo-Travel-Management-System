<script lang="ts">
	import { untrack } from 'svelte';
	import { Check } from 'lucide-svelte';
	import { Badge, Button, Input, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useVendors } from '$features/vendors/queries';
	import { useUpdateBookingItem } from './queries';
	import { itemProfit } from './totals';
	import type { Booking, BookingItem } from './types';

	let { item, booking, queryId }: { item: BookingItem; booking: Booking; queryId: string } =
		$props();

	const vendors = useVendors();
	const update = untrack(() => useUpdateBookingItem(queryId));

	let form = $state(
		untrack(() => ({
			vendor_id: item.vendor_id ?? '',
			actual_cost: Number(item.actual_cost),
			actual_sell: Number(item.actual_sell)
		}))
	);

	const vendorOptions = $derived([
		{ value: '', label: '— vendor —' },
		...($vendors.data ?? []).map((v) => ({ value: v.id, label: v.name }))
	]);

	const liveProfit = $derived(
		itemProfit({
			currency: item.currency,
			quoted_cost: 0,
			quoted_sell: 0,
			actual_cost: Number(form.actual_cost),
			actual_sell: Number(form.actual_sell)
		})
	);
	const quotedProfit = $derived(Number(item.quoted_sell) - Number(item.quoted_cost));
	const variance = $derived(liveProfit - quotedProfit);

	function save() {
		$update.mutate({
			id: item.id,
			booking,
			patch: {
				vendor_id: form.vendor_id || null,
				actual_cost: Number(form.actual_cost),
				actual_sell: Number(form.actual_sell)
			}
		});
	}
</script>

<tr class="hover:bg-slate-50">
	<td class="px-3 py-2">
		<div class="font-medium text-slate-700">{item.label}</div>
		<Badge tone="neutral">{item.currency}</Badge>
	</td>
	<td class="px-3 py-2 w-40"><Select bind:value={form.vendor_id} options={vendorOptions} /></td>
	<td class="px-3 py-2 text-right text-xs text-slate-400">
		{formatAmount(Number(item.quoted_cost), item.currency)} /
		{formatAmount(Number(item.quoted_sell), item.currency)}
	</td>
	<td class="px-3 py-2 w-24"><Input type="number" min="0" step="0.01" bind:value={form.actual_cost} /></td>
	<td class="px-3 py-2 w-24"><Input type="number" min="0" step="0.01" bind:value={form.actual_sell} /></td>
	<td class="px-3 py-2 text-right font-medium {liveProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
		{formatAmount(liveProfit, item.currency)}
	</td>
	<td class="px-3 py-2 text-right text-xs {variance >= 0 ? 'text-green-600' : 'text-red-600'}">
		{variance >= 0 ? '+' : ''}{formatAmount(variance, item.currency)}
	</td>
	<td class="px-3 py-2">
		<Button size="sm" variant="secondary" onclick={save} disabled={$update.isPending}>
			<Check class="h-4 w-4" />
		</Button>
	</td>
</tr>
