<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Input, Modal } from '$ui';
	import { useCreateVendor, useUpdateVendor } from './queries';
	import { VENDOR_SERVICES, primaryType, type Vendor, type VendorService } from './types';

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
		services: [] as string[],
		contact_person: '',
		phone: '',
		whatsapp_group: '',
		email: '',
		location: '',
		notes: ''
	});

	$effect(() => {
		if (open) {
			const v = untrack(() => vendor);
			form = {
				name: v?.name ?? '',
				services: v?.service_types?.length ? [...v.service_types] : [],
				contact_person: v?.contact_person ?? '',
				phone: v?.phone ?? '',
				whatsapp_group: v?.whatsapp_group ?? '',
				email: v?.email ?? '',
				location: v?.location ?? '',
				notes: v?.notes ?? ''
			};
		}
	});

	function toggle(s: VendorService) {
		form.services = form.services.includes(s)
			? form.services.filter((x) => x !== s)
			: [...form.services, s];
	}

	const saving = $derived($createVendor.isPending || $updateVendor.isPending);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const payload = {
			name: form.name,
			type: primaryType(form.services),
			service_types: form.services,
			contact_person: form.contact_person || null,
			phone: form.phone || null,
			whatsapp_group: form.whatsapp_group || null,
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
		<Input label="Name" bind:value={form.name} required placeholder="e.g. Al Safwah Transport" />
		<div>
			<span class="mb-1 block text-sm font-medium text-slate-700">Services offered</span>
			<div class="flex flex-wrap gap-2">
				{#each VENDOR_SERVICES as s (s)}
					<button
						type="button"
						onclick={() => toggle(s)}
						class="rounded-full border px-3 py-1 text-sm transition-colors {form.services.includes(s)
							? 'border-brand-500 bg-brand-50 text-brand-700'
							: 'border-slate-300 text-slate-500 hover:bg-slate-50'}"
					>
						{s}
					</button>
				{/each}
			</div>
			<p class="mt-1 text-xs text-slate-400">Flights are issued in-house (no vendor).</p>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<Input label="Contact person" bind:value={form.contact_person} />
			<Input label="City / location" bind:value={form.location} />
		</div>
		<div class="grid grid-cols-2 gap-3">
			<Input label="Phone" bind:value={form.phone} />
			<Input label="WhatsApp group link" bind:value={form.whatsapp_group} placeholder="https://chat.whatsapp.com/…" />
		</div>
		<Input label="Email" type="email" bind:value={form.email} />
		<Input label="Notes" bind:value={form.notes} />
		<div class="flex justify-end gap-2">
			<Button type="button" variant="secondary" onclick={onClose}>Cancel</Button>
			<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
		</div>
	</form>
</Modal>
