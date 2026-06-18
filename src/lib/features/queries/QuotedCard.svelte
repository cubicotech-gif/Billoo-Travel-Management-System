<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowRight, ExternalLink, Pencil, Trash2, Send, MessageSquare } from 'lucide-svelte';
	import { Badge } from '$ui';
	import { formatAmount } from '$lib/money';
	import { auth } from '$lib/stores/auth.svelte';
	import { daysSince, isStuck } from './workflow';
	import { useReplies, useAddReply, useDeleteReply } from './queries';
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
		onDragStart: () => void;
		onDragEnd: () => void;
		onEdit: () => void;
		onDelete: () => void;
		onMove: (status: QueryStatus) => void;
	}
	let { query: q, latest, dragging, busy, onDragStart, onDragEnd, onEdit, onDelete, onMove }: Props =
		$props();

	const replies = untrack(() => useReplies(q.id));
	const addReply = untrack(() => useAddReply(q.id));
	const deleteReply = untrack(() => useDeleteReply(q.id));

	let expanded = $state(false);
	let draft = $state('');

	const days = $derived(daysSince(q.stage_changed_at));
	const stuck = $derived(isStuck(q.status, days));
	const pax = $derived(
		`${q.adults}A${q.children ? `·${q.children}C` : ''}${q.infants ? `·${q.infants}I` : ''}`
	);

	function saveReply() {
		const body = draft.trim();
		if (!body) return;
		// Saving a reply reopens the query into Working (handled by the hook).
		$addReply.mutate(
			{ query_id: q.id, body, author: auth.user?.email ?? null },
			{ onSuccess: () => (draft = '') }
		);
	}

	function fmtTime(iso: string): string {
		return new Date(iso).toLocaleString(undefined, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div
	role="listitem"
	draggable="true"
	ondragstart={onDragStart}
	ondragend={onDragEnd}
	class="group relative rounded-lg border border-l-4 border-l-brand-400 border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md {dragging
		? 'opacity-50'
		: ''}"
>
	<div class="absolute right-1.5 top-1.5 z-20 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
		<button type="button" onclick={onEdit} class="rounded bg-white/90 p-1 text-slate-400 shadow-sm hover:bg-slate-100 hover:text-slate-600" aria-label="Edit">
			<Pencil class="h-3.5 w-3.5" />
		</button>
		<button type="button" onclick={onDelete} class="rounded bg-white/90 p-1 text-slate-400 shadow-sm hover:bg-red-50 hover:text-red-600" aria-label="Delete">
			<Trash2 class="h-3.5 w-3.5" />
		</button>
	</div>

	<!-- header: client + what we quoted -->
	<button type="button" onclick={() => (expanded = !expanded)} class="block w-full p-3 text-left">
		<div class="pr-12 font-medium text-slate-800">{q.client_name}</div>
		<div class="mt-0.5 text-xs text-slate-500">{q.destination} · {pax}</div>
		<div class="mt-2 flex items-center justify-between gap-2">
			<span class="font-mono text-[10px] text-slate-400">{q.query_number}</span>
			<div class="flex items-center gap-1.5">
				{#if stuck}
					<span class="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-600">{days}d</span>
				{:else}
					<span class="text-[10px] text-slate-400">{days}d</span>
				{/if}
				{#if ($replies.data ?? []).length}
					<span class="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
						<MessageSquare class="h-2.5 w-2.5" /> {($replies.data ?? []).length}
					</span>
				{/if}
			</div>
		</div>

		<!-- costing summary: what we quoted them -->
		<div class="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs">
			{#if latest}
				<div class="flex items-center justify-between">
					<span class="font-medium text-slate-600">Quote v{latest.version}</span>
					<Badge tone={QUOTATION_STATUS_TONE[latest.status]}>{latest.status}</Badge>
				</div>
				<div class="mt-1 flex items-center justify-between text-slate-500">
					<span>{formatAmount(Number(latest.per_person_pkr))}/pp</span>
					<span>{formatAmount(Number(latest.total_sell_pkr))}</span>
				</div>
				<div class="mt-0.5 flex items-center justify-between text-[11px] text-slate-400">
					<span class="text-green-600">+{formatAmount(Number(latest.profit_pkr))}</span>
					{#if latest.valid_until}<span>valid {latest.valid_until}</span>{/if}
				</div>
			{:else}
				<span class="text-slate-400">No quotation yet — open to build one.</span>
			{/if}
		</div>
	</button>

	{#if expanded}
		<div class="border-t border-slate-100 px-3 py-2.5">
			<!-- reply thread: the client's responses, kept over time -->
			<div class="mb-2 space-y-1.5">
				{#each $replies.data ?? [] as r (r.id)}
					<div class="group/r rounded-md bg-amber-50/70 px-2 py-1.5 text-xs">
						<div class="flex items-start justify-between gap-2">
							<p class="whitespace-pre-wrap text-slate-700">{r.body}</p>
							<button
								type="button"
								onclick={() => $deleteReply.mutate(r.id)}
								class="shrink-0 text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover/r:opacity-100"
								aria-label="Delete reply"
							>
								<Trash2 class="h-3 w-3" />
							</button>
						</div>
						<div class="mt-0.5 text-[10px] text-slate-400">
							{fmtTime(r.created_at)}{r.author ? ` · ${r.author}` : ''}
						</div>
					</div>
				{/each}
				{#if ($replies.data ?? []).length === 0}
					<p class="text-[11px] text-slate-400">No client replies yet.</p>
				{/if}
			</div>

			<!-- reply box: saving reopens the query into Working -->
			<textarea
				bind:value={draft}
				rows="2"
				placeholder="What did the client reply? (saving reopens to Working)"
				class="w-full rounded-md border border-slate-200 p-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
			></textarea>
			<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
				<button
					type="button"
					disabled={!draft.trim() || $addReply.isPending}
					onclick={saveReply}
					class="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
				>
					<Send class="h-3.5 w-3.5" /> {$addReply.isPending ? 'Saving…' : 'Save reply'}
				</button>
				<button
					type="button"
					disabled={busy}
					onclick={() => onMove('Booking')}
					class="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
				>
					Booking <ArrowRight class="h-3.5 w-3.5" />
				</button>
				<a href="/queries/{q.id}" class="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
					Open <ExternalLink class="h-3.5 w-3.5" />
				</a>
			</div>
		</div>
	{/if}
</div>
