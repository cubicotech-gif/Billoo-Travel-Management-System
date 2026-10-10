<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Card, Input, Select } from '$ui';
	import { useCreatePassenger, usePassengers } from '$features/passengers/queries';
	import { fullName, splitName } from '$features/passengers/types';
	import type { Query } from '$features/queries/types';
	import { baseCost } from './calc';
	import PackageFields from './PackageFields.svelte';
	import { defaultSelection, type Selection } from './selection';
	import { useAddHajjTraveller } from './queries';
	import type { HajjCatalogue, HajjPackage, HajjTraveller } from './types';

	interface Props {
		query: Query;
		packages: HajjPackage[];
		catalogues: HajjCatalogue[];
		travellers: HajjTraveller[];
		onDone: () => void;
	}
	let { query, packages, catalogues, travellers, onDone }: Props = $props();

	const passengers = untrack(() => usePassengers());
	const createPassenger = untrack(() => useCreatePassenger());
	const addTraveller = untrack(() => useAddHajjTraveller(query.id));

	const first = $derived(travellers[0]);

	// Start from the family's package (so a family defaults to the same choice),
	// else the first package of the first price list.
	function initialSelection(): Selection | null {
		const lead = untrack(() => first);
		const lp = lead ? packages.find((p) => p.id === lead.package_id) : undefined;
		if (lead && lp)
			return {
				catalogueId: lp.catalogue_id,
				packageId: lp.id,
				option: lead.option_code,
				room: lead.room_type
			};
		return defaultSelection(packages, catalogues);
	}
	let selection = $state<Selection | null>(untrack(initialSelection));

	const onFamilyAlready = $derived(new Set(travellers.map((t) => t.passenger_id)));
	// The very first traveller is normally the client who made the query.
	let mode = $state<'existing' | 'new'>(
		untrack(() => (travellers.length === 0 && query.passenger_id ? 'existing' : 'new'))
	);
	let existingId = $state(untrack(() => (travellers.length === 0 ? (query.passenger_id ?? '') : '')));
	let newName = $state(untrack(() => (travellers.length === 0 ? query.client_name : '')));
	let newPhone = $state(untrack(() => query.client_phone));
	let gender = $state<'' | 'male' | 'female'>('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	const passengerOptions = $derived([
		{ value: '', label: '— select passenger —' },
		...($passengers.data ?? [])
			.filter((p) => !onFamilyAlready.has(p.id))
			.map((p) => ({ value: p.id, label: `${fullName(p)} · ${p.phone}` }))
	]);

	async function submit() {
		error = null;
		if (!selection) {
			error = 'Choose a package first.';
			return;
		}
		const pkg = packages.find((p) => p.id === selection?.packageId);
		const cost = baseCost(pkg, selection.option, selection.room);
		if (cost === null) {
			error = 'That package has no price for the chosen option and room.';
			return;
		}
		busy = true;
		try {
			let passengerId: string;
			if (mode === 'existing') {
				if (!existingId) throw new Error('Choose an existing passenger.');
				passengerId = existingId;
			} else {
				if (!newName.trim() || !newPhone.trim())
					throw new Error('A new traveller needs a name and a phone number.');
				const created = await $createPassenger.mutateAsync({
					...splitName(newName),
					phone: newPhone.trim(),
					gender: gender || null
				});
				passengerId = created.id;
			}
			await $addTraveller.mutateAsync({
				query_id: query.id,
				passenger_id: passengerId,
				is_lead: travellers.length === 0,
				package_id: selection.packageId,
				option_code: selection.option,
				room_type: selection.room,
				sell_price: cost, // start at cost; staff adds the markup
				sort_order: travellers.length
			});
			onDone();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not add the traveller.';
		} finally {
			busy = false;
		}
	}
</script>

<Card title={travellers.length === 0 ? 'Add the first traveller' : 'Add a family member'}>
	<div class="space-y-4">
		<div class="inline-flex rounded-lg bg-slate-100 p-0.5">
			<button
				type="button"
				onclick={() => (mode = 'new')}
				class="rounded-md px-3 py-1.5 text-sm font-medium {mode === 'new'
					? 'bg-white text-brand-700 shadow-sm'
					: 'text-slate-500'}">New passenger</button
			>
			<button
				type="button"
				onclick={() => (mode = 'existing')}
				class="rounded-md px-3 py-1.5 text-sm font-medium {mode === 'existing'
					? 'bg-white text-brand-700 shadow-sm'
					: 'text-slate-500'}">Existing passenger</button
			>
		</div>

		{#if mode === 'new'}
			<div class="grid gap-3 sm:grid-cols-3">
				<Input label="Full name" bind:value={newName} placeholder="As on passport" />
				<Input label="Phone / WhatsApp" bind:value={newPhone} />
				<Select
					label="Gender"
					bind:value={gender}
					options={[
						{ value: '', label: '—' },
						{ value: 'male', label: 'Male' },
						{ value: 'female', label: 'Female' }
					]}
				/>
			</div>
		{:else}
			<Select label="Passenger" bind:value={existingId} options={passengerOptions} />
		{/if}

		{#if selection}
			<PackageFields {selection} {packages} {catalogues} onchange={(s) => (selection = s)} />
		{:else}
			<p class="text-sm text-amber-700">
				The Hajj catalogue is empty — run the 2027 seed (database/seeds/hajj-2027-catalogue.sql).
			</p>
		{/if}

		{#if error}<p class="text-sm text-red-600">{error}</p>{/if}
		<div class="flex gap-2">
			<Button disabled={busy || !selection} onclick={submit}>{busy ? 'Adding…' : 'Add traveller'}</Button>
			<Button variant="ghost" onclick={onDone}>Cancel</Button>
		</div>
	</div>
</Card>
