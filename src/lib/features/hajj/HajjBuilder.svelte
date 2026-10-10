<script lang="ts">
	import { untrack } from 'svelte';
	import { FileText, Plus, Users, Wheat } from 'lucide-svelte';
	import { Button, Card } from '$ui';
	import { usePassengers } from '$features/passengers/queries';
	import { fullName } from '$features/passengers/types';
	import type { Query } from '$features/queries/types';
	import AddTravellerForm from './AddTravellerForm.svelte';
	import HajjProposalList from './HajjProposalList.svelte';
	import HajjSavePanel from './HajjSavePanel.svelte';
	import HajjTotals from './HajjTotals.svelte';
	import NumberField from './NumberField.svelte';
	import TravellerCard from './TravellerCard.svelte';
	import { buildQuote } from './quote';
	import { carrySell } from './selection';
	import { baseCost } from './calc';
	import {
		useHajjAddons,
		useHajjCatalogues,
		useHajjPackages,
		useHajjQuote,
		useHajjTravellers,
		useUpdateHajjQuote,
		useUpdateHajjTraveller
	} from './queries';
	import { DEFAULT_HAJJ_ROE } from './types';

	// The Working-stage tool for a Hajj query: one family, one traveller row per
	// person, each with their own package / hotel option / room and add-ons.
	// Costs come live from the vendor catalogue; selling prices are set here.
	let { query }: { query: Query } = $props();

	const queryId = untrack(() => query.id);
	const quote = untrack(() => useHajjQuote(queryId));
	const travellers = untrack(() => useHajjTravellers(queryId));
	const catalogues = untrack(() => useHajjCatalogues());
	const packages = untrack(() => useHajjPackages());
	const addons = untrack(() => useHajjAddons());
	const passengers = untrack(() => usePassengers());
	const updateQuote = untrack(() => useUpdateHajjQuote(queryId));
	const updateTraveller = untrack(() => useUpdateHajjTraveller(queryId));

	let adding = $state(false);

	// Read every store unconditionally (no short-circuit) so each query stays
	// subscribed and the view reacts as soon as the last one resolves.
	const ready = $derived.by(() => {
		const loaded = [$quote.data, $travellers.data, $catalogues.data, $packages.data, $addons.data];
		return loaded.every((d) => d !== undefined && d !== null);
	});
	const loadError = $derived(
		$quote.error ?? $travellers.error ?? $catalogues.error ?? $packages.error ?? $addons.error
	);

	const list = $derived($travellers.data ?? []);
	const roe = $derived(Number($quote.data?.roe ?? DEFAULT_HAJJ_ROE));

	const passengerById = $derived(new Map(($passengers.data ?? []).map((p) => [p.id, p])));
	const usdRate = $derived($quote.data?.usd_rate == null ? null : Number($quote.data.usd_rate));

	const names = $derived.by(() => {
		const byId = new Map(($passengers.data ?? []).map((p) => [p.id, fullName(p)]));
		return Object.fromEntries(list.map((t) => [t.id, byId.get(t.passenger_id) ?? 'Traveller']));
	});

	const result = $derived(
		ready
			? buildQuote({
					roe,
					travellers: list,
					packages: $packages.data ?? [],
					addons: $addons.data ?? [],
					catalogues: $catalogues.data ?? []
				})
			: null
	);

	async function makeLead(id: string) {
		for (const t of list) {
			if (t.id === id && !t.is_lead) await $updateTraveller.mutateAsync({ id, patch: { is_lead: true } });
			else if (t.id !== id && t.is_lead)
				await $updateTraveller.mutateAsync({ id: t.id, patch: { is_lead: false } });
		}
	}

	// Give everyone the lead traveller's package, hotel option and room (keeping
	// each person's own markup where the currency allows).
	async function applyLeadToAll() {
		const lead = list.find((t) => t.is_lead) ?? list[0];
		const pkgs = $packages.data ?? [];
		const leadPkg = pkgs.find((p) => p.id === lead?.package_id);
		if (!lead || !leadPkg) return;
		if (!confirm('Set every traveller to the lead traveller’s package, hotel option and room?')) return;
		for (const t of list) {
			if (t.id === lead.id) continue;
			const old = pkgs.find((p) => p.id === t.package_id);
			const oldCost = old ? baseCost(old, t.option_code, t.room_type) : null;
			const newCost = baseCost(leadPkg, lead.option_code, lead.room_type) ?? 0;
			await $updateTraveller.mutateAsync({
				id: t.id,
				patch: {
					package_id: lead.package_id,
					option_code: lead.option_code,
					room_type: lead.room_type,
					sell_price: carrySell(
						Number(t.sell_price),
						oldCost,
						newCost,
						old?.catalogue_id === leadPkg.catalogue_id
					)
				}
			});
		}
	}
