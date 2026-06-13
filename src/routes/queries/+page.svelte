<script lang="ts">
	import { Button } from '$ui';
	import { Plus, Pencil, Trash2, RotateCcw, Archive } from 'lucide-svelte';
	import {
		useQueries,
		useSetQueryStatus,
		useDeletedQueries,
		useSoftDeleteQuery,
		useRestoreQuery
	} from '$features/queries/queries';
	import QueryEditModal from '$features/queries/QueryEditModal.svelte';
	import { WORKFLOW_STAGES, daysSince, isStuck } from '$features/queries/workflow';
	import type { QueryStatus } from '$lib/database.types';
	import type { Query } from '$features/queries/types';
	import { formatAmount } from '$lib/money';

	const queries = useQueries();
	const setStatus = useSetQueryStatus();
	const deleted = useDeletedQueries();
	const softDelete = useSoftDeleteQuery();
	const restore = useRestoreQuery();

	let showDeleted = $state(false);
	let editing = $state<Query | null>(null);

	function openEdit(q: Query) {
		editing = q;
	}
	function remove(q: Query) {
		if (confirm(`Delete the query for ${q.client_name}? You can restore it later from “Deleted”.`))
			$softDelete.mutate(q.id);
	}

	// Group queries into their stage columns.
	const columns = $derived.by(() => {
		const map = new Map<QueryStatus, Query[]>();
		for (const s of WORKFLOW_STAGES) map.set(s.status, []);
		for (const q of $queries.data ?? []) {
			// Unknown/legacy statuses fall into New Query so nothing disappears.
			(map.get(q.status) ?? map.get('New Query'))?.push(q);
		}
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
		<p class="text-sm text-slate-500">Drag a card across the pipeline. Hover a card to edit or delete.</p>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="secondary" onclick={() => (showDeleted = !showDeleted)}>
			<Archive class="h-4 w-4" /> Deleted{($deleted.data ?? []).length ? ` · ${($deleted.data ?? []).length}` : ''}
		</Button>
		<Button href="/queries/new"><Plus class="h-4 w-4" /> New Query</Button>
	</div>
</div>

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
						<div
							role="listitem"
							draggable="true"
							ondragstart={() => (draggingId = q.id)}
							ondragend={() => (draggingId = null)}
							class="group relative rounded-lg border border-l-4 border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md {borderTone[
								stage.tone
							]} {draggingId === q.id ? 'opacity-50' : ''}"
						>
							<!-- stretched link: clicking the card opens it -->
							<a href="/queries/{q.id}" draggable="false" class="absolute inset-0 z-0" aria-label="Open {q.client_name}"></a>
							<!-- hover actions -->
							<div class="absolute right-1.5 top-1.5 z-20 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
								<button
									type="button"
									onclick={() => openEdit(q)}
									class="rounded bg-white/90 p-1 text-slate-400 shadow-sm hover:bg-slate-100 hover:text-slate-600"
									aria-label="Edit"
								>
									<Pencil class="h-3.5 w-3.5" />
								</button>
								<button
									type="button"
									onclick={() => remove(q)}
									class="rounded bg-white/90 p-1 text-slate-400 shadow-sm hover:bg-red-50 hover:text-red-600"
									aria-label="Delete"
								>
									<Trash2 class="h-3.5 w-3.5" />
								</button>
							</div>

							<div class="pointer-events-none relative z-10">
								<div class="pr-12 font-medium text-slate-800">{q.client_name}</div>
								<div class="mt-0.5 text-xs text-slate-500">{q.destination}</div>
								<div class="mt-2 flex items-center justify-between">
									<span class="font-mono text-[10px] text-slate-400">{q.query_number}</span>
									<div class="flex items-center gap-2">
										{#if isStuck(q.status, daysSince(q.stage_changed_at))}
											<span class="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-600">
												{daysSince(q.stage_changed_at)}d
											</span>
										{/if}
										{#if Number(q.selling_price) > 0}
											<span class="text-xs font-semibold text-green-600">{formatAmount(Number(q.profit))}</span>
										{/if}
									</div>
								</div>
							</div>
						</div>
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
