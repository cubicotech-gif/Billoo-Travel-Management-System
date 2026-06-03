<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Input, Modal } from '$ui';
	import { useCreatePassenger, useUpdatePassenger } from './queries';
	import type { Passenger } from './types';

	interface Props {
		passenger?: Passenger | null;
		open: boolean;
		onClose: () => void;
	}

	let { passenger = null, open, onClose }: Props = $props();

	const createPassenger = useCreatePassenger();
	const updatePassenger = useUpdatePassenger();

	let form = $state({
		first_name: '',
		last_name: '',
		phone: '',
		whatsapp: '',
		email: '',
		cnic: '',
		city: '',
		passport_number: '',
		passport_expiry: '',
		notes: ''
	});

	$effect(() => {
		if (open) {
			const p = untrack(() => passenger);
			form = {
				first_name: p?.first_name ?? '',
				last_name: p?.last_name ?? '',
				phone: p?.phone ?? '',
				whatsapp: p?.whatsapp ?? '',
				email: p?.email ?? '',
				cnic: p?.cnic ?? '',
				city: p?.city ?? '',
				passport_number: p?.passport_number ?? '',
				passport_expiry: p?.passport_expiry?.slice(0, 10) ?? '',
				notes: p?.notes ?? ''
			};
		}
	});

	const saving = $derived($createPassenger.isPending || $updatePassenger.isPending);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const payload = {
			first_name: form.first_name,
			last_name: form.last_name,
			phone: form.phone,
			whatsapp: form.whatsapp || null,
			email: form.email || null,
			cnic: form.cnic || null,
			city: form.city || null,
			passport_number: form.passport_number || null,
			passport_expiry: form.passport_expiry || null,
			notes: form.notes || null
		};
		if (passenger) await $updatePassenger.mutateAsync({ id: passenger.id, patch: payload });
		else await $createPassenger.mutateAsync(payload);
		onClose();
	}
</script>

<Modal {open} {onClose} title={passenger ? 'Edit passenger' : 'Add passenger'}>
	<form onsubmit={submit} class="space-y-4">
		<div class="grid grid-cols-2 gap-3">
			<Input label="First name" bind:value={form.first_name} required />
			<Input label="Last name" bind:value={form.last_name} />
		</div>
		<div class="grid grid-cols-2 gap-3">
			<Input label="Phone" bind:value={form.phone} required />
			<Input label="WhatsApp" bind:value={form.whatsapp} />
		</div>
		<div class="grid grid-cols-2 gap-3">
			<Input label="Email" type="email" bind:value={form.email} />
			<Input label="CNIC" bind:value={form.cnic} />
		</div>
		<div class="grid grid-cols-3 gap-3">
			<Input label="City" bind:value={form.city} />
			<Input label="Passport #" bind:value={form.passport_number} />
			<Input label="Passport expiry" type="date" bind:value={form.passport_expiry} />
		</div>
		<Input label="Notes" bind:value={form.notes} />
		<div class="flex justify-end gap-2">
			<Button type="button" variant="secondary" onclick={onClose}>Cancel</Button>
			<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
		</div>
	</form>
</Modal>