</script>

<div class="space-y-4">
	<Card>
		<div class="flex flex-wrap items-end gap-4">
			<div class="flex items-center gap-2">
				<Wheat class="h-5 w-5 text-brand-500" />
				<div>
					<h3 class="text-base font-semibold text-slate-800">Hajj package builder</h3>
					<p class="flex items-center gap-1 text-xs text-slate-500">
						<Users class="h-3.5 w-3.5" /> Family of {list.length} · one query, one quote per person
					</p>
				</div>
			</div>
			<div class="ml-auto flex flex-wrap items-end gap-3">
				{#if $quote.data}
					<NumberField
						class="w-32"
						label="ROE (SAR → PKR)"
						step="0.01"
						min={0.0001}
						value={roe}
						onCommit={(n) => $updateQuote.mutate({ id: $quote.data!.id, patch: { roe: n } })}
					/>
				{/if}
				{#if $quote.data}
					<NumberField
						class="w-36"
						label="USD → PKR (finance)"
						step="0.01"
						hint={usdRate === null ? 'Needed to count USD in finance' : undefined}
						value={usdRate ?? 0}
						onCommit={(n) =>
							$updateQuote.mutate({ id: $quote.data!.id, patch: { usd_rate: n > 0 ? n : null } })}
					/>
				{/if}
				{#if list.length > 1}
					<Button variant="secondary" size="sm" onclick={applyLeadToAll}>Same package for everyone</Button>
				{/if}
				{#if list.length > 0}
					<Button variant="secondary" size="sm" href="/queries/{queryId}/hajj-proposal">
						<FileText class="h-4 w-4" /> Proposal
					</Button>
				{/if}
				{#if ready && !adding}
					<Button size="sm" onclick={() => (adding = true)}>
						<Plus class="h-4 w-4" /> Add traveller
					</Button>
				{/if}
			</div>
		</div>
	</Card>

	{#if loadError}
		<p class="text-sm text-red-600">Failed to load the Hajj builder: {loadError.message}</p>
	{:else if !ready}
		<p class="text-slate-400">Loading…</p>
	{:else}
		{#if ($packages.data ?? []).length === 0}
			<Card>
				<p class="text-sm text-amber-700">
					The Hajj catalogue is empty. Run <span class="font-mono">database/migrations/20260637_hajj_catalogue.sql</span>
					then <span class="font-mono">database/seeds/hajj-2027-catalogue.sql</span> in the Supabase SQL editor.
				</p>
			</Card>
		{/if}

		{#if adding || list.length === 0}
			{#if ($packages.data ?? []).length > 0}
				<AddTravellerForm
					{query}
					packages={$packages.data ?? []}
					catalogues={$catalogues.data ?? []}
					travellers={list}
					onDone={() => (adding = false)}
				/>
			{/if}
		{/if}

		{#if result}
			<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
				<div class="space-y-4">
					{#each list as t, i (t.id)}
						{@const r = result.travellers.find((x) => x.id === t.id)}
						{#if r}
							<TravellerCard
								{queryId}
								traveller={t}
								index={i}
								name={names[t.id] ?? 'Traveller'}
								packages={$packages.data ?? []}
								catalogues={$catalogues.data ?? []}
								addons={$addons.data ?? []}
								result={r}
								passenger={passengerById.get(t.passenger_id)}
								others={list.filter((x) => x.id !== t.id).map((x) => ({ id: x.id, name: names[x.id] ?? 'Traveller' }))}
								onMakeLead={() => makeLead(t.id)}
							/>
						{/if}
					{/each}
					<HajjProposalList {queryId} stage="working" />
				</div>
				{#if list.length > 0}
					<div class="space-y-4 xl:sticky xl:top-4 xl:self-start">
						<HajjTotals {result} {names} {usdRate} />
						<HajjSavePanel
							{query}
							{usdRate}
							data={{
								roe,
								travellers: list,
								packages: $packages.data ?? [],
								addons: $addons.data ?? [],
								catalogues: $catalogues.data ?? []
							}}
						/>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
