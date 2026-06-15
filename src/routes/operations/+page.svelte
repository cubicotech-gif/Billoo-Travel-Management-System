<script lang="ts">
	import { Badge, Select } from '$ui';
	import { Wallet, PlaneTakeoff, CheckCircle2, ExternalLink } from 'lucide-svelte';
	import { useQueries, useUpdateQuery } from '$features/queries/queries';
	import { BOOKING_STATUSES } from '$features/queries/workflow';
	import { OPS_LANES, groupIntoLanes, totalOutstanding, type OpsCard } from '$features/operations/lanes';
	import { formatAmount } from '$lib/money';
	import type { BookingStatus } from '$lib/database.types';

	const queries = useQueries();
	const update = useUpdateQuery();

	const lanes = $derived(groupIntoLanes($queries.data ?? []));
	const outstanding = $derived(totalOutstanding(lanes));

	const laneIcon = { payments: Wallet, checkins: PlaneTakeoff, completed: CheckCircle2 } as const;
	const headerTone: Record<string, string> = {
		warning: 'text-amber-700',
		info: 'text-brand-700',
		success: 'text-green-700'
	};

	const statusOptions = BOOKING_STATUSES.map((b) => b.status);

	function reference(card: OpsCard): string {
		const q = card.query;
		return `BLO-${new Date(q.created_at).getFullYear()}-${q.query_number.slice(-4)}`;
	}
	function pax(card: OpsCard): string {
		const q = card.query;
		return `${q.adults}A${q.children ? `·${q.children}C` : ''}${q.infants ? `·${q.infants}I` : ''}`;
	}

	// Re-lane a booking by changing its status; settling marks completed_date.
	function setStatus(card: OpsCard, next: BookingStatus) {
		if (next === card.query.booking_status) return;
		$update.mutate({
			id: card.query.id,
			patch: {
				booking_status: next,
				completed_date:
					next === 'Completed'
						? (card.query.completed_date ?? new Date().toISOString())
						: card.query.completed_date
			}
		});
	}
</script>

<div class="mb-6 flex items-end justify-between">
	<div>
		<h1 class="text-2xl font-bold text-slate-800">Operations</h1>
		<p class="text-sm text-slate-500">
			Booked deals, off the sales board — follow up on payments and check-ins here.
		</p>
	</div>
	{#if outstanding > 0}
		<div class="rounded-lg bg-amber-50 px-4 py-2 text-right">
			<div class="text-xs font-medium uppercase tracking-wide text-amber-600">Outstanding</div>
			<div class="text-lg font-bold text-amber-700">{formatAmount(outstanding)}</div>
		</div>
	{/if}
</div>

{#if $queries.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $queries.isError}
	<p class="text-red-600">Failed to load: {$queries.error.message}</p>
{:else}
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		{#each OPS_LANES as lane (lane.id)}
			{@const cards = lanes[lane.id]}
			{@const Icon = laneIcon[lane.id]}
			<div class="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60">
				<div class="border-b border-slate-200/70 px-4 py-3">
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-2 text-sm font-semibold {headerTone[lane.tone]}">
							<Icon class="h-4 w-4" /> {lane.label}
						</span>
						<span class="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm">
							{cards.length}
						</span>
					</div>
					<p class="mt-0.5 text-xs text-slate-400">{lane.hint}</p>
				</div>

				<div class="flex flex-1 flex-col gap-2 p-3">
					{#each cards as card (card.query.id)}
						<div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0">
									<div class="truncate text-sm font-semibold text-slate-800">{card.query.client_name}</div>
									<div class="font-mono text-[10px] text-slate-400">{reference(card)}</div>
								</div>
								<a
									href="/queries/{card.query.id}"
									class="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
									aria-label="Open booking"
								>
									<ExternalLink class="h-4 w-4" />
								</a>
							</div>

							<div class="mt-1 text-xs text-slate-500">
								{card.query.package_type ?? card.query.destination} · {pax(card)}{card.query
									.duration_days
									? ` · ${card.query.duration_days}N`
									: ''}
							</div>

							<div class="mt-2 flex items-center justify-between text-xs">
								<span class="text-slate-500">Total {formatAmount(card.selling)}</span>
								{#if card.balance > 0}
									<Badge tone="warning">Balance {formatAmount(card.balance)}</Badge>
								{:else}
									<Badge tone="success">Paid</Badge>
								{/if}
							</div>

							<div class="mt-2">
								<Select
									value={card.query.booking_status ?? ''}
									options={statusOptions}
									onchange={(v) => setStatus(card, v as BookingStatus)}
								/>
							</div>
						</div>
					{/each}

					{#if cards.length === 0}
						<div class="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-300">
							Nothing here
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if lanes.payments.length + lanes.checkins.length + lanes.completed.length === 0}
		<div class="mt-6 rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
			<p class="text-sm text-slate-400">No booked deals yet.</p>
			<p class="mt-1 text-xs text-slate-400">
				Confirm a booking from a query's <Badge tone="success">Booking</Badge> stage and it'll show up here.
			</p>
		</div>
	{/if}
{/if}
