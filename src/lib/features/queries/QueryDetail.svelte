<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, ArrowRight, Ban, FileText, Map } from 'lucide-svelte';
	import { Badge, Button, Card } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useQueryDetail, useSetQueryStatus } from './queries';
	import {
		STAGE_BY_STATUS,
		BOOKING_STATUS_TONE,
		stageFor,
		nextStatus,
		prevStatus,
		isCancelled
	} from './workflow';
	import Stepper from './Stepper.svelte';
	import StageActions from './StageActions.svelte';
	import QuotationList from '$features/quotations/QuotationList.svelte';
	import BookingPanel from '$features/bookings/BookingPanel.svelte';
	import DocumentsPanel from '$features/documents/DocumentsPanel.svelte';

	// `id` is stable for this component instance: the route keys on it, so a
	// different query remounts us.
	let { id }: { id: string } = $props();

	const query = untrack(() => useQueryDetail(id));
	const setStatus = useSetQueryStatus();

	function cancelQuery() {
		if (confirm('Cancel this query? You can move it back into the pipeline later.'))
			$setStatus.mutate({ id, status: 'Cancelled' });
	}
</script>

<a
	href="/queries"
	class="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
>
	<ArrowLeft class="h-4 w-4" /> Back to queries
</a>

{#if $query.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $query.isError}
	<p class="text-red-600">Failed to load: {$query.error.message}</p>
{:else if $query.data}
	{@const q = $query.data}
	{@const next = nextStatus(q.status)}
	{@const prev = prevStatus(q.status)}
	<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold text-slate-800">{q.client_name}</h1>
				<Badge tone={stageFor(q.status).tone}>{stageFor(q.status).label}</Badge>
				{#if q.status === 'Booking' && q.booking_status}
					<Badge tone={BOOKING_STATUS_TONE[q.booking_status]}>{q.booking_status}</Badge>
				{/if}
			</div>
			<p class="mt-1 font-mono text-xs text-slate-400">{q.query_number}</p>
			<p class="mt-1 text-sm text-slate-500">
				{q.destination} · {q.adults} adult{q.adults === 1 ? '' : 's'}{q.children
					? `, ${q.children} child`
					: ''}{q.infants ? `, ${q.infants} infant` : ''} · {q.client_phone}
			</p>
		</div>
		<!-- Guided controls: back / advance / cancel (or restore) -->
		<div class="flex items-center gap-2">
			{#if isCancelled(q.status)}
				<Button variant="secondary" disabled={$setStatus.isPending} onclick={() => $setStatus.mutate({ id, status: 'New Query' })}>
					Restore to New Query
				</Button>
			{:else}
				{#if prev}
					<Button variant="ghost" disabled={$setStatus.isPending} onclick={() => $setStatus.mutate({ id, status: prev })}>
						<ArrowLeft class="h-4 w-4" /> Back
					</Button>
				{/if}
				{#if next}
					<Button disabled={$setStatus.isPending} onclick={() => $setStatus.mutate({ id, status: next })}>
						Advance to {STAGE_BY_STATUS[next].label} <ArrowRight class="h-4 w-4" />
					</Button>
				{/if}
				<Button variant="ghost" disabled={$setStatus.isPending} onclick={cancelQuery}>
					<Ban class="h-4 w-4" /> Cancel
				</Button>
			{/if}
		</div>
	</div>

	<Stepper status={q.status} />

	<!-- Financial summary — the query's agreed figures (set when a quotation is
	     accepted or a booking syncs). -->
	{#if Number(q.selling_price) > 0}
		<div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
			<Card>
				<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Total Cost</div>
				<div class="mt-1 text-xl font-bold text-slate-800">{formatAmount(Number(q.cost_price), 'PKR')}</div>
			</Card>
			<Card>
				<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Total Selling</div>
				<div class="mt-1 text-xl font-bold text-slate-800">{formatAmount(Number(q.selling_price), 'PKR')}</div>
			</Card>
			<Card>
				<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Profit</div>
				<div class="mt-1 text-xl font-bold text-green-600">{formatAmount(Number(q.profit), 'PKR')}</div>
			</Card>
			<Card>
				<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Margin</div>
				<div class="mt-1 text-xl font-bold text-slate-800">{Number(q.profit_margin).toFixed(1)}%</div>
			</Card>
		</div>
	{/if}

	<div class="mb-6">
		<StageActions query={q} />
	</div>

	<div class="mb-8">
		<QuotationList queryId={id} />
	</div>

	{#if q.status === 'Booking'}
		<div class="mb-8">
			<BookingPanel queryId={id} />
		</div>

		<div class="mb-4 flex gap-2">
			<Button variant="secondary" size="sm" href="/queries/{id}/voucher">
				<FileText class="h-4 w-4" /> Voucher
			</Button>
			<Button variant="secondary" size="sm" href="/queries/{id}/itinerary">
				<Map class="h-4 w-4" /> Itinerary
			</Button>
		</div>

		<div class="mb-8">
			<DocumentsPanel entityType="query" entityId={id} />
		</div>
	{/if}
{/if}
