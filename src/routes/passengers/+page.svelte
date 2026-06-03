<script lang="ts">
	import { Pencil, Plus, Trash2 } from 'lucide-svelte';
	import { Button } from '$ui';
	import { usePassengers, useDeletePassenger } from '$features/passengers/queries';
	import PassengerModal from '$features/passengers/PassengerModal.svelte';
	import { fullName, type Passenger } from '$features/passengers/types';

	const passengers = usePassengers();
	const deletePassenger = useDeletePassenger();

	let modalOpen = $state(false);
	let editing = $state<Passenger | null>(null);

	function openAdd() {
		editing = null;
		modalOpen = true;
	}
	function openEdit(p: Passenger) {
		editing = p;
		modalOpen = true;
	}
	function remove(p: Passenger) {
		if (confirm(`Remove ${fullName(p)}? Their history is preserved.`)) $deletePassenger.mutate(p.id);
	}
</script>

<div class="mb-6 flex items-center justify-between">
	<div>
		<h1 class="text-2xl font-bold text-slate-800">Passengers</h1>
		<p class="text-sm text-slate-500">Customer profiles. Each query attaches to one.</p>
	</div>
	<Button onclick={openAdd}><Plus class="h-4 w-4" /> Add passenger</Button>
</div>

{#if $passengers.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $passengers.isError}
	<p class="text-red-600">Failed to load: {$passengers.error.message}</p>
{:else if ($passengers.data ?? []).length === 0}
	<div class="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
		No passengers yet. They're auto-created from queries, or add one here.
	</div>
{:else}
	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
				<tr>
					<th class="px-4 py-3 font-medium">Name</th>
					<th class="px-4 py-3 font-medium">Phone</th>
					<th class="px-4 py-3 font-medium">City</th>
					<th class="px-4 py-3 font-medium">Passport</th>
					<th class="px-4 py-3"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-50">
				{#each $passengers.data ?? [] as p (p.id)}
					<tr class="hover:bg-slate-50">
						<td class="px-4 py-3 font-medium text-slate-700">
							<a href="/passengers/{p.id}" class="hover:text-brand-600">{fullName(p)}</a>
						</td>
						<td class="px-4 py-3 text-slate-600">{p.phone}</td>
						<td class="px-4 py-3 text-slate-500">{p.city ?? '—'}</td>
						<td class="px-4 py-3 text-slate-500">{p.passport_number ?? '—'}</td>
						<td class="px-4 py-3">
							<div class="flex justify-end gap-1">
								<button onclick={() => openEdit(p)} class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Edit">
									<Pencil class="h-4 w-4" />
								</button>
								<button onclick={() => remove(p)} class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
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

<PassengerModal passenger={editing} open={modalOpen} onClose={() => (modalOpen = false)} />
