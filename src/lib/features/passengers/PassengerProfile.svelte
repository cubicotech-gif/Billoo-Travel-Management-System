<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, Phone, Mail, MapPin, Plane, Wallet, FolderOpen, ListChecks, LayoutGrid } from 'lucide-svelte';
	import { Badge, Card, WhatsAppLink } from '$ui';
	import { formatAmount, sum, money, toNumber } from '$lib/money';
	import { stageFor, BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '$features/queries/workflow';
	import DocumentsPanel from '$features/documents/DocumentsPanel.svelte';
	import PassengerDocAlert from '$features/documents/PassengerDocAlert.svelte';
	import { PASSENGER_DOCUMENT_TYPES } from '$features/documents/api';
	import { useBookingFinance } from '$features/finance/queries';
	import { usePassenger, usePassengerQueries } from './queries';
	import { listPaymentsForQueries, paymentStatus, type Payment } from '$features/payments/api';
	import { fullName } from './types';

	let { id }: { id: string } = $props();

	const passenger = untrack(() => usePassenger(id));
	const queries = untrack(() => usePassengerQueries(id));
	const finance = untrack(() => useBookingFinance());

	const financeMap = $derived($finance.data ?? new Map());
	const queryRef = $derived(new Map(($queries.data ?? []).map((q) => [q.id, q.query_number])));

	// Booked trips = queries that reached the Booking stage.
	const trips = $derived(($queries.data ?? []).filter((q) => q.status === 'Booking'));

	// Payment ledger across every query for this passenger.
	let payments = $state<Payment[]>([]);
	$effect(() => {
		const ids = ($queries.data ?? []).map((q) => q.id);
		if (ids.length === 0) {
			payments = [];
			return;
		}
		listPaymentsForQueries(ids).then((r) => (payments = r));
	});
	const paymentsByQuery = $derived.by(() => {
		const m = new Map<string, Payment[]>();
		for (const p of payments) {
			const arr = m.get(p.query_id) ?? [];
			arr.push(p);
			m.set(p.query_id, arr);
		}
		return m;
	});

	// Lifetime money snapshot, from the booked trips.
	const sumOf = (pick: (f: { owed: number; paid: number; balance: number }) => number) =>
		toNumber(
			sum(
				trips.map((q) => {
					const f = financeMap.get(q.id);
					return money(f ? pick(f) : 0, 'PKR');
				})
			)
		);
	const totalBilled = $derived(sumOf((f) => f.owed));
	const totalPaid = $derived(sumOf((f) => f.paid));
	const outstanding = $derived(sumOf((f) => f.balance));

	const payTone = { paid: 'success', overdue: 'danger', pending: 'warning' } as const;

	type Tab = 'overview' | 'trips' | 'payments' | 'documents' | 'queries';
	let tab = $state<Tab>('overview');
	const TABS: { id: Tab; label: string; icon: typeof Plane }[] = [
		{ id: 'overview', label: 'Overview', icon: LayoutGrid },
		{ id: 'trips', label: 'Trips', icon: Plane },
		{ id: 'payments', label: 'Payments', icon: Wallet },
		{ id: 'documents', label: 'Documents', icon: FolderOpen },
		{ id: 'queries', label: 'Queries', icon: ListChecks }
	];

	function payPct(f: { owed: number; paid: number; paidInFull: boolean } | undefined): number {
		if (!f) return 0;
		return f.owed > 0 ? Math.min(100, Math.round((f.paid / f.owed) * 100)) : f.paidInFull ? 100 : 0;
	}
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
	<div class="mb-4">
		<h1 class="text-2xl font-bold text-slate-800">{fullName(p)}</h1>
		<div class="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
			<span class="inline-flex items-center gap-1"><Phone class="h-4 w-4" /> {p.phone}</span>
			<WhatsAppLink number={p.whatsapp ?? p.phone} label="WhatsApp" />
			{#if p.email}<span class="inline-flex items-center gap-1"><Mail class="h-4 w-4" /> {p.email}</span>{/if}
			{#if p.city}<span class="inline-flex items-center gap-1"><MapPin class="h-4 w-4" /> {p.city}</span>{/if}
		</div>
	</div>

	<!-- Tab bar -->
	<div class="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
		{#each TABS as t (t.id)}
			{@const Icon = t.icon}
			<button
				type="button"
				onclick={() => (tab = t.id)}
				class="-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors {tab === t.id
					? 'border-brand-500 text-brand-700'
					: 'border-transparent text-slate-500 hover:text-slate-700'}"
			>
				<Icon class="h-4 w-4" />
				{t.label}
				{#if t.id === 'trips' && trips.length}<span class="rounded-full bg-slate-100 px-1.5 text-xs text-slate-500">{trips.length}</span>{/if}
			</button>
		{/each}
	</div>

	{#if tab === 'overview'}
		<PassengerDocAlert passengerId={id} />
		<div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
			<Card><div class="text-xs uppercase tracking-wide text-slate-400">Trips booked</div><div class="mt-1 text-2xl font-bold text-slate-800">{trips.length}</div></Card>
			<Card><div class="text-xs uppercase tracking-wide text-slate-400">Total billed</div><div class="mt-1 text-2xl font-bold text-slate-800">{formatAmount(totalBilled, 'PKR')}</div></Card>
			<Card><div class="text-xs uppercase tracking-wide text-slate-400">Paid</div><div class="mt-1 text-2xl font-bold text-green-600">{formatAmount(totalPaid, 'PKR')}</div></Card>
			<Card><div class="text-xs uppercase tracking-wide text-slate-400">Outstanding</div><div class="mt-1 text-2xl font-bold {outstanding > 0 ? 'text-amber-600' : 'text-green-600'}">{formatAmount(outstanding, 'PKR')}</div></Card>
		</div>
		<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<Card><div class="text-xs font-medium uppercase tracking-wide text-slate-400">CNIC</div><div class="mt-1 text-sm font-semibold text-slate-700">{p.cnic ?? '—'}</div></Card>
			<Card><div class="text-xs font-medium uppercase tracking-wide text-slate-400">Passport</div><div class="mt-1 text-sm font-semibold text-slate-700">{p.passport_number ?? '—'}</div></Card>
			<Card><div class="text-xs font-medium uppercase tracking-wide text-slate-400">Passport expiry</div><div class="mt-1 text-sm font-semibold text-slate-700">{fmtDate(p.passport_expiry)}</div></Card>
			<Card><div class="text-xs font-medium uppercase tracking-wide text-slate-400">WhatsApp</div><div class="mt-1 text-sm font-semibold text-slate-700">{p.whatsapp ?? '—'}</div></Card>
		</div>
	{:else if tab === 'trips'}
		{#if trips.length === 0}
			<div class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">No booked trips yet.</div>
		{:else}
			<div class="space-y-4">
				{#each trips as q (q.id)}
					{@const f = financeMap.get(q.id)}
					{@const tripPays = paymentsByQuery.get(q.id) ?? []}
					<div class="rounded-xl border border-slate-200 bg-white p-4">
						<div class="mb-3 flex flex-wrap items-start justify-between gap-2">
							<div>
								<a href="/queries/{q.id}" class="font-semibold text-slate-800 hover:text-brand-600">{q.destination || q.client_name}</a>
								<div class="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
									<span class="font-mono">{q.query_number}</span>
									{#if q.travel_date}<span>· {fmtDate(q.travel_date)}{q.return_date ? ` → ${fmtDate(q.return_date)}` : ''}</span>{/if}
								</div>
							</div>
							{#if q.booking_status}
								<Badge tone={BOOKING_STATUS_TONE[q.booking_status]}>{BOOKING_STATUS_LABEL[q.booking_status]}</Badge>
							{:else}
								<Badge tone="neutral">Building</Badge>
							{/if}
						</div>

						{#if f}
							<div class="mb-2 grid grid-cols-3 gap-2 text-sm">
								<div><div class="text-xs text-slate-400">Package</div><div class="font-semibold text-slate-700">{formatAmount(f.owed, 'PKR')}</div></div>
								<div><div class="text-xs text-slate-400">Paid</div><div class="font-semibold text-green-600">{formatAmount(f.paid, 'PKR')}</div></div>
								<div><div class="text-xs text-slate-400">Balance</div><div class="font-semibold {f.balance > 0 && !f.paidInFull ? 'text-amber-600' : 'text-green-600'}">{formatAmount(f.balance, 'PKR')}</div></div>
							</div>
							<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
								<div class="h-full rounded-full {f.paidInFull ? 'bg-green-500' : 'bg-amber-400'}" style="width: {payPct(f)}%"></div>
							</div>
						{/if}

						{#if tripPays.length}
							<div class="mt-3 border-t border-slate-100 pt-2">
								<div class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Payments</div>
								<div class="space-y-1">
									{#each tripPays as pay (pay.id)}
										{@const st = paymentStatus(pay)}
										<div class="flex items-center justify-between text-sm">
											<span class="text-slate-500">{fmtDate(pay.paid_date ?? pay.due_date)} · {pay.label}</span>
											<span class="flex items-center gap-2">
												<span class="text-slate-700">{formatAmount(Number(pay.amount), 'PKR')}</span>
												<Badge tone={payTone[st]}>{st}</Badge>
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{:else if tab === 'payments'}
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-800">Payments</h2>
			{#if payments.length}
				<span class="text-sm text-slate-500">Total received: <span class="font-semibold text-green-600">{formatAmount(totalPaid, 'PKR')}</span></span>
			{/if}
		</div>
		{#if payments.length === 0}
			<div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">No payments recorded yet.</div>
		{:else}
			<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<table class="w-full text-sm">
					<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
						<tr><th class="px-4 py-3 font-medium">Query</th><th class="px-4 py-3 font-medium">Label</th><th class="px-4 py-3 text-right font-medium">Amount</th><th class="px-4 py-3 font-medium">Date</th><th class="px-4 py-3 font-medium">Status</th></tr>
					</thead>
					<tbody class="divide-y divide-slate-50">
						{#each payments as pay (pay.id)}
							{@const st = paymentStatus(pay)}
							<tr class="hover:bg-slate-50">
								<td class="px-4 py-3 font-mono text-xs"><a href="/queries/{pay.query_id}" class="text-brand-600 hover:underline">{queryRef.get(pay.query_id) ?? '—'}</a></td>
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
	{:else if tab === 'documents'}
		<DocumentsPanel entityType="passenger" entityId={id} title="Document vault" types={PASSENGER_DOCUMENT_TYPES} />
	{:else if tab === 'queries'}
		{#if ($queries.data ?? []).length === 0}
			<div class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">No queries yet for this passenger.</div>
		{:else}
			<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<table class="w-full text-sm">
					<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
						<tr><th class="px-4 py-3 font-medium">Query</th><th class="px-4 py-3 font-medium">Destination</th><th class="px-4 py-3 font-medium">Stage</th><th class="px-4 py-3 text-right font-medium">Selling</th><th class="px-4 py-3 font-medium">Created</th></tr>
					</thead>
					<tbody class="divide-y divide-slate-50">
						{#each $queries.data ?? [] as q (q.id)}
							<tr class="hover:bg-slate-50">
								<td class="px-4 py-3 font-mono text-xs"><a href="/queries/{q.id}" class="text-brand-600 hover:underline">{q.query_number}</a></td>
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
	{/if}
{/if}
