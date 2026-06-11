<script lang="ts">
	import { Check } from 'lucide-svelte';
	import { Select } from '$ui';
	import { useVendors, useEnsureVendor } from './queries';
	import { vendorHasService, type VendorService } from './types';

	interface Props {
		service: VendorService;
		value: string;
		label?: string;
	}

	let { service, value = $bindable(), label = 'Vendor' }: Props = $props();

	const ADD = '__add__';
	const vendors = useVendors();
	const ensure = useEnsureVendor();

	let adding = $state(false);
	let newName = $state('');

	const options = $derived([
		{ value: '', label: 'Own / TBD' },
		...($vendors.data ?? [])
			.filter((v) => vendorHasService(v, service))
			.map((v) => ({ value: v.id, label: v.name })),
		{ value: ADD, label: '➕ Add new vendor…' }
	]);

	function onSelect() {
		if (value === ADD) {
			adding = true;
			value = '';
		}
	}

	async function confirmAdd() {
		const name = newName.trim();
		if (!name) return;
		const vendor = await $ensure.mutateAsync({ name, service });
		value = vendor.id;
		adding = false;
		newName = '';
	}
</script>

{#if adding}
	<div class="space-y-1">
		<span class="mb-1 block text-sm font-medium text-slate-700">{label} (new)</span>
		<div class="flex gap-1">
			<input
				bind:value={newName}
				placeholder="Vendor name"
				onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), confirmAdd())}
				class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
			/>
			<button
				type="button"
				onclick={confirmAdd}
				disabled={$ensure.isPending || !newName.trim()}
				class="rounded-lg bg-brand-600 px-2 text-white hover:bg-brand-700 disabled:opacity-50"
				aria-label="Save vendor"
			>
				<Check class="h-4 w-4" />
			</button>
		</div>
		<button type="button" class="text-xs text-slate-400 hover:text-slate-600" onclick={() => (adding = false)}>
			Cancel
		</button>
	</div>
{:else}
	<Select {label} bind:value {options} onchange={onSelect} />
{/if}
