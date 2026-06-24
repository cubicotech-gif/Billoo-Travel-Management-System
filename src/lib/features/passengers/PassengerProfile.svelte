<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, Phone, Mail, MapPin } from 'lucide-svelte';
	import { Badge, Card, WhatsAppLink } from '$ui';
	import { formatAmount } from '$lib/money';
	import { stageFor } from '$features/queries/workflow';
	import DocumentsPanel from '$features/documents/DocumentsPanel.svelte';
	import PassengerDocAlert from '$features/documents/PassengerDocAlert.svelte';
	import { PASSENGER_DOCUMENT_TYPES } from '$features/documents/api';
	import { usePassenger, usePassengerQueries } from './queries';
	import { listPaymentsForQueries, paymentStatus, type Payment } from '$features/payments/api';
	import { sum, money, toNumber } from '$lib/money';
	import { fullName } from './types';

	let { id }: { id: string } = $props();

	const passenger = untrack(() => usePassenger(id));
	const queries = untrack(() => usePassengerQueries(id));

	// Payment ledger across every query for this passenger — early payments and
	// booking balances all land here once recorded.
	let payments = $state<Payment[]>([]);
	const queryRef = $derived(
		new Map(($queries.data ?? []).map((q) => [q.id, q.query_number]))
	);
	$effect(() => {
		const ids = ($queries.data ?? []).map((q) => q.id);
		if (ids.length === 0) {
			payments = [];
			return;
		}
		listPaymentsForQueries(ids).then((r) => (payments = r));
	});
	const totalPaid = $derived(
		toNumber(sum(payments.filter((p) => p.status === 'paid').map((p) => money(Number(p.amount), 'PKR'))))
	);

	const payTone = { paid: 'success', overdue: 'danger', pending: 'warning' } as const;

	function fmtDate(iso: string | null): string {
		return iso ? new Date(iso).toLocaleDateString() : '—';
	}
</script>

<a href="/passengers" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
	<ArrowLeft class="h-4 w-4" /> Back to passengers
</a>

{#if $passenger.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $passenger.isError}
	<p class="text-red-600">Failed to load: {$passenger.error.message}</p>
{:else if $passenger.data}
	{@const p = $passenger.data}
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-slate-800">{fullName(p)}</h1>
		<div class="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
			<span class="inline-flex items-center gap-1"><Phone class="h-4 w-4" /> {p.phone}</span>
			<WhatsAppLink number={p.whatsapp ?? p.phone} label="WhatsApp" />
			{#if p.email}<span class="inline-flex items-center gap-1"><Mail class="h-4 w-4" /> {p.email}</span>{/if}
			{#if p.city}<span class="inline-flex items-center gap-1"><MapPin class="h-4 w-4" /> {p.city}</span>{/if}
		</div>
	</div>

	<PassengerDocAlert passengerId={id} />

	<div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">CNIC</div>
			<div class="mt-1 text-sm font-semibold text-slate-700">{p.cnic ?? '—'}</div>
		</Card>
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Passport</div>
			<div class="mt-1 text-sm font-semibold text-slate-700">{p.passport_number ?? '—'}</div>
		</Card>
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Passport expiry</div>
			<div class="mt-1 text-sm font-semibold text-slate-700">{fmtDate(p.passport_expiry)}</div>
		</Card>
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">WhatsApp</div>
			<div class="mt-1 text-sm font-semibold text-slate-700">{p.whatsapp ?? '—'}</div>
		</Card>
	</div>

	<h2 class="mb-3 text-lg font-semibold text-slate-800">Query history</h2>
	{#if $queries.isLoading}
		<p class="text-slate-400">Loading…</p>
	{:else if ($queries.data ?? []).length === 0}
		<div class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
			No queries yet for this passenger.
		</div>
	{:else}
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
			<table class="w-full text-sm">
				<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
					<tr>
						<th class="px-4 py-3 font-medium">Query</th>
						<th class="px-4 py-3 font-medium">Destination</th>
						<th class="px-4 py-3 font-medium">Stage</th>
						<th class="px-4 py-3 text-right font-medium">Selling</th>
						<th class="px-4 py-3 font-medium">Created</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-50">
					{#each $queries.data ?? [] as q (q.id)}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3 font-mono text-xs">
								<a href="/queries/{q.id}" class="text-brand-600 hover:underline">{q.query_number}</a>
							</td>
							<td class="px-4 py-3 text-slate-600">{q.destination}</td>
							<td class="px-4 py-3"><Badge tone={stageFor(q.status).tone}>{stageFor(q.status).label}</Badge></td>
							<td class="px-4 py-3 text-right text-slate-700">{formatAmount(Number(q.selling_price))}</td>
							<td class="px-4 py-3 text-xs text-slate-400">{fmtDate(q.created_at)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<div class="mt-8">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-800">Payments</h2>
			{#if payments.length}
				<span class="text-sm text-slate-500">Total received: <span class="font-semibold text-green-600">{formatAmount(totalPaid, 'PKR')}</span></span>
			{/if}
		</div>
		{#if payments.length === 0}
			<div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
				No payments recorded yet.
			</div>
		{:else}
			<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<table class="w-full text-sm">
					<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
						<tr>
							<th class="px-4 py-3 font-medium">Query</th>
							<th class="px-4 py-3 font-medium">Label</th>
							<th class="px-4 py-3 text-right font-medium">Amount</th>
							<th class="px-4 py-3 font-medium">Date</th>
							<th class="px-4 py-3 font-medium">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-50">
						{#each payments as pay (pay.id)}
							{@const st = paymentStatus(pay)}
							<tr class="hover:bg-slate-50">
								<td class="px-4 py-3 font-mono text-xs">
									<a href="/queries/{pay.query_id}" class="text-brand-600 hover:underline">{queryRef.get(pay.query_id) ?? '—'}</a>
								</td>
								<td class="px-4 py-3 text-slate-600">{pay.label}</td>
								<td class="px-4 py-3 text-right text-slate-700">{formatAmount(Number(pay.amount), 'PKR')}</td>
								<td class="px-4 py-3 text-xs text-slate-400">{fmtDate(pay.paid_date ?? pay.due_date)}</td>
								<td class="px-4 py-3"><Badge tone={payTone[st]}>{st}</Badge></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<div class="mt-8">
		<DocumentsPanel
			entityType="passenger"
			entityId={id}
			title="Document vault"
			types={PASSENGER_DOCUMENT_TYPES}
		/>
	</div>
{/if}
