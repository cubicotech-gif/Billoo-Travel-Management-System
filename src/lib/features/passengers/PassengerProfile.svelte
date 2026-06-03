<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, Phone, Mail, MapPin } from 'lucide-svelte';
	import { Badge, Card } from '$ui';
	import { formatAmount } from '$lib/money';
	import { stageFor } from '$features/queries/workflow';
	import { usePassenger, usePassengerQueries } from './queries';
	import { fullName } from './types';

	let { id }: { id: string } = $props();

	const passenger = untrack(() => usePassenger(id));
	const queries = untrack(() => usePassengerQueries(id));

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
		<div class="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
			<span class="inline-flex items-center gap-1"><Phone class="h-4 w-4" /> {p.phone}</span>
			{#if p.email}<span class="inline-flex items-center gap-1"><Mail class="h-4 w-4" /> {p.email}</span>{/if}
			{#if p.city}<span class="inline-flex items-center gap-1"><MapPin class="h-4 w-4" /> {p.city}</span>{/if}
		</div>
	</div>

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
{/if}
