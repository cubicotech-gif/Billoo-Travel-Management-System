<script lang="ts">
	import { Trash2, Plus } from 'lucide-svelte';
	import { Button, Input, Modal } from '$ui';
	import { useStaff, useCreateStaff, useRemoveStaff } from './queries';

	let { open, onClose }: { open: boolean; onClose: () => void } = $props();

	const staff = useStaff();
	const createStaff = useCreateStaff();
	const removeStaff = useRemoveStaff();

	let newName = $state('');

	async function add(e: SubmitEvent) {
		e.preventDefault();
		const name = newName.trim();
		if (!name) return;
		await $createStaff.mutateAsync(name);
		newName = '';
	}
</script>

<Modal {open} {onClose} title="Manage staff">
	<form onsubmit={add} class="mb-4 flex items-end gap-2">
		<div class="flex-1">
			<Input label="Add staff member" bind:value={newName} placeholder="Name" />
		</div>
		<Button type="submit" disabled={$createStaff.isPending}><Plus class="h-4 w-4" /> Add</Button>
	</form>

	{#if ($staff.data ?? []).length === 0}
		<p class="text-sm text-slate-400">No staff yet.</p>
	{:else}
		<ul class="divide-y divide-slate-100">
			{#each $staff.data ?? [] as s (s.id)}
				<li class="flex items-center justify-between py-2">
					<span class="text-sm text-slate-700">{s.name}</span>
					<button
						onclick={() => $removeStaff.mutate(s.id)}
						class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
						aria-label="Remove"
					>
						<Trash2 class="h-4 w-4" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
