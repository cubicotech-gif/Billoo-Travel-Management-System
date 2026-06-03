<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, ArrowRight, Ban, Pencil, Plus, Trash2 } from 'lucide-svelte';
	import { Badge, Button, Card } from '$ui';
	import { formatMoney, formatAmount } from '$lib/money';
	import {
		useQueryDetail,
		useQueryServices,
		useSetQueryStatus,
		useDeleteService
	} from './queries';
	import {
		STAGE_BY_STATUS,
		BOOKING_STATUS_TONE,
		stageFor,
		nextStatus,
		prevStatus,
		isCancelled
	} from './workflow';
	import { rollupServices } from './totals';
	import ServiceModal from './ServiceModal.svelte';
	import Stepper from './Stepper.svelte';
	import StageActions from './StageActions.svelte';
	import QuotationList from '$features/quotations/QuotationList.svelte';
	import BookingPanel from '$features/bookings/BookingPanel.svelte';
	import DocumentsPanel from '$features/documents/DocumentsPanel.svelte';
	import { FileText, Map } from 'lucide-svelte';
	import type { QueryService } from './types';

	// `id` is stable for this component instance: the route keys on it, so a
	// different query remounts us. untrack documents that the query hooks
	// intentionally bind to the id captured at mount.
	let { id }: { id: string } = $props();

	const query = untrack(() => useQueryDetail(id));
	const services = untrack(() => useQueryServices(id));
	const setStatus = useSetQueryStatus();
	const deleteService = untrack(() => useDeleteService(id));

	// Live financial rollup from the service lines, via the money layer.
	const totals = $derived(rollupServices($services.data ?? []));

	let modalOpen = $state(false);
	let editing = $state<QueryService | null>(null);

	function openAdd() {
		editing = null;
		modalOpen = true;
	}

	function openEdit(s: QueryService) {
		editing = s;
		modalOpen = true;
	}

	function remove(s: QueryService) {
		if (confirm(`Delete "${s.service_description}"?`)) $deleteService.mutate(s.id);
	}

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

	<!-- Financial summary, derived live from services -->
	<div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Total Cost</div>
			<div class="mt-1 text-xl font-bold text-slate-800">{formatMoney(totals.cost)}</div>
		</Card>
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Total Selling</div>
			<div class="mt-1 text-xl font-bold text-slate-800">{formatMoney(totals.selling)}</div>
		</Card>
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Profit</div>
			<div class="mt-1 text-xl font-bold text-green-600">{formatMoney(totals.profit)}</div>
		</Card>
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Margin</div>
			<div class="mt-1 text-xl font-bold text-slate-800">{totals.marginPct.toFixed(1)}%</div>
		</Card>
	</div>

	<!-- Services -->
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-slate-800">Services</h2>
		<Button size="sm" onclick={openAdd}><Plus class="h-4 w-4" /> Add service</Button>
	</div>

	{#if $services.isLoading}
		<p class="text-slate-400">Loading services…</p>
	{:else if ($services.data ?? []).length === 0}
		<div class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
			No services yet. Add flights, hotels, visa, transport — each line feeds the profit above.
		</div>
	{:else}
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
			<table class="w-full text-sm">
				<thead
					class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400"
				>
					<tr>
						<th class="px-4 py-3 font-medium">Type</th>
						<th class="px-4 py-3 font-medium">Description</th>
						<th class="px-4 py-3 font-medium">Vendor</th>
						<th class="px-4 py-3 text-right font-medium">Qty</th>
						<th class="px-4 py-3 text-right font-medium">Cost</th>
						<th class="px-4 py-3 text-right font-medium">Selling</th>
						<th class="px-4 py-3 text-right font-medium">Profit</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-50">
					{#each $services.data ?? [] as s (s.id)}
						{@const lineProfit = (Number(s.selling_price) - Number(s.cost_price)) * s.quantity}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3"><Badge tone="info">{s.service_type}</Badge></td>
							<td class="px-4 py-3 text-slate-700">{s.service_description}</td>
							<td class="px-4 py-3 text-slate-500">{s.vendor ?? '—'}</td>
							<td class="px-4 py-3 text-right text-slate-600">{s.quantity}</td>
							<td class="px-4 py-3 text-right text-slate-600"
								>{formatAmount(Number(s.cost_price) * s.quantity)}</td
							>
							<td class="px-4 py-3 text-right text-slate-600"
								>{formatAmount(Number(s.selling_price) * s.quantity)}</td
							>
							<td class="px-4 py-3 text-right font-medium text-green-600"
								>{formatAmount(lineProfit)}</td
							>
							<td class="px-4 py-3">
								<div class="flex justify-end gap-1">
									<button
										onclick={() => openEdit(s)}
										class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
										aria-label="Edit"
									>
										<Pencil class="h-4 w-4" />
									</button>
									<button
										onclick={() => remove(s)}
										class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
										aria-label="Delete"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<ServiceModal queryId={id} service={editing} open={modalOpen} onClose={() => (modalOpen = false)} />
{/if}
