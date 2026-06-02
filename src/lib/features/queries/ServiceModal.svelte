<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Input, Modal, Select } from '$ui';
	import type { ServiceType } from '$lib/database.types';
	import { formatAmount } from '$lib/money';
	import { useCreateService, useUpdateService } from './queries';
	import type { QueryService } from './types';

	interface Props {
		queryId: string;
		service?: QueryService | null;
		open: boolean;
		onClose: () => void;
	}

	let { queryId, service = null, open, onClose }: Props = $props();

	const SERVICE_TYPES: ServiceType[] = [
		'Flight',
		'Hotel',
		'Visa',
		'Transport',
		'Tour',
		'Insurance',
		'Other'
	];

	// queryId is fixed for this modal instance (parent remounts per query).
	const createService = untrack(() => useCreateService(queryId));
	const updateService = untrack(() => useUpdateService(queryId));

	// Local form state, seeded from the service being edited (if any).
	let form = $state({
		service_type: 'Hotel' as ServiceType,
		service_description: '',
		vendor: '',
		quantity: 1,
		cost_price: 0,
		selling_price: 0
	});

	// Re-seed whenever the modal opens for a different service.
	$effect(() => {
		if (open) {
			form = {
				service_type: service?.service_type ?? 'Hotel',
				service_description: service?.service_description ?? '',
				vendor: service?.vendor ?? '',
				quantity: service?.quantity ?? 1,
				cost_price: Number(service?.cost_price ?? 0),
				selling_price: Number(service?.selling_price ?? 0)
			};
		}
	});

	const lineProfit = $derived(
		(Number(form.selling_price) - Number(form.cost_price)) * Number(form.quantity)
	);

	const saving = $derived($createService.isPending || $updateService.isPending);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const payload = {
			service_type: form.service_type,
			service_description: form.service_description,
			vendor: form.vendor || null,
			quantity: Number(form.quantity),
			cost_price: Number(form.cost_price),
			selling_price: Number(form.selling_price)
		};
		if (service) {
			await $updateService.mutateAsync({ id: service.id, patch: payload });
		} else {
			await $createService.mutateAsync({ query_id: queryId, ...payload });
		}
		onClose();
	}
</script>

<Modal {open} {onClose} title={service ? 'Edit service' : 'Add service'}>
	<form onsubmit={submit} class="space-y-4">
		<div class="grid grid-cols-2 gap-3">
			<Select label="Type" bind:value={form.service_type} options={SERVICE_TYPES} />
			<Input label="Vendor" bind:value={form.vendor} placeholder="e.g. Saudia, Hilton" />
		</div>
		<Input
			label="Description"
			bind:value={form.service_description}
			required
			placeholder="e.g. Makkah hotel — 5 nights, double room"
		/>
		<div class="grid grid-cols-3 gap-3">
			<Input label="Quantity" type="number" min="1" bind:value={form.quantity} />
			<Input label="Cost (PKR)" type="number" min="0" step="0.01" bind:value={form.cost_price} />
			<Input
				label="Selling (PKR)"
				type="number"
				min="0"
				step="0.01"
				bind:value={form.selling_price}
			/>
		</div>
		<div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
			<span class="text-slate-500">Line profit</span>
			<span class="font-semibold {lineProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
				{formatAmount(lineProfit)}
			</span>
		</div>
		<div class="flex justify-end gap-2">
			<Button type="button" variant="secondary" onclick={onClose}>Cancel</Button>
			<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
		</div>
	</form>
</Modal>
