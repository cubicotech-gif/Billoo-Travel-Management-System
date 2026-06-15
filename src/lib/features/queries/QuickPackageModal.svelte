<script lang="ts">
	import { goto } from '$app/navigation';
	import { Zap } from 'lucide-svelte';
	import { Modal, Button, Input, Select } from '$ui';
	import QuoteBuilder from '$features/quotations/QuoteBuilder.svelte';
	import type { CityBlock, PackageType } from '$lib/database.types';
	import { TRIP_TYPES, isUmrahType, newCity } from './trip';
	import { useCreateQuery } from './queries';
	import { useCreatePassenger } from '$features/passengers/queries';
	import { splitName } from '$features/passengers/types';

	let { open, onClose }: { open: boolean; onClose: () => void } = $props();

	const createQuery = useCreateQuery();
	const createPassenger = useCreatePassenger();

	// Two phases: a stripped-down intake for live calls, then the real calculator
	// embedded right here — no leaving the dashboard, no New→Working buffer.
	let phase = $state<'intake' | 'price'>('intake');
	let createdId = $state<string | null>(null);

	let form = $state({
		name: '',
		whatsapp: '',
		packageType: 'Umrah' as PackageType,
		adults: 1,
		children: 0,
		infants: 0,
		nightsMakkah: 5,
		nightsMadinah: 4,
		country: '',
		nights: 7
	});
	let error = $state<string | null>(null);
	const isUmrah = $derived(isUmrahType(form.packageType));
	const saving = $derived($createPassenger.isPending || $createQuery.isPending);

	function resetForm() {
		form = {
			name: '',
			whatsapp: '',
			packageType: 'Umrah',
			adults: 1,
			children: 0,
			infants: 0,
			nightsMakkah: 5,
			nightsMadinah: 4,
			country: '',
			nights: 7
		};
		error = null;
	}

	function close() {
		phase = 'intake';
		createdId = null;
		resetForm();
		onClose();
	}

	function buildCities(): CityBlock[] {
		if (isUmrah) {
			return [
				{ ...newCity('Makkah'), nights: Number(form.nightsMakkah) || 0 },
				{ ...newCity('Madinah'), nights: Number(form.nightsMadinah) || 0 }
			].filter((c) => c.nights > 0);
		}
		return [{ ...newCity(form.country.trim()), nights: Number(form.nights) || 0 }].filter(
			(c) => c.city && c.nights > 0
		);
	}

	async function start() {
		error = null;
		if (!form.name.trim() || !form.whatsapp.trim()) {
			error = 'Name and WhatsApp number are required.';
			return;
		}
		const cities = buildCities();
		const totalNights = cities.reduce((a, c) => a + c.nights, 0);

		const passenger = await $createPassenger.mutateAsync({
			...splitName(form.name),
			phone: form.whatsapp,
			whatsapp: form.whatsapp
		});

		const nightsFor = (name: string) => cities.find((c) => c.city === name)?.nights ?? null;
		const query = await $createQuery.mutateAsync({
			passenger_id: passenger.id,
			client_name: form.name.trim(),
			client_phone: form.whatsapp,
			status: 'New Query',
			destination: isUmrah ? form.packageType : form.country || form.packageType,
			adults: Number(form.adults),
			children: Number(form.children),
			infants: Number(form.infants),
			package_type: form.packageType,
			trip_country: isUmrah ? null : form.country || null,
			itinerary_cities: cities,
			duration_days: totalNights || null,
			nights_makkah: isUmrah ? nightsFor('Makkah') : null,
			nights_madinah: isUmrah ? nightsFor('Madinah') : null
		});

		createdId = query.id;
		phase = 'price';
	}

	// Saving a quotation promotes the query to Quoted; jump to it to send/track.
	function onPriced() {
		const id = createdId;
		close();
		if (id) goto(`/queries/${id}`);
	}
</script>

<Modal
	{open}
	onClose={close}
	title={phase === 'intake' ? 'Quick Package' : 'Quick Package · price & quote'}
	class={phase === 'price' ? 'max-w-5xl' : 'max-w-lg'}
>
	{#if phase === 'intake'}
		<p class="mb-4 text-sm text-slate-500">
			On a call? Capture the bare minimum and jump straight to pricing — it saves as a passenger
			and a query, ready to quote.
		</p>

		<div class="space-y-4">
			<div class="grid grid-cols-2 gap-3">
				<Input label="Passenger name" bind:value={form.name} placeholder="e.g. Sajjad Rajar" />
				<Input label="WhatsApp number" bind:value={form.whatsapp} placeholder="03xx…" />
			</div>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Select label="Trip type" bind:value={form.packageType} options={[...TRIP_TYPES]} />
				<Input label="Adults" type="number" min="0" bind:value={form.adults} />
				<Input label="Children" type="number" min="0" bind:value={form.children} />
				<Input label="Infants" type="number" min="0" bind:value={form.infants} />
			</div>

			{#if isUmrah}
				<div class="grid grid-cols-2 gap-3">
					<Input label="Nights in Makkah" type="number" min="0" bind:value={form.nightsMakkah} />
					<Input label="Nights in Madinah" type="number" min="0" bind:value={form.nightsMadinah} />
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3">
					<Input label="Country / city" bind:value={form.country} placeholder="e.g. Turkey" />
					<Input label="Nights" type="number" min="0" bind:value={form.nights} />
				</div>
			{/if}

			{#if error}<p class="text-sm text-red-600">{error}</p>{/if}

			<div class="flex justify-end gap-2 pt-1">
				<Button type="button" variant="secondary" onclick={close}>Cancel</Button>
				<Button type="button" onclick={start} disabled={saving}>
					<Zap class="h-4 w-4" /> {saving ? 'Saving…' : 'Build & price'}
				</Button>
			</div>
		</div>
	{:else if createdId}
		{#key createdId}
			<QuoteBuilder queryId={createdId} embedded onSaved={onPriced} />
		{/key}
	{/if}
</Modal>
