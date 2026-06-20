<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft, ArrowRight, Ban, Pencil, Trash2, RotateCcw, FolderOpen } from 'lucide-svelte';
	import { Badge, Button, Card, WhatsAppLink } from '$ui';
	import {
		useQueryDetail,
		useSetQueryStatus,
		useSoftDeleteQuery,
		useRestoreQuery
	} from './queries';
	import { useQuotations } from '$features/quotations/queries';
	import QueryEditModal from './QueryEditModal.svelte';
	import QueryEditForm from './QueryEditForm.svelte';
	import {
		STAGE_BY_STATUS,
		BOOKING_STATUS_TONE,
		stageFor,
		nextStatus,
		prevStatus,
		isCancelled,
		daysSince,
		isStuck
	} from './workflow';
	import Stepper from './Stepper.svelte';
	import PackagePanel from './PackagePanel.svelte';
	import QuotedChat from './QuotedChat.svelte';
	import QuoteBuilder from '$features/quotations/QuoteBuilder.svelte';
	import QuotationList from '$features/quotations/QuotationList.svelte';
	import BookingPanel from '$features/bookings/BookingPanel.svelte';
	import PassengerDocAlert from '$features/documents/PassengerDocAlert.svelte';
	import DocumentsDialog from '$features/documents/DocumentsDialog.svelte';

	// `id` is stable for this component instance: the route keys on it, so a
	// different query remounts us.
	let { id }: { id: string } = $props();

	const query = untrack(() => useQueryDetail(id));
	const quotes = untrack(() => useQuotations(id));
	const setStatus = useSetQueryStatus();
	const softDelete = useSoftDeleteQuery();
	const restore = useRestoreQuery();

	let editing = $state(false);
	let docsOpen = $state(false);

	// Latest quotation = highest version.
	const latest = $derived(
		[...($quotes.data ?? [])].sort((a, b) => b.version - a.version)[0] ?? null
	);

	function cancelQuery() {
		if (confirm('Cancel this query? You can move it back into the pipeline later.'))
			$setStatus.mutate({ id, status: 'Cancelled' });
	}
	function deleteQuery() {
		if (confirm('Delete this query? It will be hidden but recoverable from “Deleted”.')) {
			$softDelete.mutate(id, { onSuccess: () => goto('/queries') });
		}
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
	{@const days = daysSince(q.stage_changed_at)}
	{@const stuck = isStuck(q.status, days)}
	{@const reference = `BLO-${new Date(q.created_at).getFullYear()}-${q.query_number.slice(-4)}`}

	{#if q.is_deleted}
		<div class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
			<span>This query is deleted — hidden from the board but recoverable.</span>
			<Button size="sm" variant="secondary" disabled={$restore.isPending} onclick={() => $restore.mutate(id)}>
				<RotateCcw class="h-4 w-4" /> Restore
			</Button>
		</div>
	{/if}

	<!-- Lean header: identity + stage controls. Details live in the side panel. -->
	<div class="mb-4 flex flex-wrap items-start justify-between gap-4">
		<div>
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-bold text-slate-800">{q.client_name}</h1>
				<Badge tone={stageFor(q.status).tone}>{stageFor(q.status).label}</Badge>
				{#if q.status === 'Booking' && q.booking_status}
					<Badge tone={BOOKING_STATUS_TONE[q.booking_status]}>{q.booking_status}</Badge>
				{/if}
				{#if stuck}<Badge tone="danger">Stuck · {days}d</Badge>{/if}
			</div>
			<div class="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
				<span class="font-mono text-xs font-semibold text-slate-600">{reference}</span>
				<WhatsAppLink number={q.client_phone} />
			</div>
		</div>
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
			<Button variant="secondary" onclick={() => (docsOpen = true)}><FolderOpen class="h-4 w-4" /> Documents</Button>
			<Button variant="ghost" onclick={() => (editing = true)}><Pencil class="h-4 w-4" /> Edit</Button>
			<Button variant="ghost" disabled={$softDelete.isPending} onclick={deleteQuery}>
				<Trash2 class="h-4 w-4" /> Delete
			</Button>
		</div>
	</div>

	<Stepper status={q.status} />

	{#if q.passenger_id}
		<PassengerDocAlert passengerId={q.passenger_id} />
	{/if}

	<!-- Workhub: a permanent context cover on top (details · recent updates ·
	     latest from client), then the stage's own tool full-width below it. -->
	<div class="mt-4 space-y-6">
		<PackagePanel query={q} {latest} compact />

		{#if q.status === 'New Query'}
			<Card title="New Query — add & edit details">
				<QueryEditForm query={q} onSaved={() => $setStatus.mutate({ id, status: 'Working' })} />
			</Card>
		{:else if q.status === 'Working'}
			<QuoteBuilder queryId={id} embedded />
		{:else if q.status === 'Quoted'}
			<QuotedChat queryId={id} {latest} />
			<QuotationList queryId={id} />
		{:else if q.status === 'Booking'}
			<BookingPanel queryId={id} />
		{:else}
			<Card title="Cancelled — edit & restore">
				<p class="mb-4 text-sm text-slate-500">
					This query is cancelled. Edit its details below, or use <span class="font-medium">Restore to New Query</span> above to bring it back into the pipeline.
				</p>
				<QueryEditForm query={q} />
			</Card>
		{/if}
	</div>

	<QueryEditModal query={q} open={editing} onClose={() => (editing = false)} />
	<DocumentsDialog queryId={id} passengerId={q.passenger_id} title="Documents" open={docsOpen} onClose={() => (docsOpen = false)} />
{/if}
