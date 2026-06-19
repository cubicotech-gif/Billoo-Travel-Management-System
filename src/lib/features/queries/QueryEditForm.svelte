<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus } from 'lucide-svelte';
	import { Button, Input, Select } from '$ui';
	import type { CityBlock, PackageType } from '$lib/database.types';
	import CityBlockRow from './CityBlock.svelte';
	import { TRIP_TYPES, newCity, seedCities, isUmrahType, nightsForCity, UMRAH_CITIES } from './trip';
	import { useUpdateQuery } from './queries';
	import type { Query } from './types';

	interface Props {
		query: Query;
		onSaved?: () => void;
		onCancel?: () => void;
	}
	let { query, onSaved, onCancel }: Props = $props();

	const update = useUpdateQuery();
	let error = $state<string | null>(null);

	function seed(q: Query) {
		const cities = (q.itinerary_cities ?? []).map((c) => ({ ...c }));
		return {
			clientName: q.client_name,
			clientPhone: q.client_phone,
			packageType: (q.package_type ?? 'Umrah') as PackageType,
			adults: q.adults,
			children: q.children,
			infants: q.infants,
			country: q.trip_country ?? '',
			travelDate: q.travel_date ?? '',
			cities: cities.length ? cities : seedCities((q.package_type ?? 'Umrah') as PackageType),
			customerPlan: q.customer_plan ?? '',
			responded: q.responded ?? false,
			responseText: q.response_text ?? ''
		};
	}

	let form = $state(untrack(() => seed(query)));

	// Reseed if the form is shown for a different query.
	let seededFor = $state(untrack(() => query.id));
	$effect(() => {
		if (query.id !== seededFor) {
			form = seed(query);
			seededFor = query.id;
		}
	});

	const isUmrah = $derived(isUmrahType(form.packageType));
	const isPureUmrah = $derived(form.packageType === 'Umrah');

	function onTripType() {
		form.cities = seedCities(form.packageType);
	}
	function addCity() {
		form.cities.push(newCity(isPureUmrah ? 'Makkah' : ''));
	}
	function removeCity(i: number) {
		form.cities.splice(i, 1);
	}
	function moveCity(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= form.cities.length) return;
		const [moved] = form.cities.splice(i, 1);
		if (moved) form.cities.splice(j, 0, moved);
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		if (!form.clientName.trim() || !form.clientPhone.trim()) {
			error = 'Name and WhatsApp number are required.';
			return;
		}
		const cities: CityBlock[] = form.cities
			.filter((c) => c.city.trim() || Number(c.nights) > 0)
			.map((c) => ({
				city: c.city.trim(),
				arrival_date: c.arrival_date || null,
				nights: Number(c.nights) || 0,
				hotel_preference: c.hotel_preference.trim(),
				activities: Number(c.activities) || 0
			}));
		const totalNights = cities.reduce((a, c) => a + c.nights, 0);
		const hotelPref = cities
			.filter((c) => c.hotel_preference)
			.map((c) => `${c.city}: ${c.hotel_preference}`)
			.join('; ');

		await $update.mutateAsync({
			id: query.id,
			patch: {
				client_name: form.clientName.trim(),
				client_phone: form.clientPhone.trim(),
				package_type: form.packageType,
				destination: form.country || form.packageType,
				trip_country: form.country || null,
				travel_date: form.travelDate || null,
				adults: Number(form.adults),
				children: Number(form.children),
				infants: Number(form.infants),
				itinerary_cities: cities,
				duration_days: totalNights || null,
				nights_makkah: isUmrah ? nightsForCity(cities, 'Makkah') : null,
				nights_madinah: isUmrah ? nightsForCity(cities, 'Madinah') : null,
				hotel_preference: hotelPref || null,
				customer_plan: form.customerPlan || null,
				responded: form.responded,
				response_text: form.responseText || null
			}
		});
		onSaved?.();
	}
</script>

<form onsubmit={submit} class="space-y-4">
	<div class="grid grid-cols-2 gap-3">
		<Input label="Client name" bind:value={form.clientName} required />
		<Input label="WhatsApp number" bind:value={form.clientPhone} required />
	</div>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<Select label="Trip type" bind:value={form.packageType} options={[...TRIP_TYPES]} onchange={onTripType} />
		<Input label="Adults" type="number" min="0" bind:value={form.adults} />
		<Input label="Children" type="number" min="0" bind:value={form.children} />
		<Input label="Infants" type="number" min="0" bind:value={form.infants} />
	</div>

	<div class="grid grid-cols-2 gap-3">
		<Input label="Intended travel date" type="date" bind:value={form.travelDate} />
		{#if !isUmrah}
			<Input label="Country" bind:value={form.country} placeholder="e.g. Turkey" />
		{/if}
	</div>

	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold uppercase text-slate-400">
				{isUmrah ? 'Cities & nights' : 'Itinerary (cities)'}
			</span>
			<Button type="button" size="sm" variant="ghost" onclick={addCity}><Plus class="h-4 w-4" /> City</Button>
		</div>
		{#each form.cities as block, i (i)}
			<CityBlockRow
				{block}
				cityChoices={isPureUmrah ? [...UMRAH_CITIES] : undefined}
				showArrival={!isUmrah}
				showActivities={!isUmrah}
				onRemove={form.cities.length > 1 ? () => removeCity(i) : undefined}
				onMoveUp={() => moveCity(i, -1)}
				onMoveDown={() => moveCity(i, 1)}
				disableUp={i === 0}
				disableDown={i === form.cities.length - 1}
			/>
		{/each}
	</div>

	<div>
		<span class="mb-1 block text-sm font-medium text-slate-700">Response given</span>
		<textarea bind:value={form.responseText} rows="5" placeholder="What you told the client…" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"></textarea>
	</div>

	<label class="flex items-center gap-2 text-sm text-slate-700">
		<input type="checkbox" bind:checked={form.responded} class="rounded border-slate-300" /> Responded to the client
	</label>

	{#if error}<p class="text-sm text-red-600">{error}</p>{/if}

	<div class="flex justify-end gap-2 border-t border-slate-100 pt-3">
		{#if onCancel}
			<Button type="button" variant="secondary" onclick={onCancel}>Cancel</Button>
		{/if}
		<Button type="submit" disabled={$update.isPending}>{$update.isPending ? 'Saving…' : 'Save changes'}</Button>
	</div>
</form>
