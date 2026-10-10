<script lang="ts">
	import { untrack } from 'svelte';
	import { Eye, FileText, Pencil, Send, ThumbsUp, Trash2, XCircle } from 'lucide-svelte';
	import { Badge, Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import {
		useAcceptHajjProposal,
		useHajjProposals,
		useLoadHajjProposal,
		useRemoveHajjProposal,
		useSetHajjProposalStatus
	} from './queries';
	import { isLive, optionTitle } from './snapshot';
	import type { HajjProposal, HajjProposalStatus } from './types';

	// Saved options for a Hajj query — the counterpart of the Umrah quotation list.
	// What you can do depends on the stage: edit/load while Working, accept while
	// Working or Quoted, view only once the query is in Booking.
	let {
		queryId,
		stage
	}: { queryId: string; stage: 'working' | 'quoted' | 'booking' | 'other' } = $props();

	const proposals = untrack(() => useHajjProposals(queryId));
	const setStatus = untrack(() => useSetHajjProposalStatus(queryId));
	const accept = untrack(() => useAcceptHajjProposal(queryId));
	const load = untrack(() => useLoadHajjProposal(queryId));
	const remove = untrack(() => useRemoveHajjProposal(queryId));

	const TONE: Record<HajjProposalStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
		draft: 'neutral',
		sent: 'info',
		accepted: 'success',
		rejected: 'danger',
		archived: 'warning'
	};

	const shown = $derived(($proposals.data ?? []).filter((p) => p.status !== 'archived'));
	const editable = $derived(stage === 'working' || stage === 'quoted');
	let error = $state('');

	async function run(fn: () => Promise<unknown>) {
		error = '';
		try {
			await fn();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
		}
	}

	function onLoad(p: HajjProposal) {
		if (
			confirm(
				`Load “${optionTitle(p)}” into the builder? This replaces the current working copy — save it first if you want to keep it.`
			)
		)
			void run(() => $load.mutateAsync(p));
	}

	function onAccept(p: HajjProposal) {
		if (
			confirm(
				`Accept “${optionTitle(p)}”? It becomes the family’s booking and the query moves to the Booking stage.`
			)
		)
			void run(() => $accept.mutateAsync(p));
	}

	const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
</script>

<div class="space-y-3" data-testid="hajj-proposal-list">
	<div class="flex items-center justify-between">
		<h3 class="text-base font-semibold text-slate-800">Saved proposals</h3>
		{#if shown.some((p) => isLive(p))}
			<Button size="sm" variant="secondary" href="/queries/{queryId}/hajj-proposal">
				<FileText class="h-4 w-4" /> Open proposal
			</Button>
		{/if}
	</div>

	{#if error}<p class="text-sm text-red-600">{error}</p>{/if}

	{#if $proposals.isLoading}
		<p class="text-slate-400">Loading…</p>
	{:else if $proposals.error}
		<p class="text-sm text-red-600">
			Couldn’t load saved proposals: {$proposals.error.message}. Run
			<span class="font-mono">20260640_hajj_proposals.sql</span> in Supabase.
		</p>
	{:else if shown.length === 0}
		<div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
			No saved proposals yet. Build the package above, then use <b>Save proposal</b>.
		</div>
	{:else}
		{#each shown as p (p.id)}
			<div class="rounded-xl border border-slate-200 bg-white p-4" data-testid="hajj-proposal-row">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-sm font-semibold text-slate-700">v{p.version}</span>
						<Badge tone="info">{optionTitle(p)}</Badge>
						<Badge tone={TONE[p.status]}>{p.status}</Badge>
						<span class="text-xs text-slate-400">
							{p.traveller_count} traveller{p.traveller_count === 1 ? '' : 's'} · {fmtDate(p.created_at)}
						</span>
						{#if p.valid_until}
							<span class="text-xs text-slate-400">valid till {fmtDate(p.valid_until)}</span>
						{/if}
					</div>
					<div class="flex flex-wrap items-center gap-x-4 text-sm">
						{#if Number(p.total_sell_pkr) > 0}
							<span class="text-slate-700">{formatAmount(Number(p.total_sell_pkr), 'PKR')}</span>
						{/if}
						{#if p.total_sell_usd !== null}
							<span class="text-slate-700">{formatAmount(Number(p.total_sell_usd), 'USD')}</span>
						{/if}
						<span class="font-medium text-green-600">+{formatAmount(Number(p.profit_pkr), 'PKR')}</span>
					</div>
				</div>
				<div class="mt-3 flex flex-wrap gap-2">
					<Button variant="secondary" size="sm" href="/queries/{queryId}/hajj-proposal?o={p.id}">
						<Eye class="h-4 w-4" /> View
					</Button>
					{#if stage === 'working'}
						<Button variant="secondary" size="sm" onclick={() => onLoad(p)}>
							<Pencil class="h-4 w-4" /> Load into builder
						</Button>
					{/if}
					{#if editable && p.status === 'draft'}
						<Button
							variant="secondary"
							size="sm"
							onclick={() => run(() => $setStatus.mutateAsync({ id: p.id, status: 'sent' }))}
						>
							<Send class="h-4 w-4" /> Mark sent
						</Button>
					{/if}
					{#if editable && p.status !== 'accepted' && p.status !== 'rejected'}
						<Button variant="secondary" size="sm" onclick={() => onAccept(p)}>
							<ThumbsUp class="h-4 w-4" /> Accept
						</Button>
						{#if p.status === 'sent'}
							<Button
								variant="secondary"
								size="sm"
								onclick={() => run(() => $setStatus.mutateAsync({ id: p.id, status: 'rejected' }))}
							>
								<XCircle class="h-4 w-4" /> Rejected
							</Button>
						{/if}
					{/if}
					{#if editable && p.status !== 'accepted'}
						<button
							onclick={() =>
								confirm('Remove this saved proposal?') && run(() => $remove.mutateAsync(p))}
							class="ml-auto rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
							aria-label="Remove"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					{/if}
				</div>
			</div>
		{/each}
	{/if}
</div>
