<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Input, Modal, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import type { RateItemType } from '$lib/database.types';
	import { useVendors } from '$features/vendors/queries';
	import { useCreateRate, useUpdateRate } from './queries';
	import { HOTEL_CITIES, RATE_TYPE_BY_KEY, type RateCard } from './types';

	interface Props {
		itemType: RateItemType;
		rate?: RateCard | null;
		open: boolean;
		onClose: () => void;
	}

	let { itemType, rate = null, open, onClose }: Props = $props();

	const config = $derived(RATE_TYPE_BY_KEY[itemType]);
	const vendors = useVendors();
	const createRate = useCreateRate();
	const updateRate = useUpdateRate();

	const today = new Date().toISOString().slice(0, 10);

	let form = $state({
		name: '',
		city: 'Makkah',
		vendor_id: '',
		cost_price: 0,
		selling_price: 0,
		occupancy: 2,
		rate_date: today,
		notes: ''
	});

	$effect(() => {
		if (open) {
			const r = untrack(() => rate);
			form = {
				name: r?.name ?? '',
				city: r?.city ?? 'Makkah',
				vendor_id: r?.vendor_id ?? '',
				cost_price: Number(r?.cost_price ?? 0),
				selling_price: Number(r?.selling_price ?? 0),
				occupancy: r?.occupancy ?? 2,
				rate_date: r?.rate_date?.slice(0, 10) ?? today,
				notes: r?.notes ?? ''
			};
		}
	});

	const margin = $derived(Number(form.selling_price) - Number(form.cost_price));
	const saving = $derived($createRate.isPending || $updateRate.isPending);

	const vendorOptions = $derived([
		{ value: '', label: '— no vendor —' },
		...($vendors.data ?? []).map((v) => ({ value: v.id, label: v.name }))
	]);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const payload = {
			item_type: itemType,
			currency: config.currency,
			unit: config.unit,
			name: form.name,
			city: config.hasCity ? form.city : null,
			occupancy: config.hasOccupancy ? Number(form.occupancy) : null,
			vendor_id: form.vendor_id || null,
			cost_price: Number(form.cost_price),
			selling_price: Number(form.selling_price),
			rate_date: form.rate_date,
			notes: form.notes || null
		};
		if (rate) await $updateRate.mutateAsync({ id: rate.id, patch: payload });
		else await $createRate.mutateAsync(payload);
		onClose();
	}
</script>

<Modal {open} {onClose} title={`${rate ? 'Edit' : 'Add'} ${config.label} rate`}>
	<form onsubmit={submit} class="space-y-4">
		<Input label="Name" bind:value={form.name} required placeholder="e.g. Hilton Makkah / Sedan / Umrah visa / Saudia" />
		<div class="grid grid-cols-2 gap-3">
			{#if config.hasCity}
				<Select label="City" bind:value={form.city} options={[...HOTEL_CITIES]} />
			{/if}
			{#if config.hasOccupancy}
				<Input label="Occupancy (persons/room)" type="number" min="1" bind:value={form.occupancy} />
			{/if}
			<Select label="Vendor" bind:value={form.vendor_id} options={vendorOptions} />
			<Input label="Rate date" type="date" bind:value={form.rate_date} />
		</div>
		<div class="grid grid-cols-2 gap-3">
			<Input label={`Cost (${config.currency})`} type="number" min="0" step="0.01" bind:value={form.cost_price} />
			<Input label={`Selling (${config.currency})`} type="number" min="0" step="0.01" bind:value={form.selling_price} />
		</div>
		<div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
			<span class="text-slate-500">Margin ({config.unit})</span>
			<span class="font-semibold {margin >= 0 ? 'text-green-600' : 'text-red-600'}">
				{formatAmount(margin, config.currency)}
			</span>
		</div>
		<div class="flex justify-end gap-2">
			<Button type="button" variant="secondary" onclick={onClose}>Cancel</Button>
			<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
		</div>
	</form>
</Modal>
