<script lang="ts">
	import { ArrowLeft, Printer, MessageCircle, Check, X } from 'lucide-svelte';
	import { Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import { waLink } from '$lib/whatsapp';
	import { getQuery } from '$features/queries/api';
	import type { Query } from '$features/queries/types';
	import { listQuotations } from './api';
	import type { Quotation } from './types';

	let { queryId }: { queryId: string } = $props();

	let query = $state<Query | null>(null);
	let tiers = $state<Quotation[]>([]);
	let loaded = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (loaded) return;
		loaded = true;
		(async () => {
			try {
				query = await getQuery(queryId);
				const all = await listQuotations(queryId);
				// Live proposal = the current non-archived/non-rejected tiers.
				tiers = all
					.filter((q) => q.status !== 'archived' && q.status !== 'rejected')
					.sort((a, b) => Number(a.total_sell_pkr) - Number(b.total_sell_pkr));
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to load';
			}
		})();
	});

	const validUntil = $derived(tiers.find((t) => t.valid_until)?.valid_until ?? null);

	function pax(q: Query): string {
		return `${q.adults} adult${q.adults === 1 ? '' : 's'}${q.children ? `, ${q.children} child` : ''}${q.infants ? `, ${q.infants} infant` : ''}`;
	}

	function waMessage(): string {
		if (!query) return '';
		const lines = [
			`*${query.package_type ?? query.destination} Package Options — ${query.client_name}*`,
			pax(query),
			''
		];
		tiers.forEach((t, i) => {
			lines.push(
				`${i + 1}) ${t.label ?? `Option ${t.version}`} — PKR ${Math.round(Number(t.per_person_pkr)).toLocaleString('en-US')}/pp`
			);
		});
		lines.push('');
		if (validUntil) lines.push(`Valid till ${validUntil}`);
		lines.push('Reply with your preferred option. — Billoo Travel');
		return lines.join('\n');
	}

	function sendWhatsApp() {
		const url = waLink(query?.client_phone ?? '', waMessage());
		if (url) window.open(url, '_blank');
	}
</script>

<div class="no-print mb-4 flex items-center justify-between">
	<a href="/queries/{queryId}" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
		<ArrowLeft class="h-4 w-4" /> Back to query
	</a>
	<div class="flex gap-2">
		<Button variant="secondary" onclick={sendWhatsApp}><MessageCircle class="h-4 w-4" /> Send on WhatsApp</Button>
		<Button onclick={() => window.print()}><Printer class="h-4 w-4" /> Print / Save PDF</Button>
	</div>
</div>

{#if error}
	<p class="text-red-600">{error}</p>
{:else if !query}
	<p class="text-slate-400">Loading…</p>
{:else}
	<div class="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8">
		<div class="mb-6 flex items-start justify-between border-b border-slate-200 pb-4">
			<div>
				<div class="text-xl font-bold text-brand-700">Billoo Travel</div>
				<div class="text-xs text-slate-400">Umrah & Travel Services</div>
			</div>
			<div class="text-right">
				<div class="text-lg font-semibold text-slate-800">Package Proposal</div>
				{#if validUntil}<div class="text-xs text-amber-600">Valid until {validUntil}</div>{/if}
			</div>
		</div>

		<div class="mb-6 text-sm">
			<div class="font-medium text-slate-800">{query.client_name}</div>
			<div class="text-slate-500">{query.package_type ?? query.destination} · {pax(query)}</div>
			{#if (query.itinerary_cities ?? []).length}
				<div class="text-slate-500">{(query.itinerary_cities ?? []).map((c) => `${c.city} ${c.nights}N`).join(' · ')}</div>
			{/if}
		</div>

		{#if tiers.length === 0}
			<p class="text-slate-400">No quotation tiers yet — build at least one on the query.</p>
		{:else}
			<div class="flex flex-wrap gap-4">
				{#each tiers as t (t.id)}
					<div class="flex min-w-[200px] flex-1 flex-col rounded-xl border border-slate-200 p-4 {t.status === 'accepted' ? 'ring-2 ring-green-400' : ''}">
						<div class="text-sm font-semibold text-slate-700">{t.label ?? `Option ${t.version}`}</div>
						<div class="mt-2 text-2xl font-bold text-slate-800">{formatAmount(Number(t.per_person_pkr), 'PKR')}</div>
						<div class="text-xs text-slate-400">per person</div>
						<div class="mt-1 text-sm text-slate-600">Total {formatAmount(Number(t.total_sell_pkr), 'PKR')}</div>

						{#if t.inclusions?.length}
							<ul class="mt-3 space-y-1 text-xs">
								{#each t.inclusions as inc (inc)}
									<li class="flex items-center gap-1 text-slate-600"><Check class="h-3 w-3 text-green-600" /> {inc}</li>
								{/each}
							</ul>
						{/if}
						{#if t.exclusions?.length}
							<ul class="mt-2 space-y-1 text-xs">
								{#each t.exclusions as exc (exc)}
									<li class="flex items-center gap-1 text-slate-400"><X class="h-3 w-3 text-red-400" /> {exc}</li>
								{/each}
							</ul>
						{/if}
						{#if t.status === 'accepted'}
							<div class="mt-3 rounded bg-green-50 px-2 py-1 text-center text-xs font-medium text-green-700">Selected</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<p class="mt-8 text-center text-xs text-slate-400">
			Billoo Travel · Terms & Conditions Apply · {new Date().toLocaleDateString()}
		</p>
	</div>
{/if}
