<script lang="ts">
	import { Button } from '$ui';
	import { Plus, RotateCcw, Archive, XCircle } from 'lucide-svelte';
	import {
		useQueries,
		useSetQueryStatus,
		useDeletedQueries,
		useSoftDeleteQuery,
		useRestoreQuery
	} from '$features/queries/queries';
	import QueryEditModal from '$features/queries/QueryEditModal.svelte';
	import QueryCard from '$features/queries/QueryCard.svelte';
	import { useAllQuotations } from '$features/quotations/queries';
	import { latestQuotationByQuery } from '$features/quotations/api';
	import { MAIN_STAGES } from '$features/queries/workflow';
	import type { QueryStatus } from '$lib/database.types';
	import type { Query } from '$features/queries/types';

	const queries = useQueries();
	const setStatus = useSetQueryStatus();
	const deleted = useDeletedQueries();
	const softDelete = useSoftDeleteQuery();
	const restore = useRestoreQuery();
	const quotations = useAllQuotations();

	const latestByQuery = $derived(latestQuotationByQuery($quotations.data ?? []));

	let showDeleted = $state(false);
	let showCancelled = $state(false);
	let editing = $state<Query | null>(null);

	const headerTone: Record<string, string> = {
		neutral: 'text-slate-600',
		info: 'text-brand-700',
		success: 'text-green-700',
		warning: 'text-amber-700',
		danger: 'text-red-700'
	};
	const dotTone: Record<string, string> = {
		neutral: 'bg-slate-300',
		info: 'bg-brand-400',
		success: 'bg-green-400',
		warning: 'bg-amber-400',
		danger: 'bg-red-400'
	};

	function openEdit(q: Query) {
		editing = q;
	}
	function remove(q: Query) {
		if (confirm(`Delete the query for ${q.client_name}? You can restore it later from “Deleted”.`))
			$softDelete.mutate(q.id);
	}

	// Group queries into the four pipeline columns. Cancelled is a side-exit, not
	// a column — it lives in its own collapsible section below.
	const columns = $derived.by(() => {
		const map = new Map<QueryStatus, Query[]>();
		for (const s of MAIN_STAGES) map.set(s.status, []);
		for (const q of $queries.data ?? []) {
			if (q.status === 'Cancelled') continue;
			// Unknown/legacy statuses fall into New Query so nothing disappears.
			(map.get(q.status) ?? map.get('New Query'))?.push(q);
		}
		return MAIN_STAGES.map((stage) => ({ stage, items: map.get(stage.status) ?? [] }));
	});
	const cancelledItems = $derived(($queries.data ?? []).filter((q) => q.status === 'Cancelled'));

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
</script>

<div class="mb-6 flex items-center justify-between">
	<div>
		<h1 class="text-2xl font-bold text-slate-800">Queries</h1>
		<p class="text-sm text-slate-500">Drag across the pipeline, or click a card to expand, advance, and act.</p>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="secondary" onclick={() => (showDeleted = !showDeleted)}>
			<Archive class="h-4 w-4" /> Deleted{($deleted.data ?? []).length ? ` · ${($deleted.data ?? []).length}` : ''}
		</Button>
		{#if cancelledItems.length}
				<Button variant="secondary" onclick={() => (showCancelled = !showCancelled)}>
					<XCircle class="h-4 w-4" /> Cancelled · {cancelledItems.length}
				</Button>
			{/if}
			<Button href="/queries/new"><Plus class="h-4 w-4" /> New Query</Button>
	</div>
</div>

{#if $queries.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $queries.isError}
	<p class="text-red-600">Failed to load: {$queries.error.message}</p>
{:else}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each columns as { stage, items } (stage.status)}
			<div
				role="list"
				class="flex min-h-32 flex-col rounded-xl border bg-slate-100/60 transition-colors {dragOverStatus ===
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
				<div class="flex items-center justify-between border-b border-slate-200/70 px-3 py-2.5">
					<span class="flex items-center gap-2 text-sm font-semibold {headerTone[stage.tone] ?? 'text-slate-700'}">
						<span class="h-2 w-2 rounded-full {dotTone[stage.tone] ?? 'bg-slate-300'}"></span>
						{stage.label}
					</span>
					<span class="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm">
						{items.length}
					</span>
				</div>
				<div class="flex flex-1 flex-col gap-2 px-2 pb-3">
					{#each items as q (q.id)}
						<QueryCard
							query={q}
							tone={stage.tone}
							latest={latestByQuery.get(q.id) ?? null}
							dragging={draggingId === q.id}
							busy={$setStatus.isPending}
							onDragStart={() => (draggingId = q.id)}
							onDragEnd={() => (draggingId = null)}
							onEdit={() => openEdit(q)}
							onDelete={() => remove(q)}
							onMove={(status) => $setStatus.mutate({ id: q.id, status })}
						/>
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

	{#if showCancelled && cancelledItems.length}
		<div class="mt-6 rounded-xl border border-red-100 bg-white p-4">
			<div class="mb-3 flex items-center gap-2">
				<XCircle class="h-4 w-4 text-red-400" />
				<h2 class="text-sm font-semibold text-slate-700">Cancelled queries</h2>
				<span class="text-xs text-slate-400">use a card's Move menu to bring one back</span>
			</div>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
				{#each cancelledItems as q (q.id)}
					<QueryCard
						query={q}
						tone="danger"
						latest={latestByQuery.get(q.id) ?? null}
						dragging={draggingId === q.id}
						busy={$setStatus.isPending}
						onDragStart={() => (draggingId = q.id)}
						onDragEnd={() => (draggingId = null)}
						onEdit={() => openEdit(q)}
						onDelete={() => remove(q)}
						onMove={(status) => $setStatus.mutate({ id: q.id, status })}
					/>
				{/each}
			</div>
		</div>
	{/if}

	{#if showDeleted}
		<div class="mt-6 rounded-xl border border-slate-200 bg-white p-4">
			<div class="mb-3 flex items-center gap-2">
				<Archive class="h-4 w-4 text-slate-400" />
				<h2 class="text-sm font-semibold text-slate-700">Deleted queries</h2>
			</div>
			{#if ($deleted.data ?? []).length === 0}
				<p class="text-sm text-slate-400">Nothing deleted.</p>
			{:else}
				<ul class="divide-y divide-slate-100">
					{#each $deleted.data ?? [] as q (q.id)}
						<li class="flex items-center justify-between py-2">
							<div>
								<span class="text-sm font-medium text-slate-700">{q.client_name}</span>
								<span class="ml-2 font-mono text-xs text-slate-400">{q.query_number}</span>
							</div>
							<Button size="sm" variant="secondary" disabled={$restore.isPending} onclick={() => $restore.mutate(q.id)}>
								<RotateCcw class="h-4 w-4" /> Restore
							</Button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
{/if}

<QueryEditModal query={editing} open={editing !== null} onClose={() => (editing = null)} />
