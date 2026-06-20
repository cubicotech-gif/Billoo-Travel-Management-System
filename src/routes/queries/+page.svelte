<script lang="ts">
	import { Button } from '$ui';
	import { Plus, RotateCcw, Archive, XCircle, ChevronDown, Search } from 'lucide-svelte';
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
	import QuotedCard from '$features/queries/QuotedCard.svelte';
	import { useAllQuotations } from '$features/quotations/queries';
	import { latestQuotationByQuery } from '$features/quotations/api';
	import { isBooked, groupIntoLanes } from '$features/operations/lanes';
	import { daysSince, isStuck } from '$features/queries/workflow';
	import type { BookingStatus, PackageType, QueryStatus } from '$lib/database.types';
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
		alwaysOpen: boolean;
	}

	// --- Search + filter chips ------------------------------------------------
	let search = $state('');
	let activeTypes = $state<PackageType[]>([]);
	let stuckOnly = $state(false);

	const all = $derived($queries.data ?? []);
	const packageTypes = $derived(
		[...new Set(all.map((q) => q.package_type).filter((t): t is PackageType => !!t))].sort()
	);
	const filtersOn = $derived(!!search.trim() || activeTypes.length > 0 || stuckOnly);

	function matches(q: Query): boolean {
		if (search.trim()) {
			const s = search.trim().toLowerCase();
			const hay = `${q.client_name} ${q.destination ?? ''} ${q.query_number} ${q.package_type ?? ''}`.toLowerCase();
			if (!hay.includes(s)) return false;
		}
		if (activeTypes.length && (!q.package_type || !activeTypes.includes(q.package_type))) return false;
		if (stuckOnly && !isStuck(q.status, daysSince(q.stage_changed_at))) return false;
		return true;
	}
	function toggleType(t: PackageType) {
		activeTypes = activeTypes.includes(t) ? activeTypes.filter((x) => x !== t) : [...activeTypes, t];
	}
	function clearFilters() {
		search = '';
		activeTypes = [];
		stuckOnly = false;
	}

	const filtered = $derived(all.filter(matches));
	const active = $derived(filtered.filter((q) => q.status !== 'Cancelled'));
	const lanes = $derived(groupIntoLanes(filtered));

	// All stages live in one row. New Query + Working stay open; the rest collapse
	// to a thin bar you click to expand.
	const columns = $derived.by((): BoardColumn[] => {
		const notBooked = active.filter((q) => !isBooked(q));
		const known: QueryStatus[] = ['Working', 'Quoted', 'Booking'];
		const fresh = notBooked.filter((q) => q.status === 'New Query' || !known.includes(q.status));
		return [
			{ id: 'New Query', label: 'New Query', tone: 'warning', status: 'New Query', bookingStatus: null, alwaysOpen: true, items: fresh },
			{ id: 'Working', label: 'Working', tone: 'info', status: 'Working', bookingStatus: null, alwaysOpen: true, items: notBooked.filter((q) => q.status === 'Working') },
			{ id: 'Quoted', label: 'Quoted', tone: 'info', status: 'Quoted', bookingStatus: null, alwaysOpen: false, items: active.filter((q) => q.status === 'Quoted' && !isBooked(q)) },
			{ id: 'Booking', label: 'Booking in progress', tone: 'success', status: 'Booking', bookingStatus: null, alwaysOpen: false, items: active.filter((q) => q.status === 'Booking' && !q.booking_status) },
			{ id: 'payments', label: 'Payments Due', tone: 'warning', status: 'Booking', bookingStatus: 'Pending Payment', alwaysOpen: false, items: lanes.payments.map((c) => c.query) },
			{ id: 'checkins', label: 'Check-ins', tone: 'info', status: 'Booking', bookingStatus: 'Payment Done - Check-in Pending', alwaysOpen: false, items: lanes.checkins.map((c) => c.query) },
			{ id: 'completed', label: 'Completed', tone: 'success', status: 'Booking', bookingStatus: 'Completed', alwaysOpen: false, items: lanes.completed.map((c) => c.query) }
		];
	});

	const cancelledItems = $derived(($queries.data ?? []).filter((q) => q.status === 'Cancelled'));

	// New Query + Working stay open as narrow single-column lists; the rest live in
	// a vertical accordion stack that uses the freed horizontal space.
	const openColumns = $derived(columns.filter((c) => c.alwaysOpen));
	const collapsibleColumns = $derived(columns.filter((c) => !c.alwaysOpen));

	let openState = $state<Record<string, boolean>>({});

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

