<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Input, Modal, Select } from '$ui';
	import type { Currency, MealPlan, ObsRoomType, RateObservationSource } from '$lib/database.types';
	import { useHotels } from '$features/hotels/queries';
	import { useVendors } from '$features/vendors/queries';
	import { useCreateObservation, useUpdateObservation } from './queries';
	import type { RateObservation } from './observations';

	interface Props {
		observation: RateObservation | null; // null = add new
		open: boolean;
		onClose: () => void;
	}
	let { observation, open, onClose }: Props = $props();

	const hotels = useHotels();
	const vendors = useVendors();
	const create = useCreateObservation();
	const update = useUpdateObservation();
	let error = $state<string | null>(null);

	const ROOM_TYPES: (ObsRoomType | '')[] = ['', 'double', 'triple', 'quad', 'sharing', 'custom'];
	const MEALS: MealPlan[] = ['RO', 'BB', 'HB', 'FB'];
	const SOURCES: RateObservationSource[] = [
		'manual_entry',
		'rate_sheet_import',
		'workshop_capture',
		'suggestion_accepted',
		'backfill_quotations'
	];

	let form = $state({
		hotel_id: '',
		vendor_id: '',
		room_type: '' as ObsRoomType | '',
		occupancy: 0,
		meal_plan: 'RO' as MealPlan,
		rate: 0,
		currency: 'SAR' as Currency,
		check_in: '',
		check_out: '',
		source: 'manual_entry' as RateObservationSource,
		needsVerify: false,
		invalidated: false,
		invalidated_reason: '',
		notes: ''
	});

	$effect(() => {
		if (!open) return;
		const o = untrack(() => observation);
		const rawNotes = o?.notes ?? '';
		const verify = rawNotes.startsWith('VERIFY:');
		form = {
			hotel_id: o?.hotel_id ?? '',
			vendor_id: o?.vendor_id ?? '',
			room_type: (o?.room_type ?? '') as ObsRoomType | '',
			occupancy: o?.occupancy ?? 0,
			meal_plan: (o?.meal_plan ?? 'RO') as MealPlan,
			rate: o ? Number(o.rate) : 0,
			currency: (o?.currency ?? 'SAR') as Currency,
			check_in: o?.check_in ?? '',
			check_out: o?.check_out ?? '',
			source: (o?.source ?? 'manual_entry') as RateObservationSource,
			needsVerify: verify,
			invalidated: o?.invalidated ?? false,
			invalidated_reason: o?.invalidated_reason ?? '',
			notes: verify ? rawNotes.replace(/^VERIFY:\s*/, '') : rawNotes
		};
	});

	const hotelOptions = $derived([
		{ value: '', label: '— select hotel —' },
		...($hotels.data ?? []).map((h) => ({ value: h.id, label: `${h.name} · ${h.city}` }))
	]);
	const vendorOptions = $derived([
		{ value: '', label: 'Own / unspecified' },
		...($vendors.data ?? []).map((v) => ({ value: v.id, label: v.name }))
	]);

	const saving = $derived($create.isPending || $update.isPending);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		if (!form.hotel_id) {
			error = 'Pick a hotel.';
			return;
		}
		if (!(Number(form.rate) > 0)) {
			error = 'Enter a rate greater than zero.';
			return;
		}
		const cleanNote = form.notes.trim();
		const notes = form.needsVerify ? `VERIFY: ${cleanNote}`.trim() : cleanNote || null;
		const patch = {
			hotel_id: form.hotel_id,
			vendor_id: form.vendor_id || null,
			room_type: form.room_type || null,
			occupancy: Number(form.occupancy) || null,
			meal_plan: form.meal_plan,
			rate: Number(form.rate),
			currency: form.currency,
			check_in: form.check_in || null,
			check_out: form.check_out || null,
			source: form.source,
			invalidated: form.invalidated,
			invalidated_reason: form.invalidated ? form.invalidated_reason || null : null,
			notes
		};
		if (observation) await $update.mutateAsync({ id: observation.id, patch });
		else await $create.mutateAsync(patch);
		onClose();
	}
</script>

<Modal {open} {onClose} title={observation ? 'Edit rate' : 'Add rate'} class="max-w-xl">
	<form onsubmit={submit} class="space-y-4">
		<Select label="Hotel" bind:value={form.hotel_id} options={hotelOptions} />
		<div class="grid grid-cols-2 gap-3">
			<Select label="Vendor" bind:value={form.vendor_id} options={vendorOptions} />
			<Select
				label="Source"
				bind:value={form.source}
				options={SOURCES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
			/>
		</div>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<Select
				label="Room type"
				bind:value={form.room_type}
				options={ROOM_TYPES.map((r) => ({ value: r, label: r || '—' }))}
			/>
			<Input label="Occupancy" type="number" min="0" bind:value={form.occupancy} />
			<Select label="Meal plan" bind:value={form.meal_plan} options={MEALS.map((m) => ({ value: m, label: m }))} />
			<Select
				label="Currency"
				bind:value={form.currency}
				options={[
					{ value: 'SAR', label: 'SAR' },
					{ value: 'PKR', label: 'PKR' }
				]}
			/>
		</div>
		<div class="grid grid-cols-3 gap-3">
			<Input label="Rate" type="number" min="0" step="0.01" bind:value={form.rate} />
			<Input label="Valid from" type="date" bind:value={form.check_in} />
			<Input label="Valid to" type="date" bind:value={form.check_out} />
		</div>
		<div>
			<span class="mb-1 block text-sm font-medium text-slate-700">Notes</span>
			<textarea
				bind:value={form.notes}
				rows="2"
				placeholder="Optional context…"
				class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
			></textarea>
		</div>
		<div class="flex flex-wrap gap-x-6 gap-y-2">
			<label class="flex items-center gap-2 text-sm text-slate-700">
				<input type="checkbox" bind:checked={form.needsVerify} class="rounded border-slate-300" /> Needs verification
			</label>
			<label class="flex items-center gap-2 text-sm text-slate-700">
				<input type="checkbox" bind:checked={form.invalidated} class="rounded border-slate-300" /> Invalidated (excluded)
			</label>
		</div>
		{#if form.invalidated}
			<Input label="Reason for invalidating" bind:value={form.invalidated_reason} placeholder="e.g. stale, wrong vendor" />
		{/if}

		{#if error}<p class="text-sm text-red-600">{error}</p>{/if}

		<div class="flex justify-end gap-2 border-t border-slate-100 pt-3">
			<Button type="button" variant="secondary" onclick={onClose}>Cancel</Button>
			<Button type="submit" disabled={saving}>{saving ? 'Saving…' : observation ? 'Save changes' : 'Add rate'}</Button>
		</div>
	</form>
</Modal>
