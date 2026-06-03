<script lang="ts">
	import { Pencil, Plus, Trash2 } from 'lucide-svelte';
	import { Badge, Button } from '$ui';
	import { useVendors, useDeleteVendor } from '$features/vendors/queries';
	import VendorModal from '$features/vendors/VendorModal.svelte';
	import type { Vendor } from '$features/vendors/types';

	const vendors = useVendors();
	const deleteVendor = useDeleteVendor();

	let modalOpen = $state(false);
	let editing = $state<Vendor | null>(null);

	function openAdd() {
		editing = null;
		modalOpen = true;
	}
	function openEdit(v: Vendor) {
		editing = v;
		modalOpen = true;
	}
	function remove(v: Vendor) {
		if (confirm(`Remove vendor "${v.name}"? Past bookings keep the record.`))
			$deleteVendor.mutate(v.id);
	}
</script>

<div class="mb-6 flex items-center justify-between">
	<div>
		<h1 class="text-2xl font-bold text-slate-800">Vendors</h1>
		<p class="text-sm text-slate-500">Suppliers you book hotels, transfers, visas and tickets from.</p>
	</div>
	<Button onclick={openAdd}><Plus class="h-4 w-4" /> Add vendor</Button>
</div>

{#if $vendors.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $vendors.isError}
	<p class="text-red-600">Failed to load: {$vendors.error.message}</p>
{:else if ($vendors.data ?? []).length === 0}
	<div class="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
		No vendors yet. Add the hotels, transport companies, visa agents and airlines you work with.
	</div>
{:else}
	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
				<tr>
					<th class="px-4 py-3 font-medium">Name</th>
					<th class="px-4 py-3 font-medium">Type</th>
					<th class="px-4 py-3 font-medium">Contact</th>
					<th class="px-4 py-3 font-medium">Phone</th>
					<th class="px-4 py-3 font-medium">Location</th>
					<th class="px-4 py-3"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-50">
				{#each $vendors.data ?? [] as v (v.id)}
					<tr class="hover:bg-slate-50">
						<td class="px-4 py-3 font-medium text-slate-700">{v.name}</td>
						<td class="px-4 py-3"><Badge tone="info">{v.type}</Badge></td>
						<td class="px-4 py-3 text-slate-600">{v.contact_person ?? '—'}</td>
						<td class="px-4 py-3 text-slate-600">{v.phone ?? v.whatsapp_number ?? '—'}</td>
						<td class="px-4 py-3 text-slate-500">{v.location ?? '—'}</td>
						<td class="px-4 py-3">
							<div class="flex justify-end gap-1">
								<button onclick={() => openEdit(v)} class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Edit">
									<Pencil class="h-4 w-4" />
								</button>
								<button onclick={() => remove(v)} class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<VendorModal vendor={editing} open={modalOpen} onClose={() => (modalOpen = false)} />
