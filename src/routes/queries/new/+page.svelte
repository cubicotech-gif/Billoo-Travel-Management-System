<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Settings2, Plus } from 'lucide-svelte';
	import { Button, Card, Input, Select } from '$ui';
	import type { CityBlock, PackageType } from '$lib/database.types';
	import { useStaff } from '$features/staff/queries';
	import StaffManagerModal from '$features/staff/StaffManagerModal.svelte';
	import CityBlockRow from '$features/queries/CityBlock.svelte';
	import { TRIP_TYPES, newCity, seedCities, isUmrahType, nightsForCity, UMRAH_CITIES } from '$features/queries/trip';
	import { usePassengers, useCreatePassenger } from '$features/passengers/queries';
	import { fullName, splitName } from '$features/passengers/types';
	import { useCreateQuery } from '$features/queries/queries';

	const staff = useStaff();
	const passengers = usePassengers();
	const createPassenger = useCreatePassenger();
	const createQuery = useCreateQuery();

	let staffModalOpen = $state(false);

	let form = $state({
		createdBy: '',
		// passenger
		passengerMode: 'new' as 'new' | 'existing',
		existingPassengerId: '',
		newName: '',
		newWhatsapp: '',
		// counts + package
		adults: 1,
		children: 0,
		infants: 0,
		packageType: 'Umrah' as PackageType,
		travelDate: '',
		country: '',
		cities: seedCities('Umrah') as CityBlock[],
		// capture
		customerPlan: '',
		// initial response
		responded: false,
		responseText: ''
	});

	const isUmrah = $derived(isUmrahType(form.packageType));
	// Pure Umrah only visits the two holy cities → offer them as a dropdown.
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

	const staffOptions = $derived([
		{ value: '', label: '— select staff —' },
		...($staff.data ?? []).map((s) => ({ value: s.name, label: s.name }))
	]);

	const passengerOptions = $derived([
		{ value: '', label: '— select passenger —' },
		...($passengers.data ?? []).map((p) => ({ value: p.id, label: `${fullName(p)} · ${p.phone}` }))
	]);

	let error = $state<string | null>(null);
	const saving = $derived($createPassenger.isPending || $createQuery.isPending);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = null;

		// Resolve the passenger: pick existing, or auto-create a new profile.
		let passengerId: string;
		let clientName: string;
		let clientPhone: string;

		if (form.passengerMode === 'existing') {
			const p = ($passengers.data ?? []).find((x) => x.id === form.existingPassengerId);
			if (!p) {
				error = 'Please choose an existing passenger.';
				return;
			}
			passengerId = p.id;
			clientName = fullName(p);
			clientPhone = p.phone;
		} else {
			if (!form.newName.trim() || !form.newWhatsapp.trim()) {
				error = 'New passenger needs a name and WhatsApp number.';
				return;
			}
			const created = await $createPassenger.mutateAsync({
				...splitName(form.newName),
				phone: form.newWhatsapp,
				whatsapp: form.newWhatsapp
			});
			passengerId = created.id;
			clientName = fullName(created);
			clientPhone = created.phone;
		}

		// Normalise the city blocks and derive the legacy fields the builder reads.
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

		const query = await $createQuery.mutateAsync({
			passenger_id: passengerId,
			client_name: clientName,
			client_phone: clientPhone,
			status: 'New Query',
			destination: form.country || form.packageType,
			travel_date: form.travelDate || null,
			created_by_staff: form.createdBy || null,
			adults: Number(form.adults),
			children: Number(form.children),
			infants: Number(form.infants),
			package_type: form.packageType,
			trip_country: form.country || null,
			itinerary_cities: cities,
			duration_days: totalNights || null,
			nights_makkah: isUmrah ? nightsForCity(cities, 'Makkah') : null,
			nights_madinah: isUmrah ? nightsForCity(cities, 'Madinah') : null,
			hotel_preference: hotelPref || null,
			customer_plan: form.customerPlan || null,
			responded: form.responded,
			response_text: form.responseText || null
		});

		goto(`/queries/${query.id}`);
	}
