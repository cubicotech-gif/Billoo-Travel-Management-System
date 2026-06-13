<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft, ArrowRight, Ban, Map, Pencil, Trash2, RotateCcw } from 'lucide-svelte';
	import { Badge, Button, Card, WhatsAppLink } from '$ui';
	import { formatAmount } from '$lib/money';
	import {
		useQueryDetail,
		useSetQueryStatus,
		useSoftDeleteQuery,
		useRestoreQuery
	} from './queries';
	import QueryEditModal from './QueryEditModal.svelte';
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
	import StageActions from './StageActions.svelte';
	import ConfirmationPanel from './ConfirmationPanel.svelte';
	import PaymentSchedule from '$features/payments/PaymentSchedule.svelte';
	import QuotationList from '$features/quotations/QuotationList.svelte';
	import BookingPanel from '$features/bookings/BookingPanel.svelte';
	import DocumentsPanel from '$features/documents/DocumentsPanel.svelte';
	import PassengerDocAlert from '$features/documents/PassengerDocAlert.svelte';
	import { QUERY_DOCUMENT_TYPES } from '$features/documents/api';

	// `id` is stable for this component instance: the route keys on it, so a
	// different query remounts us.
	let { id }: { id: string } = $props();

	const query = untrack(() => useQueryDetail(id));
	const setStatus = useSetQueryStatus();
	const softDelete = useSoftDeleteQuery();
	const restore = useRestoreQuery();

	let editing = $state(false);

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
	<!-- Rich summary header: state at a glance, not a blank form. -->
	<div class="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
		<div class="flex flex-wrap items-start justify-between gap-4">
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
				<Button variant="ghost" onclick={() => (editing = true)}><Pencil class="h-4 w-4" /> Edit</Button>
				<Button variant="ghost" disabled={$softDelete.isPending} onclick={deleteQuery}>
					<Trash2 class="h-4 w-4" /> Delete
				</Button>
			</div>
		</div>

		<!-- Facts -->
		<div class="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Package</div>
				<div class="font-medium text-slate-700">{q.package_type ?? q.destination}</div>
			</div>
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Pax</div>
				<div class="font-medium text-slate-700">
					{q.adults}A{q.children ? ` · ${q.children}C` : ''}{q.infants ? ` · ${q.infants}I` : ''}
				</div>
			</div>
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Est. value</div>
				<div class="font-medium text-slate-700">
					{Number(q.selling_price) > 0 ? formatAmount(Number(q.selling_price), 'PKR') : '—'}
				</div>
			</div>
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Owner</div>
				<div class="font-medium text-slate-700">{q.created_by_staff ?? '—'}</div>
			</div>
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">In stage</div>
				<div class="font-medium {stuck ? 'text-red-600' : 'text-slate-700'}">{days}d</div>
			</div>
		</div>

		{#if (q.itinerary_cities ?? []).length}
			<div class="mt-3 border-t border-slate-100 pt-3 text-sm">
				<span class="text-xs uppercase tracking-wide text-slate-400">Itinerary</span>
				<div class="text-slate-700">
					{(q.itinerary_cities ?? []).map((c) => `${c.city} ${c.nights}N`).join(' · ')}
				</div>
			</div>
		{/if}

		<!-- Completion chips -->
		<div class="mt-4 flex flex-wrap gap-2">
			<Badge tone={q.responded ? 'success' : 'neutral'}>{q.responded ? 'Responded' : 'Not responded'}</Badge>
			<Badge tone={Number(q.selling_price) > 0 ? 'success' : 'neutral'}>{Number(q.selling_price) > 0 ? 'Priced' : 'Not priced'}</Badge>
			<Badge tone={q.advance_payment_amount ? 'success' : 'warning'}>
				{q.advance_payment_amount ? `Advance ${formatAmount(Number(q.advance_payment_amount), 'PKR')}` : 'No advance'}
			</Badge>
		</div>
	</div>

	{#if q.passenger_id}
		<PassengerDocAlert passengerId={q.passenger_id} />
	{/if}

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

		<div class="mb-8">
			<PaymentSchedule queryId={id} sellingPkr={Number(q.selling_price)} />
		</div>

		<div class="mb-8">
			<ConfirmationPanel query={q} queryId={id} />
		</div>

		<div class="mb-4">
			<Button variant="secondary" size="sm" href="/queries/{id}/itinerary">
				<Map class="h-4 w-4" /> Itinerary
			</Button>
		</div>

		<div class="mb-8">
			<DocumentsPanel entityType="query" entityId={id} types={QUERY_DOCUMENT_TYPES} />
		</div>
	{/if}

	<QueryEditModal query={q} open={editing} onClose={() => (editing = false)} />
{/if}
