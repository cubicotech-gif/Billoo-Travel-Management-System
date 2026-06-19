<script lang="ts">
	import { untrack } from 'svelte';
	import { Copy, Check, Send, ThumbsUp, Trash2, Eye, FileText, ChevronDown } from 'lucide-svelte';
	import { Badge, Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import {
		useQuotations,
		useSetQuotationStatus,
		useAcceptQuotation,
		useRemoveQuotation
	} from './queries';
	import { QUOTATION_STATUS_TONE, type Quotation } from './types';
	import QuotationViewModal from './QuotationViewModal.svelte';
	import QuotationBreakdown from './QuotationBreakdown.svelte';

	let { queryId }: { queryId: string } = $props();

	const quotations = untrack(() => useQuotations(queryId));
	const setStatus = untrack(() => useSetQuotationStatus(queryId));
	const accept = untrack(() => useAcceptQuotation(queryId));
	const remove = untrack(() => useRemoveQuotation(queryId));

	let viewing = $state<Quotation | null>(null);
	let expanded = $state<Record<string, boolean>>({});

	let copiedId = $state<string | null>(null);
	async function copy(q: Quotation) {
		if (!q.whatsapp_text) return;
		await navigator.clipboard.writeText(q.whatsapp_text);
		copiedId = q.id;
		setTimeout(() => (copiedId = null), 1500);
	}

	function fmtDate(iso: string): string {
		return new Date(iso).toLocaleDateString();
	}
</script>

<div class="mb-3 flex items-center justify-between">
	<h2 class="text-lg font-semibold text-slate-800">Quotations</h2>
	{#if ($quotations.data ?? []).some((q) => q.status !== 'archived')}
		<Button size="sm" variant="secondary" href="/queries/{queryId}/proposal"><FileText class="h-4 w-4" /> Open proposal</Button>
	{/if}
</div>

{#if $quotations.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if ($quotations.data ?? []).filter((q) => q.status !== 'archived').length === 0}
	<div class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
		No quotations yet. Build one from the daily rates.
	</div>
{:else}
	<div class="space-y-2">
		{#each ($quotations.data ?? []).filter((q) => q.status !== 'archived') as q (q.id)}
			<div class="rounded-xl border border-slate-200 bg-white p-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<span class="text-sm font-semibold text-slate-700">v{q.version}</span>
						{#if q.label}<Badge tone="info">{q.label}</Badge>{/if}
						<Badge tone={QUOTATION_STATUS_TONE[q.status]}>{q.status}</Badge>
						<span class="text-xs text-slate-400">{fmtDate(q.created_at)}</span>
					</div>
					<div class="flex items-center gap-4 text-sm">
						<span class="text-slate-700">{formatAmount(Number(q.total_sell_pkr), 'PKR')}</span>
						{#if Number(q.per_person_pkr) > 0}
							<span class="text-xs text-slate-400">{formatAmount(Number(q.per_person_pkr), 'PKR')}/pp</span>
						{/if}
						<span class="font-medium text-green-600">+{formatAmount(Number(q.profit_pkr), 'PKR')}</span>
					</div>
				</div>
				<div class="mt-3 flex flex-wrap gap-2">
					<Button variant="secondary" size="sm" onclick={() => (expanded[q.id] = !expanded[q.id])}>
							<ChevronDown class="h-4 w-4 transition-transform {expanded[q.id] ? '' : '-rotate-90'}" /> Breakdown
						</Button>
						<Button variant="secondary" size="sm" onclick={() => (viewing = q)}><Eye class="h-4 w-4" /> View</Button>
						<Button variant="secondary" size="sm" onclick={() => copy(q)}>
						{#if copiedId === q.id}<Check class="h-4 w-4" /> Copied{:else}<Copy class="h-4 w-4" /> Copy{/if}
					</Button>
					{#if q.status === 'draft'}
						<Button variant="secondary" size="sm" onclick={() => $setStatus.mutate({ id: q.id, status: 'sent' })}>
							<Send class="h-4 w-4" /> Mark sent
						</Button>
					{/if}
					{#if q.status !== 'accepted'}
						<Button variant="secondary" size="sm" onclick={() => $accept.mutate(q)}>
							<ThumbsUp class="h-4 w-4" /> Accept
						</Button>
					{/if}
					<button
						onclick={() => confirm('Remove this quotation?') && $remove.mutate(q)}
						class="ml-auto rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
						aria-label="Remove"
					>
						<Trash2 class="h-4 w-4" />
					</button>
				</div>

				{#if expanded[q.id]}
					<div class="mt-3 border-t border-slate-100 pt-3">
						<QuotationBreakdown quotationId={q.id} />
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<QuotationViewModal quotation={viewing} {queryId} onClose={() => (viewing = null)} />