</script>

<a href="/queries" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
	<ArrowLeft class="h-4 w-4" /> Back to queries
</a>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-slate-800">New Query</h1>
	<p class="text-sm text-slate-500">Capture the enquiry — structured fields are optional, dump a note if you're in a hurry.</p>
</div>

<form onsubmit={submit} class="space-y-6">
	<!-- Who + passenger -->
	<Card title="Who">
		<div class="space-y-4">
			<div class="flex items-end gap-2">
				<div class="w-56">
					<Select label="Created by (staff)" bind:value={form.createdBy} options={staffOptions} />
				</div>
				<Button type="button" variant="ghost" onclick={() => (staffModalOpen = true)}>
					<Settings2 class="h-4 w-4" /> Manage
				</Button>
			</div>

			<div class="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
				<button type="button" onclick={() => (form.passengerMode = 'new')}
					class="rounded-md px-3 py-1.5 text-sm font-medium {form.passengerMode === 'new' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}">
					New passenger
				</button>
				<button type="button" onclick={() => (form.passengerMode = 'existing')}
					class="rounded-md px-3 py-1.5 text-sm font-medium {form.passengerMode === 'existing' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}">
					Existing passenger
				</button>
			</div>

			{#if form.passengerMode === 'new'}
				<div class="grid grid-cols-2 gap-3">
					<Input label="Passenger name" bind:value={form.newName} placeholder="e.g. Sajjad Rajar" />
					<Input label="WhatsApp number" bind:value={form.newWhatsapp} placeholder="03xx…" />
				</div>
			{:else}
				<Select label="Passenger" bind:value={form.existingPassengerId} options={passengerOptions} />
			{/if}
		</div>
	</Card>

	<!-- Trip basics -->
	<Card title="Trip">
		<div class="space-y-4">
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

			<!-- City blocks: holy cities for Umrah, + extra city for Umrah Plus,
			     free multi-city for Tour/Leisure. -->
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold uppercase text-slate-400">
						{isUmrah ? 'Cities & nights' : 'Itinerary (cities)'}
					</span>
					<Button type="button" size="sm" variant="ghost" onclick={addCity}><Plus class="h-4 w-4" /> City</Button>
				</div>
				{#if isPureUmrah}
					<p class="text-xs text-slate-400">Reorder or repeat cities — e.g. Madinah first, or Makkah → Madinah → Makkah on a long package.</p>
				{/if}
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
		</div>
	</Card>

	<!-- Customer's own plan -->
	<Card title="Customer's plan">
		<div>
			<span class="mb-1 block text-sm font-medium text-slate-700">Customer's own plan (pasted)</span>
			<textarea bind:value={form.customerPlan} rows="4" placeholder="Paste the customer's WhatsApp plan here…"
				class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"></textarea>
		</div>
	</Card>

	<!-- Initial response -->
	<Card title="Initial response (optional)">
		<div class="space-y-4">
			<label class="flex items-center gap-2 text-sm text-slate-700">
				<input type="checkbox" bind:checked={form.responded} class="rounded border-slate-300" />
				Already responded to the client
			</label>
			<div>
				<span class="mb-1 block text-sm font-medium text-slate-700">Response given</span>
				<textarea bind:value={form.responseText} rows="6" placeholder="What you told the client…"
					class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"></textarea>
			</div>
		</div>
	</Card>

	{#if error}<p class="text-sm text-red-600">{error}</p>{/if}

	<div class="flex justify-end gap-2">
		<Button type="button" variant="secondary" onclick={() => goto('/queries')}>Cancel</Button>
		<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save query'}</Button>
	</div>
</form>

<StaffManagerModal open={staffModalOpen} onClose={() => (staffModalOpen = false)} />
