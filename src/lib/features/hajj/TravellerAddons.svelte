<script lang="ts">
	import { untrack } from 'svelte';
	import { Users } from 'lucide-svelte';
	import { formatAmount } from '$lib/money';
	import { addonApplies, addonOfferedForRoom, type TravellerResult } from './calc';
	import NumberField from './NumberField.svelte';
	import {
		useRemoveTravellerAddon,
		useSetTravellerAddon,
		useUpdateTravellerAddon
	} from './queries';
	import type { HajjAddon, HajjCatalogue, HajjPackage, HajjTraveller } from './types';

	// The add-ons one traveller can take, with their cost, sell price and rules:
	//  * add-ons only ever ADD to the base; sell price can't go below cost
	//  * Mina tents are mutually exclusive (one tent size per person)
	//  * extra Medinah nights take a quantity; GMC is split across its occupants
	//  * add-ons the catalogue has no price for take a manual cost
	interface Props {
		queryId: string;
		traveller: HajjTraveller;
		pkg: HajjPackage;
		addons: HajjAddon[];
		catalogues: HajjCatalogue[];
		result: TravellerResult;
	}
	let { queryId, traveller, pkg, addons, catalogues, result }: Props = $props();

	const setAddon = untrack(() => useSetTravellerAddon(queryId));
	const updateAddon = untrack(() => useUpdateTravellerAddon(queryId));
	const removeAddon = untrack(() => useRemoveTravellerAddon(queryId));

	const catById = $derived(new Map(catalogues.map((c) => [c.id, c])));
	const ownCatalogue = $derived(catById.get(pkg.catalogue_id));

	// Add-ons from the other price list stay hidden until asked for: a USD
	// traveller can take a SAR add-on (and vice versa), but it's the exception.
	let showOther = $state(false);
	const otherCurrency = $derived(ownCatalogue?.currency === 'USD' ? 'SAR' : 'USD');

	const offered = $derived(
		addons.filter(
			(a) =>
				addonApplies(a, pkg.code) &&
				addonOfferedForRoom(a, traveller.room_type) &&
				(a.catalogue_id === pkg.catalogue_id || showOther)
		)
	);
	const groups = $derived.by(() => {
		const out = new Map<string, HajjAddon[]>();
		for (const a of offered) {
			const arr = out.get(a.group_name) ?? [];
			arr.push(a);
			out.set(a.group_name, arr);
		}
		return [...out.entries()];
	});

	const taken = $derived(new Map(traveller.addons.map((r) => [r.addon_id, r])));
	const lineFor = (rowId: string) => result.addons.find((l) => l.lineId === rowId);
	const currencyOf = (a: HajjAddon) => catById.get(a.catalogue_id)?.currency ?? 'USD';

	function toggle(addon: HajjAddon, on: boolean) {
		const row = taken.get(addon.id);
		if (!on) {
			if (row) $removeAddon.mutate(row.id);
			return;
		}
		// One Mina tent size per person: taking one drops the others.
		if (addon.group_name === 'Mina tent')
			for (const other of offered)
				if (other.group_name === 'Mina tent' && other.id !== addon.id) {
					const r = taken.get(other.id);
					if (r) $removeAddon.mutate(r.id);
				}
		$setAddon.mutate({ traveller_id: traveller.id, addon_id: addon.id, qty: 1 });
	}

	function setSell(rowId: string, cost: number, n: number) {
		// Never below cost — raise to cost rather than reject.
		$updateAddon.mutate({ id: rowId, patch: { sell_price: Math.max(n, cost) } });
	}
</script>

<div class="space-y-3">
	{#each groups as [group, list] (group)}
		<div>
			<h5 class="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{group}</h5>
			<ul class="divide-y divide-slate-100 rounded-lg border border-slate-200">
				{#each list as addon (addon.id)}
					{@const row = taken.get(addon.id)}
					{@const line = row ? lineFor(row.id) : undefined}
					{@const cur = currencyOf(addon)}
					<li class="px-3 py-2">
						<label class="flex items-start gap-2">
							<input
								type="checkbox"
								class="mt-0.5 rounded border-slate-300"
								checked={!!row}
								onchange={(e) => toggle(addon, e.currentTarget.checked)}
							/>
							<span class="min-w-0 flex-1">
								<span class="text-sm text-slate-800">{addon.name}</span>
								{#if cur !== ownCatalogue?.currency}
									<span class="ml-1 rounded bg-indigo-50 px-1.5 text-[11px] text-indigo-600">{cur}</span>
								{/if}
								{#if addon.is_estimate}
									<span class="ml-1 text-[11px] text-slate-400">(approx)</span>
								{/if}
								{#if addon.notes}
									<span class="block text-[11px] text-slate-400">{addon.notes}</span>
								{/if}
							</span>
							{#if !row}
								<span class="text-xs whitespace-nowrap text-slate-500">
									{#if addon.pricing_kind === 'per_person_by_room' || addon.pricing_kind === 'per_night_by_room'}
										{@const p = addon.room_prices.find((r) => r.room_type === traveller.room_type)}
										{p ? formatAmount(Number(p.price), cur) : ''}{addon.pricing_kind ===
										'per_night_by_room'
											? ' / night'
											: ''}
									{:else if addon.unit_price !== null}
										{formatAmount(Number(addon.unit_price), cur)}{addon.pricing_kind ===
										'pooled_vehicle'
											? ' / vehicle'
											: ''}
									{:else}
										price not set
									{/if}
								</span>
							{/if}
						</label>

						{#if row && line}
							<div class="mt-2 grid gap-2 pl-6 sm:grid-cols-4">
								{#if addon.pricing_kind === 'per_night_by_room'}
									<NumberField
										label="Nights"
										min={1}
										step="1"
										value={row.qty}
										onCommit={(n) =>
											$updateAddon.mutate({ id: row.id, patch: { qty: Math.max(1, Math.round(n)) } })}
									/>
								{/if}
								{#if addon.unit_price === null && addon.pricing_kind === 'per_person'}
									<NumberField
										label="Cost ({cur})"
										hint={line.missingPrice ? 'Price not published — enter cost' : undefined}
										value={row.cost_override ?? 0}
										onCommit={(n) => $updateAddon.mutate({ id: row.id, patch: { cost_override: n } })}
									/>
								{:else}
									<div>
										<span class="mb-1 block text-xs font-medium text-slate-600">Cost</span>
										<p class="py-1.5 text-sm tabular-nums text-slate-700">
											{formatAmount(line.cost, cur)}
										</p>
										{#if line.sharers !== null}
											<p class="inline-flex items-center gap-1 text-[11px] text-slate-400">
												<Users class="h-3 w-3" /> split {line.sharers} way{line.sharers === 1 ? '' : 's'}
											</p>
										{/if}
									</div>
								{/if}
								<NumberField
									label="Sell ({cur})"
									hint={line.floored ? 'Raised to cost' : 'Can’t go below cost'}
									value={line.sell}
									onCommit={(n) => setSell(row.id, line.cost, n)}
								/>
								<div>
									<span class="mb-1 block text-xs font-medium text-slate-600">Margin</span>
									<p class="py-1.5 text-sm tabular-nums {line.sell - line.cost > 0 ? 'text-green-600' : 'text-slate-500'}">
										{formatAmount(line.sell - line.cost, cur)}
									</p>
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<p class="text-xs text-slate-400">No add-ons apply to this package and room.</p>
	{/each}

	<label class="inline-flex items-center gap-2 text-xs text-slate-500">
		<input type="checkbox" class="rounded border-slate-300" bind:checked={showOther} />
		Show add-ons priced in {otherCurrency}
	</label>
</div>
