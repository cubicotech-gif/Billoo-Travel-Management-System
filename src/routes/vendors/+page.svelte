<script lang="ts">
	import { Pencil, Plus, Trash2, MessageCircle, Upload } from 'lucide-svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { Badge, Button, BulkImportModal } from '$ui';
	import { useVendors, useDeleteVendor } from '$features/vendors/queries';
	import { bulkCreateVendors } from '$features/vendors/api';
	import { primaryType, type Vendor } from '$features/vendors/types';
	import VendorModal from '$features/vendors/VendorModal.svelte';

	const vendors = useVendors();
	const deleteVendor = useDeleteVendor();
	const client = useQueryClient();

	let modalOpen = $state(false);
	let bulkOpen = $state(false);
	let editing = $state<Vendor | null>(null);

	async function importVendors(rows: string[][]): Promise<number> {
		const toInsert = rows
			.filter((r) => r[0]?.trim())
			.map((r) => {
				const services = (r[1] ?? '').split(/[|;]/).map((s) => s.trim()).filter(Boolean);
				return {
					name: (r[0] ?? '').trim(),
					type: primaryType(services),
					service_types: services,
					phone: r[2]?.trim() || null,
					whatsapp_group: r[3]?.trim() || null,
					location: r[4]?.trim() || null
				};
			});
		const n = await bulkCreateVendors(toInsert);
		await client.invalidateQueries({ queryKey: ['vendors'] });
		return n;
	}

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
	<div class="flex gap-2">
		<Button variant="secondary" onclick={() => (bulkOpen = true)}><Upload class="h-4 w-4" /> Bulk import</Button>
		<Button onclick={openAdd}><Plus class="h-4 w-4" /> Add vendor</Button>
	</div>
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
					<th class="px-4 py-3 font-medium">Services</th>
					<th class="px-4 py-3 font-medium">WhatsApp group</th>
					<th class="px-4 py-3 font-medium">Phone</th>
					<th class="px-4 py-3 font-medium">Location</th>
					<th class="px-4 py-3"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-50">
				{#each $vendors.data ?? [] as v (v.id)}
					<tr class="hover:bg-slate-50">
						<td class="px-4 py-3 font-medium text-slate-700">
							<a href="/vendors/{v.id}" class="hover:text-brand-600">{v.name}</a>
						</td>
						<td class="px-4 py-3">
							<div class="flex flex-wrap gap-1">
								{#each v.service_types?.length ? v.service_types : [v.type] as s (s)}
									<Badge tone="info">{s}</Badge>
								{/each}
							</div>
						</td>
						<td class="px-4 py-3">
							{#if v.whatsapp_group}
								<a href={v.whatsapp_group} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-green-600 hover:underline">
									<MessageCircle class="h-4 w-4" /> Open group
								</a>
							{:else}<span class="text-slate-400">—</span>{/if}
						</td>
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

<BulkImportModal
	open={bulkOpen}
	onClose={() => (bulkOpen = false)}
	title="Bulk import vendors"
	columns={['Name', 'Services (| separated)', 'Phone', 'WhatsApp group link', 'City']}
	example={'Al Safwah Transport\tTransfer|Ground Handling\t+96650…\thttps://chat.whatsapp.com/abc\tMakkah'}
	onImport={importVendors}
/>
