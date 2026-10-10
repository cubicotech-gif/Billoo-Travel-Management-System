<script lang="ts">
	import { untrack } from 'svelte';
	import { FileText } from 'lucide-svelte';
	import { Button, Card } from '$ui';
	import { usePassengers } from '$features/passengers/queries';
	import { fullName } from '$features/passengers/types';
	import { baseCost } from './calc';
	import { formatSpan } from './catalogue';
	import HajjTotals from './HajjTotals.svelte';
	import { buildQuote } from './quote';
	import {
		useHajjAddons,
		useHajjCatalogues,
		useHajjPackages,
		useHajjQuote,
		useHajjTravellers
	} from './queries';
	import { DEFAULT_HAJJ_ROE } from './types';
	import { formatAmount } from '$lib/money';

	// Read-only view of the family's Hajj quote, for the Quoted and Booking
	// stages. Same numbers as the builder (both go through buildQuote).
	let { queryId }: { queryId: string } = $props();

	const quote = untrack(() => useHajjQuote(queryId));
	const travellers = untrack(() => useHajjTravellers(queryId));
	const catalogues = untrack(() => useHajjCatalogues());
	const packages = untrack(() => useHajjPackages());
	const addons = untrack(() => useHajjAddons());
	const passengers = untrack(() => usePassengers());

	const list = $derived($travellers.data ?? []);
	// Read every store unconditionally (no short-circuit) so each query stays
	// subscribed and the view reacts as soon as the last one resolves.
	const ready = $derived.by(() => {
		const loaded = [$quote.data, $travellers.data, $catalogues.data, $packages.data, $addons.data];
		return loaded.every((d) => d !== undefined && d !== null);
	});
	const names = $derived.by(() => {
		const byId = new Map(($passengers.data ?? []).map((p) => [p.id, fullName(p)]));
		return Object.fromEntries(list.map((t) => [t.id, byId.get(t.passenger_id) ?? 'Traveller']));
	});
	const result = $derived(
		ready
			? buildQuote({
					roe: Number($quote.data?.roe ?? DEFAULT_HAJJ_ROE),
					travellers: list,
					packages: $packages.data ?? [],
					addons: $addons.data ?? [],
					catalogues: $catalogues.data ?? []
				})
			: null
	);
	const addonName = $derived(new Map(($addons.data ?? []).map((a) => [a.id, a.name])));
</script>

{#if !ready}
	<p class="text-slate-400">Loading…</p>
{:else if list.length === 0}
	<Card title="Hajj quote">
		<p class="text-sm text-slate-500">No travellers on this quote yet — add them back in the Working stage.</p>
	</Card>
{:else if result}
	<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
		<Card title="Hajj travellers — {list.length}">
			<div class="mb-3 flex justify-end">
				<Button variant="secondary" size="sm" href="/queries/{queryId}/hajj-proposal">
					<FileText class="h-4 w-4" /> Proposal
				</Button>
			</div>
			<ul class="divide-y divide-slate-100">
				{#each list as t, i (t.id)}
					{@const pkg = ($packages.data ?? []).find((p) => p.id === t.package_id)}
					{@const cur = ($catalogues.data ?? []).find((c) => c.id === pkg?.catalogue_id)?.currency ?? 'USD'}
					{@const r = result.travellers.find((x) => x.id === t.id)}
					<li class="py-3 text-sm">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<span class="font-medium text-slate-800">{i + 1}. {names[t.id]}{t.is_lead ? ' · lead' : ''}</span>
							<span class="tabular-nums text-slate-700">{formatAmount(Number(t.sell_price), cur)}</span>
						</div>
						{#if pkg}
							<p class="text-xs text-slate-500">
								{pkg.code} — {pkg.title} · {formatSpan(pkg.start_date, pkg.end_date)} · Option {t.option_code} ·
								{t.room_type} · {cur}
								{#if baseCost(pkg, t.option_code, t.room_type) === null}<span class="text-amber-600"> (no price)</span>{/if}
							</p>
						{/if}
						{#if t.addons.length}
							<p class="mt-1 text-xs text-slate-500">
								Add-ons:
								{#each t.addons as row, j (row.id)}
									{@const line = r?.addons.find((l) => l.lineId === row.id)}
									{addonName.get(row.addon_id) ?? 'Add-on'}{row.qty > 1 ? ` ×${row.qty}` : ''}{line ? ` (${formatAmount(line.sell, line.currency)})` : ''}{j < t.addons.length - 1 ? ', ' : ''}
								{/each}
							</p>
						{/if}
						{#if Number(t.ticket_sell_pkr) > 0}
							<p class="mt-1 text-xs text-slate-500">
								Ticket{t.ticket_airline ? ` · ${t.ticket_airline}` : ''}: {formatAmount(Number(t.ticket_sell_pkr), 'PKR')}
							</p>
						{/if}
					</li>
				{/each}
			</ul>
		</Card>
		<div class="xl:sticky xl:top-4 xl:self-start">
			<HajjTotals {result} {names} />
		</div>
	</div>
{/if}
