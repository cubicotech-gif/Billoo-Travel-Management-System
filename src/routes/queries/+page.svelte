<script lang="ts">
	import { Button } from '$ui';
	import { Plus, RotateCcw, Archive, XCircle } from 'lucide-svelte';
	import {
		useQueries,
		useSetQueryStatus,
		useUpdateQuery,
		useDeletedQueries,
		useSoftDeleteQuery,
		useRestoreQuery
	} from '$features/queries/queries';
	import QueryEditModal from '$features/queries/QueryEditModal.svelte';
	import QueryCard from '$features/queries/QueryCard.svelte';
	import { useAllQuotations } from '$features/quotations/queries';
	import { latestQuotationByQuery } from '$features/quotations/api';
	import { isBooked, groupIntoLanes } from '$features/operations/lanes';
	import type { BookingStatus, QueryStatus } from '$lib/database.types';
	import type { Query } from '$features/queries/types';

	const queries = useQueries();
	const setStatus = useSetQueryStatus();
	const update = useUpdateQuery();
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

	// What a drop applies: the target stage and (for booked follow-up lanes) the
	// booking status it represents.
	interface BoardColumn {
		id: string;
		label: string;
		tone: string;
		status: QueryStatus;
		bookingStatus: BookingStatus | null;
		items: Query[];
	}

	const active = $derived(($queries.data ?? []).filter((q) => q.status !== 'Cancelled'));
	const lanes = $derived(groupIntoLanes($queries.data ?? []));

	// A proper Kanban: every stage is its own column, side by side, scrolling
	// horizontally. Cards are one line; columns scroll vertically when long.
	const columns = $derived.by((): BoardColumn[] => {
		const notBooked = active.filter((q) => !isBooked(q));
		const known: QueryStatus[] = ['Working', 'Quoted', 'Booking'];
		const fresh = notBooked.filter((q) => q.status === 'New Query' || !known.includes(q.status));
		return [
			{ id: 'New Query', label: 'New Query', tone: 'warning', status: 'New Query', bookingStatus: null, items: fresh },
			{ id: 'Working', label: 'Working', tone: 'info', status: 'Working', bookingStatus: null, items: notBooked.filter((q) => q.status === 'Working') },
			{ id: 'Quoted', label: 'Quoted', tone: 'info', status: 'Quoted', bookingStatus: null, items: active.filter((q) => q.status === 'Quoted' && !isBooked(q)) },
			{ id: 'Booking', label: 'Booking', tone: 'success', status: 'Booking', bookingStatus: null, items: active.filter((q) => q.status === 'Booking' && !q.booking_status) },
			{ id: 'payments', label: 'Payments Due', tone: 'warning', status: 'Booking', bookingStatus: 'Pending Payment', items: lanes.payments.map((c) => c.query) },
			{ id: 'checkins', label: 'Check-ins', tone: 'info', status: 'Booking', bookingStatus: 'Payment Done - Check-in Pending', items: lanes.checkins.map((c) => c.query) },
			{ id: 'completed', label: 'Completed', tone: 'success', status: 'Booking', bookingStatus: 'Completed', items: lanes.completed.map((c) => c.query) }
		];
	});

	const cancelledItems = $derived(($queries.data ?? []).filter((q) => q.status === 'Cancelled'));

	let draggingId = $state<string | null>(null);
	let dragOverId = $state<string | null>(null);

	function onDrop(col: BoardColumn) {
		const id = draggingId;
		draggingId = null;
		dragOverId = null;
		if (!id) return;
		const q = active.find((x) => x.id === id);
		if (!q) return;
		const sameStage = q.status === col.status;
		const sameBooking = (q.booking_status ?? null) === col.bookingStatus;
		if (sameStage && sameBooking) return;
		const patch: Partial<Query> = {
			status: col.status,
			booking_status: col.bookingStatus,
			stage_changed_at: new Date().toISOString()
		};
		if (col.bookingStatus === 'Completed') patch.completed_date = q.completed_date ?? new Date().toISOString();
		$update.mutate({ id, patch });
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
	<!-- Proper Kanban: one column per stage, side by side, one-line cards. -->
	<div class="flex gap-3 overflow-x-auto pb-4">
		{#each columns as col (col.id)}
			<div
				role="list"
				class="flex max-h-[calc(100vh-12rem)] w-72 shrink-0 flex-col rounded-xl border bg-slate-100/60 transition-colors {dragOverId ===
				col.id
					? 'border-brand-400 bg-brand-50'
					: 'border-transparent'}"
				ondragover={(e) => {
					e.preventDefault();
					dragOverId = col.id;
				}}
				ondragleave={() => {
					if (dragOverId === col.id) dragOverId = null;
				}}
				ondrop={() => onDrop(col)}
			>
				<div class="flex items-center justify-between border-b border-slate-200/70 px-3 py-2.5">
					<span class="flex items-center gap-2 text-sm font-semibold {headerTone[col.tone] ?? 'text-slate-700'}">
						<span class="h-2 w-2 rounded-full {dotTone[col.tone] ?? 'bg-slate-300'}"></span>
						{col.label}
					</span>
					<span class="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm">
						{col.items.length}
					</span>
				</div>
				<div class="flex flex-1 flex-col gap-1.5 overflow-y-auto px-2 py-2">
					{#each col.items as q (q.id)}
						<QueryCard
							query={q}
							tone={col.tone}
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
					{#if col.items.length === 0}
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
