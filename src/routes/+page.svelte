<script lang="ts">
	import { Card, Badge } from '$lib/ui';
	import { useQueries } from '$features/queries/queries';
	import { MAIN_STAGES, isCancelled, isSettled } from '$features/queries/workflow';
	import { formatAmount } from '$lib/money';

	const queries = useQueries();

	// Live pipeline counts + headline numbers, derived from the cached list.
	// "Open" = still active: not cancelled and not a settled (Completed) booking.
	const stats = $derived.by(() => {
		const rows = $queries.data ?? [];
		const open = rows.filter(
			(q) => !isCancelled(q.status) && !isSettled(q.status, q.booking_status)
		);
		const pipelineValue = open.reduce((acc, q) => acc + Number(q.selling_price), 0);
		const projectedProfit = open.reduce((acc, q) => acc + Number(q.profit), 0);
		const byStage = MAIN_STAGES.map((s) => ({
			stage: s,
			count: rows.filter((q) => q.status === s.status).length
		}));
		return { total: rows.length, open: open.length, pipelineValue, projectedProfit, byStage };
	});
</script>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-slate-800">Dashboard</h1>
	<p class="text-sm text-slate-500">Umrah season at a glance.</p>
</div>

{#if $queries.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $queries.isError}
	<p class="text-red-600">Failed to load: {$queries.error.message}</p>
{:else}
	<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Total Queries</div>
			<div class="mt-1 text-2xl font-bold text-slate-800">{stats.total}</div>
		</Card>
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Open</div>
			<div class="mt-1 text-2xl font-bold text-slate-800">{stats.open}</div>
		</Card>
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Pipeline Value</div>
			<div class="mt-1 text-2xl font-bold text-slate-800">{formatAmount(stats.pipelineValue)}</div>
		</Card>
		<Card>
			<div class="text-xs font-medium uppercase tracking-wide text-slate-400">Projected Profit</div>
			<div class="mt-1 text-2xl font-bold text-green-600">{formatAmount(stats.projectedProfit)}</div>
		</Card>
	</div>

	<Card title="Pipeline">
		<div class="flex flex-wrap gap-2">
			{#each stats.byStage as { stage, count } (stage.status)}
				<div class="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
					<Badge tone={stage.tone}>{stage.label}</Badge>
					<span class="text-sm font-semibold text-slate-700">{count}</span>
				</div>
			{/each}
		</div>
	</Card>
{/if}
