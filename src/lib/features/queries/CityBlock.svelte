<script lang="ts">
	import { Trash2 } from 'lucide-svelte';
	import { Input } from '$ui';
	import type { CityBlock } from '$lib/database.types';

	interface Props {
		block: CityBlock;
		cityEditable?: boolean;
		showArrival?: boolean;
		showActivities?: boolean;
		onRemove?: () => void;
	}

	// `block` is a reactive proxy from the parent's $state — mutating its fields
	// propagates without needing $bindable.
	let { block, cityEditable = true, showArrival = false, showActivities = false, onRemove }: Props =
		$props();
</script>

<div class="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
	<div class="flex flex-wrap items-end gap-2">
		{#if cityEditable}
			<div class="w-40"><Input label="City" bind:value={block.city} placeholder="e.g. Istanbul" /></div>
		{:else}
			<div class="w-32">
				<span class="mb-1 block text-sm font-medium text-slate-700">City</span>
				<div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">{block.city}</div>
			</div>
		{/if}
		{#if showArrival}
			<div class="w-40"><Input label="Arrival" type="date" bind:value={block.arrival_date} /></div>
		{/if}
		<div class="w-20"><Input label="Nights" type="number" min="0" bind:value={block.nights} /></div>
		{#if showActivities}
			<div class="w-24"><Input label="Activities" type="number" min="0" bind:value={block.activities} /></div>
		{/if}
		<div class="min-w-40 flex-1"><Input label="Hotel preference" bind:value={block.hotel_preference} placeholder="hotel / distance from Haram" /></div>
		{#if onRemove}
			<button type="button" onclick={onRemove} class="mb-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove city">
				<Trash2 class="h-4 w-4" />
			</button>
		{/if}
	</div>
</div>