<!-- Search + filter chips: find a passenger by name and narrow the board. -->
<div class="mb-5 flex flex-wrap items-center gap-2">
	<div class="relative">
		<Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
		<input
			type="search"
			bind:value={search}
			placeholder="Search by passenger name, ref or destination…"
			class="w-80 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
		/>
	</div>

	{#each packageTypes as t (t)}
		<button
			type="button"
			onclick={() => toggleType(t)}
			class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {activeTypes.includes(t)
				? 'border-brand-500 bg-brand-50 text-brand-700'
				: 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}"
		>
			{t}
		</button>
	{/each}

	<button
		type="button"
		onclick={() => (stuckOnly = !stuckOnly)}
		class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {stuckOnly
			? 'border-red-400 bg-red-50 text-red-600'
			: 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}"
	>
		Stuck
	</button>

	{#if filtersOn}
		<button type="button" onclick={clearFilters} class="ml-1 text-xs text-slate-400 hover:text-slate-600">
			Clear
		</button>
	{/if}
</div>

{#if $queries.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $queries.isError}
	<p class="text-red-600">Failed to load: {$queries.error.message}</p>
{:else}
	<!-- Reusable card so both regions render items identically. -->
	{#snippet cardItem(col: BoardColumn, q: Query)}
		{#if col.id === 'Quoted'}
			<QuotedCard
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
		{:else}
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
		{/if}
	{/snippet}

	<div class="flex items-start gap-4">
		<!-- Always open: narrow single-column lists that scroll vertically. -->
		{#each openColumns as col (col.id)}
			<div
				role="list"
				class="flex max-h-[calc(100vh-11rem)] w-80 shrink-0 flex-col rounded-xl border bg-slate-100/60 transition-colors {dragOverId ===
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
				<div class="flex flex-1 flex-col gap-2 overflow-y-auto px-2 py-3">
					{#each col.items as q (q.id)}
						{@render cardItem(col, q)}
					{/each}
					{#if col.items.length === 0}
						<div class="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">
							Drop here
						</div>
					{/if}
				</div>
			</div>
		{/each}

		<!-- Collapsible: a vertical accordion stack filling the freed space. Each
		     bar reads horizontally and expands DOWN to reveal its cards. -->
		<div class="min-w-0 flex-1 space-y-2">
			{#each collapsibleColumns as col (col.id)}
				{@const open = openState[col.id] ?? false}
				<div
					role="group"
					class="overflow-hidden rounded-xl border bg-slate-100/60 transition-colors {dragOverId === col.id
						? 'border-brand-400 bg-brand-50'
						: 'border-slate-200'}"
					ondragover={(e) => {
						e.preventDefault();
						dragOverId = col.id;
					}}
					ondragleave={() => {
						if (dragOverId === col.id) dragOverId = null;
					}}
					ondrop={() => onDrop(col)}
				>
					<button
						type="button"
						onclick={() => (openState[col.id] = !open)}
						class="flex w-full items-center justify-between px-3 py-2.5 hover:bg-slate-100/70"
					>
						<span class="flex items-center gap-2 text-sm font-semibold {headerTone[col.tone] ?? 'text-slate-700'}">
							<ChevronDown class="h-4 w-4 text-slate-400 transition-transform {open ? '' : '-rotate-90'}" />
							<span class="h-2 w-2 rounded-full {dotTone[col.tone] ?? 'bg-slate-300'}"></span>
							{col.label}
						</span>
						<span class="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm">
							{col.items.length}
						</span>
					</button>
					{#if open}
						<div class="border-t border-slate-200/70 px-2 py-2">
							{#if col.items.length === 0}
								<div class="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">
									Drop here
								</div>
							{:else}
								<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
									{#each col.items as q (q.id)}
										{@render cardItem(col, q)}
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
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
