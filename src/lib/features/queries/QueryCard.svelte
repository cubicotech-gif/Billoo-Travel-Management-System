<script lang="ts">
	import { ArrowRight, ExternalLink, Pencil, Trash2 } from 'lucide-svelte';
	import { Badge } from '$ui';
	import { formatAmount } from '$lib/money';
	import { STAGE_BY_STATUS, daysSince, isStuck, nextStatus } from './workflow';
	import { QUOTATION_STATUS_TONE } from '$features/quotations/types';
	import type { Quotation } from '$features/quotations/types';
	import type { QueryStatus } from '$lib/database.types';
	import type { Query } from './types';

	interface Props {
		query: Query;
		tone: string;
		latest: Quotation | null;
		dragging: boolean;
		busy: boolean;
		/** Booking-stage money snapshot for the progress bar (null on other stages). */
		finance?: { owed: number; paid: number; balance: number; paidInFull: boolean } | null;
		onDragStart: () => void;
		onDragEnd: () => void;
		onEdit: () => void;
		onDelete: () => void;
		onMove: (status: QueryStatus) => void;
	}
	let {
		query: q,
		tone,
		latest,
		dragging,
		busy,
		finance = null,
		onDragStart,
		onDragEnd,
		onEdit,
		onDelete,
		onMove
	}: Props = $props();

	const payPct = $derived(
		finance ? (finance.owed > 0 ? Math.min(100, Math.round((finance.paid / finance.owed) * 100)) : finance.paidInFull ? 100 : 0) : 0
	);

	let expanded = $state(false);

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
	const pax = $derived(
		`${q.adults}A${q.children ? `·${q.children}C` : ''}${q.infants ? `·${q.infants}I` : ''}`
	);
</script>

<div
	role="listitem"
	draggable="true"
	ondragstart={onDragStart}
	ondragend={onDragEnd}
	class="group relative rounded-lg border border-l-4 border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md {borderTone[
		tone
	]} {dragging ? 'opacity-50' : ''}"
>
	<!-- hover quick actions (desktop) -->
	<div class="absolute right-1.5 top-1.5 z-20 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
		<button type="button" onclick={onEdit} class="rounded bg-white/90 p-1 text-slate-400 shadow-sm hover:bg-slate-100 hover:text-slate-600" aria-label="Edit">
			<Pencil class="h-3.5 w-3.5" />
		</button>
		<button type="button" onclick={onDelete} class="rounded bg-white/90 p-1 text-slate-400 shadow-sm hover:bg-red-50 hover:text-red-600" aria-label="Delete">
			<Trash2 class="h-3.5 w-3.5" />
		</button>
	</div>

	<!-- header: click toggles inline detail -->
	<button type="button" onclick={() => (expanded = !expanded)} class="block w-full p-3 text-left">
		<div class="pr-12 font-medium text-slate-800">{q.client_name}</div>
		<div class="mt-0.5 text-xs text-slate-500">{q.destination}</div>
		<div class="mt-2 flex items-center justify-between gap-2">
			<span class="font-mono text-[10px] text-slate-400">{q.query_number}</span>
			<div class="flex items-center gap-1.5">
				{#if stuck}
					<span class="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-600">{days}d</span>
				{:else}
					<span class="text-[10px] text-slate-400">{days}d</span>
				{/if}
				{#if latest}
					<Badge tone={QUOTATION_STATUS_TONE[latest.status]}>
						{formatAmount(Number(latest.total_sell_pkr))} · {latest.status}
					</Badge>
				{/if}
			</div>
		</div>

		<!-- Booking-stage payment progress: paid vs owed, with the balance. -->
		{#if finance}
			<div class="mt-2">
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
					<div class="h-full rounded-full {finance.paidInFull ? 'bg-green-500' : 'bg-amber-400'}" style="width: {payPct}%"></div>
				</div>
				<div class="mt-1 flex items-center justify-between text-[10px]">
					<span class="text-slate-400">{formatAmount(finance.paid)} / {formatAmount(finance.owed)}</span>
					{#if finance.paidInFull}
						<span class="font-medium text-green-600">Paid</span>
					{:else}
						<span class="font-medium text-amber-600">{formatAmount(finance.balance)} left</span>
					{/if}
				</div>
			</div>
		{/if}
	</button>

	{#if expanded}
		<div class="border-t border-slate-100 px-3 py-2.5 text-xs">
			<div class="text-slate-500">
				{q.package_type ?? q.destination} · {pax}{q.duration_days ? ` · ${q.duration_days}N` : ''}
			</div>
			{#if (q.itinerary_cities ?? []).length}
				<div class="mt-0.5 text-slate-400">
					{(q.itinerary_cities ?? []).map((c) => `${c.city} ${c.nights}N`).join(' · ')}
				</div>
			{/if}

			<div class="mt-2 rounded-md bg-slate-50 px-2 py-1.5">
				{#if latest}
					<div class="flex items-center justify-between">
						<span class="font-medium text-slate-600">Quote v{latest.version}</span>
						<Badge tone={QUOTATION_STATUS_TONE[latest.status]}>{latest.status}</Badge>
					</div>
					<div class="mt-0.5 flex items-center justify-between text-slate-500">
						<span>{formatAmount(Number(latest.total_sell_pkr))}</span>
						<span class="text-green-600">+{formatAmount(Number(latest.profit_pkr))}</span>
					</div>
				{:else}
					<span class="text-slate-400">No quotation yet.</span>
				{/if}
			</div>

			<!-- stage controls -->
			<div class="mt-2.5 flex flex-wrap items-center gap-1.5">
				{#if next}
					<button
						type="button"
						disabled={busy}
						onclick={() => onMove(next)}
						class="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
					>
						{STAGE_BY_STATUS[next].label} <ArrowRight class="h-3.5 w-3.5" />
					</button>
				{/if}
				<a href="/queries/{q.id}" class="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50">
					Open <ExternalLink class="h-3.5 w-3.5" />
				</a>
				<button type="button" onclick={onDelete} class="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
					<Trash2 class="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	{/if}
</div>
