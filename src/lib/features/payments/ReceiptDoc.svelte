<script lang="ts">
	import { ArrowLeft, Printer } from 'lucide-svelte';
	import { Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import { getQuery } from '$features/queries/api';
	import type { Query } from '$features/queries/types';
	import { getPayment, type Payment } from './api';

	let { queryId, paymentId }: { queryId: string; paymentId: string } = $props();

	let query = $state<Query | null>(null);
	let payment = $state<Payment | null>(null);
	let loaded = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (loaded) return;
		loaded = true;
		(async () => {
			try {
				[query, payment] = await Promise.all([getQuery(queryId), getPayment(paymentId)]);
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to load';
			}
		})();
	});

	const reference = $derived(
		query ? `BLO-${new Date(query.created_at).getFullYear()}-${query.query_number.slice(-4)}` : ''
	);
</script>

<div class="no-print mb-4 flex items-center justify-between">
	<a href="/queries/{queryId}" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
		<ArrowLeft class="h-4 w-4" /> Back to query
	</a>
	<Button onclick={() => window.print()}><Printer class="h-4 w-4" /> Print / Save PDF</Button>
</div>

{#if error}
	<p class="text-red-600">{error}</p>
{:else if !query || !payment}
	<p class="text-slate-400">Loading…</p>
{:else}
	<div class="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8">
		<div class="mb-6 flex items-start justify-between border-b border-slate-200 pb-4">
			<div>
				<div class="text-xl font-bold text-brand-700">Billoo Travel</div>
				<div class="text-xs text-slate-400">Payment Receipt</div>
			</div>
			<div class="text-right font-mono text-xs text-slate-400">{reference}</div>
		</div>

		<div class="space-y-2 text-sm">
			<div class="flex justify-between"><span class="text-slate-400">Received from</span><span class="font-medium text-slate-800">{query.client_name}</span></div>
			<div class="flex justify-between"><span class="text-slate-400">For</span><span class="text-slate-700">{payment.label}</span></div>
			<div class="flex justify-between"><span class="text-slate-400">Date</span><span class="text-slate-700">{payment.paid_date ?? '—'}</span></div>
			{#if payment.method}<div class="flex justify-between"><span class="text-slate-400">Method</span><span class="text-slate-700">{payment.method}</span></div>{/if}
			{#if payment.reference}<div class="flex justify-between"><span class="text-slate-400">Reference</span><span class="text-slate-700">{payment.reference}</span></div>{/if}
		</div>

		<div class="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
			<span class="text-sm uppercase tracking-wide text-slate-400">Amount received</span>
			<span class="text-2xl font-bold text-slate-800">{formatAmount(Number(payment.amount), 'PKR')}</span>
		</div>

		<p class="mt-8 text-center text-xs text-slate-400">Thank you · Billoo Travel · {new Date().toLocaleDateString()}</p>
	</div>
{/if}
