<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Input, Modal, Select } from '$ui';
	import { useCreateVendor, useUpdateVendor } from './queries';
	import { VENDOR_TYPES, type Vendor } from './types';

	interface Props {
		vendor?: Vendor | null;
		open: boolean;
		onClose: () => void;
	}

	let { vendor = null, open, onClose }: Props = $props();

	const createVendor = useCreateVendor();
	const updateVendor = useUpdateVendor();

	let form = $state({
		name: '',
		type: 'Hotel',
		contact_person: '',
		phone: '',
		whatsapp_number: '',
		email: '',
		location: '',
		notes: ''
	});

	$effect(() => {
		if (open) {
			const v = untrack(() => vendor);
			form = {
				name: v?.name ?? '',
				type: v?.type ?? 'Hotel',
				contact_person: v?.contact_person ?? '',
				phone: v?.phone ?? '',
				whatsapp_number: v?.whatsapp_number ?? '',
				email: v?.email ?? '',
				location: v?.location ?? '',
				notes: v?.notes ?? ''
			};
		}
	});

	const saving = $derived($createVendor.isPending || $updateVendor.isPending);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const payload = {
			name: form.name,
			type: form.type,
			contact_person: form.contact_person || null,
			phone: form.phone || null,
			whatsapp_number: form.whatsapp_number || null,
			email: form.email || null,
			location: form.location || null,
			notes: form.notes || null
		};
		if (vendor) await $updateVendor.mutateAsync({ id: vendor.id, patch: payload });
		else await $createVendor.mutateAsync(payload);
		onClose();
	}
</script>

<Modal {open} {onClose} title={vendor ? 'Edit vendor' : 'Add vendor'}>
	<form onsubmit={submit} class="space-y-4">
		<div class="grid grid-cols-2 gap-3">
			<Input label="Name" bind:value={form.name} required placeholder="e.g. Hilton Makkah" />
			<Select label="Type" bind:value={form.type} options={[...VENDOR_TYPES]} />
		</div>
		<div class="grid grid-cols-2 gap-3">
			<Input label="Contact person" bind:value={form.contact_person} />
			<Input label="City / location" bind:value={form.location} />
		</div>
		<div class="grid grid-cols-2 gap-3">
			<Input label="Phone" bind:value={form.phone} />
			<Input label="WhatsApp" bind:value={form.whatsapp_number} />
		</div>
		<Input label="Email" type="email" bind:value={form.email} />
		<Input label="Notes" bind:value={form.notes} />
		<div class="flex justify-end gap-2">
			<Button type="button" variant="secondary" onclick={onClose}>Cancel</Button>
			<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
		</div>
	</form>
</Modal>
