<script lang="ts">
	import { Search, Plus, Check } from 'lucide-svelte';
	import { Select } from '$ui';
	import type { HotelCity } from '$lib/database.types';
	import { useHotels, useCreateHotel } from './queries';
	import { cityLabel, cityToEnum, hotelMatches, HOTEL_CITY_OPTIONS, type Hotel } from './types';

	interface Props {
		hotelId: string;
		name: string;
		city: string;
		label?: string;
		/** Fired after a hotel is chosen/created (parent repopulates rates). */
		onPicked?: () => void;
	}

	let {
		hotelId = $bindable(''),
		name = $bindable(''),
		city = $bindable(''),
		label = 'Hotel',
		onPicked
	}: Props = $props();

	const hotels = useHotels();
	const createHotel = useCreateHotel();

	let open = $state(false);
	let query = $state(name);
	let adding = $state(false);
	let newName = $state('');
	let newCity = $state<HotelCity>('makkah');

	// Mirror the external name into the search box while the dropdown is closed.
	$effect(() => {
		if (!open) query = name;
	});

	const matches = $derived(
		($hotels.data ?? []).filter((h) => hotelMatches(h, query)).slice(0, 8)
	);

	function choose(h: Hotel) {
		hotelId = h.id;
		name = h.name;
		city = cityLabel(h.city);
		query = h.name;
		open = false;
		adding = false;
		onPicked?.();
	}
	function close() {
		open = false;
		adding = false;
		query = name;
	}
	function startAdd() {
		adding = true;
		newName = query.trim();
		newCity = city ? cityToEnum(city) : 'makkah';
	}
	async function create() {
		const n = newName.trim();
		if (!n) return;
		const h = await $createHotel.mutateAsync({ name: n, city: newCity });
		choose(h);
	}
</script>

<div class="relative">
	<span class="mb-1 block text-sm font-medium text-slate-700">{label}</span>
	<div class="relative">
		<Search class="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
		<input
			bind:value={query}
			onfocus={() => (open = true)}
			oninput={() => (open = true)}
			placeholder="Search hotel or alias…"
			class="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
		/>
	</div>

	{#if open}
		<!-- backdrop: an outside click closes the dropdown -->
		<button type="button" class="fixed inset-0 z-10 cursor-default" aria-label="Close" onclick={close}></button>
		<div class="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
			{#if adding}
				<div class="space-y-2 p-3">
					<span class="text-xs font-semibold uppercase text-slate-400">New hotel</span>
					<input
						bind:value={newName}
						placeholder="Hotel name"
						class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
					/>
					<Select label="City" bind:value={newCity} options={HOTEL_CITY_OPTIONS} />
					<div class="flex justify-end gap-2">
						<button type="button" class="text-xs text-slate-400 hover:text-slate-600" onclick={() => (adding = false)}>Cancel</button>
						<button
							type="button"
							onclick={create}
							disabled={$createHotel.isPending || !newName.trim()}
							class="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
						>
							<Check class="h-4 w-4" /> Add
						</button>
					</div>
				</div>
			{:else}
				<ul class="max-h-64 overflow-auto py-1">
					{#each matches as h (h.id)}
						<li>
							<button
								type="button"
								onclick={() => choose(h)}
								class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 {h.id === hotelId ? 'bg-brand-50' : ''}"
							>
								<span class="text-slate-700">{h.name}</span>
								<span class="text-xs capitalize text-slate-400">{h.city}</span>
							</button>
						</li>
					{:else}
						<li class="px-3 py-2 text-sm text-slate-400">No match.</li>
					{/each}
				</ul>
				<button
					type="button"
					onclick={startAdd}
					class="flex w-full items-center gap-1 border-t border-slate-100 px-3 py-2 text-left text-sm text-brand-700 hover:bg-brand-50"
				>
					<Plus class="h-4 w-4" /> Add new hotel{query.trim() ? ` “${query.trim()}”` : ''}
				</button>
			{/if}
		</div>
	{/if}
</div>
