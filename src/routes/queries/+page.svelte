<script lang="ts">
	import { Button, Badge } from '$lib/ui';
	import { Plus } from 'lucide-svelte';
	import { useQueries, useCreateQuery, useSetQueryStatus } from '$features/queries/queries';
	import { STAGE_BY_STATUS, nextStatus } from '$features/queries/workflow';
	import { formatAmount } from '$lib/money';

	const queries = useQueries();
	const createQuery = useCreateQuery();
	const setStatus = useSetQueryStatus();

	let showForm = $state(false);
	let form = $state({ client_name: '', client_phone: '', destination: '' });

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		await $createQuery.mutateAsync({ ...form });
		form = { client_name: '', client_phone: '', destination: '' };
		showForm = false;
	}
</script>

<div class="mb-6 flex items-center justify-between">
	<div>
		<h1 class="text-2xl font-bold text-slate-800">Queries</h1>
		<p class="text-sm text-slate-500">The 10-stage booking pipeline.</p>
	</div>
	<Button onclick={() => (showForm = !showForm)}>
		<Plus class="h-4 w-4" /> New Query
	</Button>
</div>

{#if showForm}
	<form
		onsubmit={submit}
		class="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4"
	>
		<input
			placeholder="Client name"
			bind:value={form.client_name}
			required
			class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
		/>
		<input
			placeholder="Phone"
			bind:value={form.client_phone}
			required
			class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
		/>
		<input
			placeholder="Destination"
			bind:value={form.destination}
			required
			class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
		/>
		<Button type="submit" disabled={$createQuery.isPending}>
			{$createQuery.isPending ? 'Saving…' : 'Create'}
		</Button>
	</form>
{/if}

{#if $queries.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $queries.isError}
	<p class="text-red-600">Failed to load: {$queries.error.message}</p>
{:else if ($queries.data ?? []).length === 0}
	<div class="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
		No queries yet. Create your first one to start the season.
	</div>
{:else}
	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
				<tr>
					<th class="px-4 py-3 font-medium">Query</th>
					<th class="px-4 py-3 font-medium">Client</th>
					<th class="px-4 py-3 font-medium">Destination</th>
					<th class="px-4 py-3 font-medium">Stage</th>
					<th class="px-4 py-3 text-right font-medium">Selling</th>
					<th class="px-4 py-3 text-right font-medium">Profit</th>
					<th class="px-4 py-3"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-50">
				{#each $queries.data ?? [] as q (q.id)}
					{@const next = nextStatus(q.status)}
					<tr class="hover:bg-slate-50">
						<td class="px-4 py-3 font-mono text-xs">
							<a href="/queries/{q.id}" class="text-brand-600 hover:underline">{q.query_number}</a>
						</td>
						<td class="px-4 py-3 font-medium text-slate-700">
							<a href="/queries/{q.id}" class="hover:text-brand-600">{q.client_name}</a>
						</td>
						<td class="px-4 py-3 text-slate-600">{q.destination}</td>
						<td class="px-4 py-3">
							<Badge tone={STAGE_BY_STATUS[q.status].tone}>{STAGE_BY_STATUS[q.status].label}</Badge>
						</td>
						<td class="px-4 py-3 text-right text-slate-700">{formatAmount(Number(q.selling_price))}</td>
						<td class="px-4 py-3 text-right font-medium text-green-600">{formatAmount(Number(q.profit))}</td>
						<td class="px-4 py-3 text-right">
							{#if next}
								<Button
									variant="secondary"
									size="sm"
									disabled={$setStatus.isPending}
									onclick={() => $setStatus.mutate({ id: q.id, status: next })}
								>
									→ {STAGE_BY_STATUS[next].label}
								</Button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
