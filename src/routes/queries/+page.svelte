<script lang="ts">
	import { Button, Input } from '$ui';
	import { Plus } from 'lucide-svelte';
	import { useQueries, useCreateQuery, useSetQueryStatus } from '$features/queries/queries';
	import { WORKFLOW_STAGES } from '$features/queries/workflow';
	import type { QueryStatus } from '$lib/database.types';
	import type { Query } from '$features/queries/types';
	import { formatAmount } from '$lib/money';

	const queries = useQueries();
	const createQuery = useCreateQuery();
	const setStatus = useSetQueryStatus();

	let showForm = $state(false);
	let form = $state({ client_name: '', client_phone: '', destination: '' });

	// Group queries into their stage columns.
	const columns = $derived.by(() => {
		const map = new Map<QueryStatus, Query[]>();
		for (const s of WORKFLOW_STAGES) map.set(s.status, []);
		for (const q of $queries.data ?? []) map.get(q.status)?.push(q);
		return WORKFLOW_STAGES.map((stage) => ({ stage, items: map.get(stage.status) ?? [] }));
	});

	let draggingId = $state<string | null>(null);
	let dragOverStatus = $state<QueryStatus | null>(null);

	function onDrop(status: QueryStatus) {
		const id = draggingId;
		draggingId = null;
		dragOverStatus = null;
		if (!id) return;
		const q = ($queries.data ?? []).find((x) => x.id === id);
		if (q && q.status !== status) $setStatus.mutate({ id, status });
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		await $createQuery.mutateAsync({ ...form });
		form = { client_name: '', client_phone: '', destination: '' };
		showForm = false;
	}

	// Tailwind needs literal classes — map each tone to a left border colour.
	const borderTone: Record<string, string> = {
		neutral: 'border-l-slate-300',
		info: 'border-l-brand-400',
		success: 'border-l-green-400',
		warning: 'border-l-amber-400',
		danger: 'border-l-red-400'
	};
</script>

<div class="mb-6 flex items-center justify-between">
	<div>
		<h1 class="text-2xl font-bold text-slate-800">Queries</h1>
		<p class="text-sm text-slate-500">Drag a card across the pipeline. Click to open.</p>
	</div>
	<Button onclick={() => (showForm = !showForm)}><Plus class="h-4 w-4" /> New Query</Button>
</div>

{#if showForm}
	<form
		onsubmit={submit}
		class="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4"
	>
		<Input placeholder="Client name" bind:value={form.client_name} required />
		<Input placeholder="Phone" bind:value={form.client_phone} required />
		<Input placeholder="Destination" bind:value={form.destination} required />
		<Button type="submit" disabled={$createQuery.isPending}>
			{$createQuery.isPending ? 'Saving…' : 'Create'}
		</Button>
	</form>
{/if}

{#if $queries.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $queries.isError}
	<p class="text-red-600">Failed to load: {$queries.error.message}</p>
{:else}
	<div class="flex gap-4 overflow-x-auto pb-4">
		{#each columns as { stage, items } (stage.status)}
			<div
				role="list"
				class="flex w-72 shrink-0 flex-col rounded-xl border bg-slate-100/60 transition-colors {dragOverStatus ===
				stage.status
					? 'border-brand-400 bg-brand-50'
					: 'border-transparent'}"
				ondragover={(e) => {
					e.preventDefault();
					dragOverStatus = stage.status;
				}}
				ondragleave={() => {
					if (dragOverStatus === stage.status) dragOverStatus = null;
				}}
				ondrop={() => onDrop(stage.status)}
			>
				<div class="flex items-center justify-between px-3 py-2.5">
					<span class="text-sm font-semibold text-slate-700">{stage.label}</span>
					<span class="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
						{items.length}
					</span>
				</div>
				<div class="flex flex-1 flex-col gap-2 px-2 pb-3">
					{#each items as q (q.id)}
						<a
							href="/queries/{q.id}"
							draggable="true"
							ondragstart={() => (draggingId = q.id)}
							ondragend={() => (draggingId = null)}
							class="block cursor-pointer rounded-lg border border-l-4 border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md {borderTone[
								stage.tone
							]} {draggingId === q.id ? 'opacity-50' : ''}"
						>
							<div class="font-medium text-slate-800">{q.client_name}</div>
							<div class="mt-0.5 text-xs text-slate-500">{q.destination}</div>
							<div class="mt-2 flex items-center justify-between">
								<span class="font-mono text-[10px] text-slate-400">{q.query_number}</span>
								{#if Number(q.selling_price) > 0}
									<span class="text-xs font-semibold text-green-600">
										{formatAmount(Number(q.profit))}
									</span>
								{/if}
							</div>
						</a>
					{/each}
					{#if items.length === 0}
						<div class="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">
							Drop here
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
