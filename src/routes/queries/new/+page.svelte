<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Settings2 } from 'lucide-svelte';
	import { Button, Card, Input, Select } from '$ui';
	import type { PackageType } from '$lib/database.types';
	import { useStaff } from '$features/staff/queries';
	import StaffManagerModal from '$features/staff/StaffManagerModal.svelte';
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
		durationDays: '' as number | '',
		nightsMakkah: '' as number | '',
		nightsMadinah: '' as number | '',
		hotelPreference: '',
		clientPreference: '',
		// capture modes
		customerPlan: '',
		quickNote: '',
		// initial response
		responded: false,
		responseText: '',
		initialQuotation: ''
	});

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

		const query = await $createQuery.mutateAsync({
			passenger_id: passengerId,
			client_name: clientName,
			client_phone: clientPhone,
			status: 'New Query',
			destination: form.packageType, // package type doubles as destination label
			created_by_staff: form.createdBy || null,
			adults: Number(form.adults),
			children: Number(form.children),
			infants: Number(form.infants),
			package_type: form.packageType,
			duration_days: form.durationDays === '' ? null : Number(form.durationDays),
			nights_makkah: form.nightsMakkah === '' ? null : Number(form.nightsMakkah),
			nights_madinah: form.nightsMadinah === '' ? null : Number(form.nightsMadinah),
			hotel_preference: form.hotelPreference || null,
			client_preference: form.clientPreference || null,
			customer_plan: form.customerPlan || null,
			quick_note: form.quickNote || null,
			responded: form.responded,
			response_text: form.responseText || null,
			initial_quotation: form.initialQuotation || null
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
				<Select label="Package" bind:value={form.packageType} options={['Umrah', 'Tour', 'Leisure']} />
				<Input label="Adults" type="number" min="0" bind:value={form.adults} />
				<Input label="Children" type="number" min="0" bind:value={form.children} />
				<Input label="Infants" type="number" min="0" bind:value={form.infants} />
			</div>
			<div class="grid grid-cols-3 gap-3">
				<Input label="Total duration (days)" type="number" min="0" bind:value={form.durationDays} />
				<Input label="Nights — Makkah" type="number" min="0" bind:value={form.nightsMakkah} />
				<Input label="Nights — Madinah" type="number" min="0" bind:value={form.nightsMadinah} />
			</div>
			<Input label="Hotel / distance preference" bind:value={form.hotelPreference} placeholder="e.g. within 300m of Haram" />
			<Input label="Client preference / special requirements" bind:value={form.clientPreference} />
		</div>
	</Card>

	<!-- Flexible capture -->
	<Card title="Capture (any combination)">
		<div class="space-y-4">
			<div>
				<span class="mb-1 block text-sm font-medium text-slate-700">Customer's own plan (pasted)</span>
				<textarea bind:value={form.customerPlan} rows="3" placeholder="Paste the customer's WhatsApp plan here…"
					class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"></textarea>
			</div>
			<div>
				<span class="mb-1 block text-sm font-medium text-slate-700">Quick / informal note</span>
				<textarea bind:value={form.quickNote} rows="2" placeholder="Dump the request informally…"
					class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"></textarea>
			</div>
		</div>
	</Card>

	<!-- Initial response -->
	<Card title="Initial response (optional)">
		<div class="space-y-4">
			<label class="flex items-center gap-2 text-sm text-slate-700">
				<input type="checkbox" bind:checked={form.responded} class="rounded border-slate-300" />
				Already responded to the client
			</label>
			<Input label="Response given" bind:value={form.responseText} />
			<Input label="Initial quotation (text)" bind:value={form.initialQuotation} />
		</div>
	</Card>

	{#if error}<p class="text-sm text-red-600">{error}</p>{/if}

	<div class="flex justify-end gap-2">
		<Button type="button" variant="secondary" onclick={() => goto('/queries')}>Cancel</Button>
		<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save query'}</Button>
	</div>
</form>

<StaffManagerModal open={staffModalOpen} onClose={() => (staffModalOpen = false)} />
