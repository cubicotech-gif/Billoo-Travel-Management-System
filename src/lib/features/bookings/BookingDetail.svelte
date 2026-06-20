<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus } from 'lucide-svelte';
	import { Button, Input, Select } from '$ui';
	import type { Currency, QuotationLineType } from '$lib/database.types';
	import { useVendors } from '$features/vendors/queries';
	import { useUploadDocument } from '$features/documents/queries';
	import type { DocumentType } from '$features/documents/api';
	import { useBookingItems, useCreateBookingItem, useUpdateBookingRates } from './queries';
	import BookingItemRow from './BookingItemRow.svelte';
	import type { Booking } from './types';

	// `booking` is stable for this instance (parent keys on booking.id).
	let { booking, queryId }: { booking: Booking; queryId: string } = $props();

	const items = untrack(() => useBookingItems(booking.id));
	const vendors = useVendors();
	const createItem = untrack(() => useCreateBookingItem(queryId));
	const updateRates = untrack(() => useUpdateBookingRates(queryId));

	// Conversion rates (mirrors the quotation builder): SAR and USD -> PKR.
	let rates = $state(untrack(() => ({ roe: Number(booking.roe) || 0, usd: Number(booking.usd_rate ?? 0) || 0 })));
	const ratesDirty = $derived(
		rates.roe !== (Number(booking.roe) || 0) || rates.usd !== (Number(booking.usd_rate ?? 0) || 0)
	);
	function saveRates() {
		$updateRates.mutate({ booking, roe: Number(rates.roe), usdRate: Number(rates.usd) });
	}

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

	// After a service is added, prompt to attach its invoice/voucher (or skip).
	const uploadDoc = untrack(() => useUploadDocument('query', queryId));
	let pending = $state<{ label: string } | null>(null);
	let docType = $state<DocumentType>('invoice');
	let docInput = $state<HTMLInputElement | null>(null);

	function addService(e: SubmitEvent) {
		e.preventDefault();
		const label = add.label.trim() || add.line_type;
		$createItem.mutate(
			{
				booking,
				input: {
					line_type: add.line_type,
					label,
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
					pending = { label };
				}
			}
		);
	}

	function onDocPick(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (files?.length) {
			for (const file of Array.from(files)) {
				$uploadDoc.mutate({ file, entityType: 'query', entityId: queryId, documentType: docType });
			}
			pending = null;
		}
		input.value = '';
	}
</script>

<!-- Conversion rates: SAR & USD components convert to PKR through these. -->
<div class="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
	<div class="w-36"><Input label="ROE (1 SAR = PKR)" type="number" min="0" step="0.01" bind:value={rates.roe} /></div>
	<div class="w-36"><Input label="USD (1 USD = PKR)" type="number" min="0" step="0.01" bind:value={rates.usd} /></div>
	<Button size="sm" variant={ratesDirty ? 'primary' : 'secondary'} onclick={saveRates} disabled={!ratesDirty || $updateRates.isPending}>
		{$updateRates.isPending ? 'Saving…' : 'Save rates'}
	</Button>
	<p class="text-xs text-slate-400">Tickets are usually PKR; hotels/transfers/visa SAR. Saving re-rolls the PKR totals.</p>
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

	{#if pending}
		<div class="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 p-2.5">
			<span class="text-sm text-slate-600">Upload the <span class="font-medium">{pending.label}</span> document?</span>
			<div class="w-28"><Select bind:value={docType} options={['invoice', 'voucher', 'ticket', 'other']} /></div>
			<Button type="button" size="sm" onclick={() => docInput?.click()}>Choose file</Button>
			<button type="button" onclick={() => (pending = null)} class="text-xs text-slate-500 hover:text-slate-700">Upload later</button>
			<input bind:this={docInput} type="file" multiple class="hidden" onchange={onDocPick} />
		</div>
	{/if}
</form>
<p class="mt-2 text-xs text-slate-400">
	SAR components convert at ROE {booking.roe}. A row's cost + selected vendor post to that vendor's account automatically.
</p>
