<script lang="ts">
	import { Map, CheckCircle2, Wallet, Building2, FileText, IdCard } from 'lucide-svelte';
	import { Badge, Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import { BOOKING_STATUS_TONE } from './workflow';
	import BookingPanel from '$features/bookings/BookingPanel.svelte';
	import PaymentSchedule from '$features/payments/PaymentSchedule.svelte';
	import ConfirmationPanel from './ConfirmationPanel.svelte';
	import BookingDocChecklist from '$features/documents/BookingDocChecklist.svelte';
	import DocumentsPanel from '$features/documents/DocumentsPanel.svelte';
	import { QUERY_DOCUMENT_TYPES, PASSENGER_DOCUMENT_TYPES } from '$features/documents/api';
	import type { Query } from './types';

	let { query, queryId, reference }: { query: Query; queryId: string; reference: string } = $props();

	const selling = $derived(Number(query.selling_price) || 0);
	const advance = $derived(Number(query.advance_payment_amount ?? 0) || 0);
	const balance = $derived(Math.max(0, selling - advance));
	const pax = $derived(
		`${query.adults}A${query.children ? `·${query.children}C` : ''}${query.infants ? `·${query.infants}I` : ''}`
	);
</script>

<!-- Summary bar: the booking at a glance. -->
<div class="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<h2 class="text-lg font-semibold text-slate-800">Booking</h2>
				{#if query.booking_status}
					<Badge tone={BOOKING_STATUS_TONE[query.booking_status]}>{query.booking_status}</Badge>
				{/if}
			</div>
			<div class="mt-1 text-sm text-slate-500">
				<span class="font-mono text-xs font-semibold text-slate-600">{reference}</span>
				· {query.package_type ?? query.destination} · {pax}
				{#if query.travel_date}· travel {query.travel_date}{/if}
			</div>
		</div>
		<Button variant="secondary" size="sm" href="/queries/{queryId}/itinerary">
			<Map class="h-4 w-4" /> Itinerary
		</Button>
	</div>

	<div class="mt-4 grid grid-cols-3 gap-3">
		<div class="rounded-lg bg-slate-50 p-3">
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Total</div>
			<div class="mt-0.5 text-lg font-bold text-slate-800">{formatAmount(selling)}</div>
		</div>
		<div class="rounded-lg bg-slate-50 p-3">
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Advance</div>
			<div class="mt-0.5 text-lg font-bold text-slate-800">{formatAmount(advance)}</div>
		</div>
		<div class="rounded-lg p-3 {balance > 0 ? 'bg-amber-50' : 'bg-green-50'}">
			<div class="text-xs font-medium uppercase tracking-wide {balance > 0 ? 'text-amber-600' : 'text-green-600'}">
				Balance
			</div>
			<div class="mt-0.5 text-lg font-bold {balance > 0 ? 'text-amber-700' : 'text-green-700'}">
				{balance > 0 ? formatAmount(balance) : 'Paid'}
			</div>
		</div>
	</div>
</div>

{#snippet sectionHead(Icon: typeof Wallet, label: string)}
	<div class="mb-2 flex items-center gap-2">
		<Icon class="h-4 w-4 text-slate-400" />
		<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</h3>
	</div>
{/snippet}

<section class="mb-8">
	{@render sectionHead(CheckCircle2, 'Confirmation')}
	<ConfirmationPanel {query} {queryId} />
</section>

<section class="mb-8">
	{@render sectionHead(CheckCircle2, 'Document readiness')}
	<BookingDocChecklist {queryId} passengerId={query.passenger_id} />
</section>

<section class="mb-8">
	{@render sectionHead(Wallet, 'Payments')}
	<PaymentSchedule {queryId} sellingPkr={selling} />
</section>

<section class="mb-8">
	{@render sectionHead(Building2, 'Vendor bookings')}
	<BookingPanel {queryId} />
</section>

<section class="mb-8">
	{@render sectionHead(FileText, 'Trip documents')}
	<DocumentsPanel entityType="query" entityId={queryId} title="Trip documents" types={QUERY_DOCUMENT_TYPES} />
</section>

{#if query.passenger_id}
	<section class="mb-8">
		{@render sectionHead(IdCard, 'Passenger documents (profile)')}
		<DocumentsPanel
			entityType="passenger"
			entityId={query.passenger_id}
			title="Passenger documents (profile)"
			types={PASSENGER_DOCUMENT_TYPES}
		/>
	</section>
{/if}
