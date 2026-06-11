<script lang="ts">
	import { Select } from '$ui';
	import { useRates } from '$features/rates/queries';
	import { latestRates, distinctHotels } from '$features/rates/types';

	interface Props {
		city: string;
		value: string;
		label?: string;
		/** Fired when a hotel is chosen; `saved` is true for a DB-backed pick. */
		onPick?: (saved: boolean) => void;
	}

	let { city, value = $bindable(), label = 'Hotel', onPick }: Props = $props();

	const MANUAL = '__manual__';
	const rates = useRates();
	const pool = $derived(latestRates($rates.data ?? []));
	const saved = $derived(distinctHotels(pool, city).map((h) => h.name));

	// Show the free-text input when the current value isn't a saved hotel.
	let manual = $state(false);
	let touched = $state(false);
	$effect(() => {
		if (touched) return;
		manual = !!value && !saved.includes(value);
	});

	const options = $derived([
		{ value: '', label: '— select hotel —' },
		...saved.map((n) => ({ value: n, label: n })),
		{ value: MANUAL, label: '✏️ Type new hotel…' }
	]);

	function onSelect() {
		touched = true;
		if (value === MANUAL) {
			manual = true;
			value = '';
			return;
		}
		if (value) onPick?.(true);
	}
	function pickSaved() {
		manual = false;
		touched = true;
		value = '';
	}
</script>

{#if manual}
	<div class="space-y-1">
		<span class="mb-1 block text-sm font-medium text-slate-700">{label} (new — auto-saved)</span>
		<input
			bind:value
			placeholder="Type hotel name"
			class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
		/>
		{#if saved.length}
			<button type="button" class="text-xs text-slate-400 hover:text-slate-600" onclick={pickSaved}>↩ pick a saved hotel</button>
		{/if}
	</div>
{:else}
	<Select {label} bind:value {options} onchange={onSelect} />
{/if}
