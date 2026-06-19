<script lang="ts">
	import { ArrowRight, Pencil, Trash2 } from 'lucide-svelte';
	import { formatAmount } from '$lib/money';
	import { STAGE_BY_STATUS, daysSince, isStuck, nextStatus } from './workflow';
	import type { Quotation } from '$features/quotations/types';
	import type { QueryStatus } from '$lib/database.types';
	import type { Query } from './types';

	interface Props {
		query: Query;
		tone: string;
		latest: Quotation | null;
		dragging: boolean;
		busy: boolean;
		onDragStart: () => void;
		onDragEnd: () => void;
		onEdit: () => void;
		onDelete: () => void;
		onMove: (status: QueryStatus) => void;
	}
	let { query: q, tone, latest, dragging, busy, onDragStart, onDragEnd, onEdit, onDelete, onMove }: Props =
		$props();

	const borderTone: Record<string, string> = {
		neutral: 'border-l-slate-300',
		info: 'border-l-brand-400',
		success: 'border-l-green-400',
		warning: 'border-l-amber-400',
		danger: 'border-l-red-400'
	};

	const days = $derived(daysSince(q.stage_changed_at));
	const stuck = $derived(isStuck(q.status, days));
	const next = $derived(nextStatus(q.status));
</script>

<!-- One-line Kanban card: the whole row opens the workspace; a → advances the
     stage; pencil/trash sit in the corner on hover. -->
<div
	role="listitem"
	draggable="true"
	ondragstart={onDragStart}
	ondragend={onDragEnd}
	class="group relative flex items-center gap-2 rounded-md border border-l-4 border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-shadow hover:shadow-md {borderTone[
		tone
	]} {dragging ? 'opacity-50' : ''}"
>
	<a href="/queries/{q.id}" class="flex min-w-0 flex-1 items-center gap-2">
		<span class="truncate text-sm font-medium text-slate-800">{q.client_name}</span>
		<span class="truncate text-xs text-slate-400">{q.destination}</span>
		<span class="ml-auto flex shrink-0 items-center gap-1.5">
			{#if latest}
				<span class="text-[11px] font-medium text-slate-500">{formatAmount(Number(latest.total_sell_pkr))}</span>
			{/if}
			{#if stuck}
				<span class="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-600">{days}d</span>
			{:else}
				<span class="text-[10px] text-slate-400">{days}d</span>
			{/if}
		</span>
	</a>

	<!-- hover actions: edit, delete, and advance to the next stage -->
	<div class="flex shrink-0 items-center gap-0.5">
		<button type="button" onclick={onEdit} class="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100" aria-label="Edit">
			<Pencil class="h-3.5 w-3.5" />
		</button>
		<button type="button" onclick={onDelete} class="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100" aria-label="Delete">
			<Trash2 class="h-3.5 w-3.5" />
		</button>
		{#if next}
			<button
				type="button"
				disabled={busy}
				onclick={() => onMove(next)}
				title="Move to {STAGE_BY_STATUS[next].label}"
				aria-label="Move to {STAGE_BY_STATUS[next].label}"
				class="rounded p-1 text-slate-400 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
			>
				<ArrowRight class="h-4 w-4" />
			</button>
		{/if}
	</div>
</div>
