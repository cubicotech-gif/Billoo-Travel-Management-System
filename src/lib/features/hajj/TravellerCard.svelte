<script lang="ts">
	import { untrack } from 'svelte';
	import { Crown, Trash2 } from 'lucide-svelte';
	import { Badge, Button, Card, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { addonApplies, addonOfferedForRoom, baseCost, type TravellerResult } from './calc';
	import PackageFields from './PackageFields.svelte';
	import PackageSummary from './PackageSummary.svelte';
	import NumberField from './NumberField.svelte';
	import TravellerAddons from './TravellerAddons.svelte';
	import TravellerExtras from './TravellerExtras.svelte';
	import TravellerDetails from './TravellerDetails.svelte';
	import { travellerIssues } from './readiness';
	import type { Passenger } from '$features/passengers/types';
	import { carrySell, normalize, type Selection } from './selection';
	import {
		useRemoveHajjTraveller,
		useRemoveTravellerAddon,
		useUpdateHajjTraveller
	} from './queries';
	import { useRates } from '$features/rates/queries';
	import { latestRates } from '$features/rates/types';
	import type { HajjAddon, HajjCatalogue, HajjPackage, HajjTraveller } from './types';

	interface Props {
		queryId: string;
		traveller: HajjTraveller;
		index: number;
		name: string;
		packages: HajjPackage[];
		catalogues: HajjCatalogue[];
		addons: HajjAddon[];
		result: TravellerResult;
		passenger: Passenger | undefined;
		others: { id: string; name: string }[];
		onMakeLead: () => void;
	}
	let {
		queryId,
		traveller,
		index,
		name,
		packages,
		catalogues,
		addons,
		result,
		passenger,
		others,
		onMakeLead
	}: Props = $props();

	const update = untrack(() => useUpdateHajjTraveller(queryId));
	const remove = untrack(() => useRemoveHajjTraveller(queryId));
	const removeAddon = untrack(() => useRemoveTravellerAddon(queryId));
	const rates = untrack(() => useRates());

	const pkg = $derived(packages.find((p) => p.id === traveller.package_id));
	const catalogue = $derived(catalogues.find((c) => c.id === pkg?.catalogue_id));
	const currency = $derived(catalogue?.currency ?? 'USD');

	const selection = $derived<Selection | null>(
		pkg
			? {
					catalogueId: pkg.catalogue_id,
					packageId: pkg.id,
					option: traveller.option_code,
					room: traveller.room_type
				}
			: null
	);

	function onSelection(next: Selection) {
		const nextPkg = packages.find((p) => p.id === next.packageId);
		if (!pkg || !nextPkg) return;
		const oldCost = baseCost(pkg, traveller.option_code, traveller.room_type);
		const newCost = baseCost(nextPkg, next.option, next.room) ?? 0;
		const sameCurrency = nextPkg.catalogue_id === pkg.catalogue_id;
		$update.mutate({
			id: traveller.id,
			patch: {
				package_id: next.packageId,
				option_code: next.option,
				room_type: next.room,
				sell_price: carrySell(Number(traveller.sell_price), oldCost, newCost, sameCurrency)
			}
		});
		// Drop add-ons the new package/room doesn't offer, so nothing silently prices at 0.
		for (const row of traveller.addons) {
			const a = addons.find((x) => x.id === row.addon_id);
			if (a && (!addonApplies(a, nextPkg.code) || !addonOfferedForRoom(a, next.room)))
				$removeAddon.mutate(row.id);
		}
	}

	// --- Air ticket (not part of any package; PKR, adult fare) ---------------
	const airlines = $derived(latestRates($rates.data ?? []).filter((r) => r.item_type === 'airline'));
	const airlineOptions = $derived([
		{ value: '', label: '— none / manual —' },
		...airlines.map((r) => ({ value: r.id, label: r.name }))
	]);
	const airlineId = $derived(airlines.find((r) => r.name === traveller.ticket_airline)?.id ?? '');

	function pickAirline(id: string) {
		const r = airlines.find((x) => x.id === id);
		if (!r) {
			$update.mutate({ id: traveller.id, patch: { ticket_airline: null } });
			return;
		}
		$update.mutate({
			id: traveller.id,
			patch: {
				ticket_airline: r.name,
				ticket_cost_pkr: Number(r.cost_price),
				ticket_sell_pkr: Number(r.selling_price)
			}
		});
	}

	const issueCount = $derived(travellerIssues(traveller, passenger ?? null).length);
	const baseMargin = $derived(result.baseSell - result.baseCost);
	const normalized = $derived(selection ? normalize(packages, selection) : null);

	function confirmRemove() {
		if (confirm(`Remove ${name} from this Hajj quote?`)) $remove.mutate(traveller.id);
	}
</script>

<Card>
	<div class="mb-3 flex flex-wrap items-center gap-2">
		<span class="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
			{index + 1}
		</span>
		<h4 class="text-base font-semibold text-slate-800">{name}</h4>
		{#if traveller.is_lead}
			<Badge tone="info"><Crown class="mr-1 h-3 w-3" /> Lead</Badge>
		{:else}
			<button type="button" class="text-xs text-slate-400 hover:text-brand-600" onclick={onMakeLead}>
				Make lead
			</button>
		{/if}
		<Badge tone={currency === 'USD' ? 'warning' : 'success'}>{currency}</Badge>
		<Button variant="ghost" size="sm" class="ml-auto" onclick={confirmRemove}>
			<Trash2 class="h-4 w-4" /> Remove
		</Button>
	</div>

	{#if selection && pkg}
		<div class="space-y-3">
			<PackageFields {selection} {packages} {catalogues} onchange={onSelection} />
			{#key pkg.id + traveller.option_code}
				<PackageSummary {pkg} option={traveller.option_code} />
			{/key}

			{#if !normalized || result.baseMissing}
				<p class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
					This package has no price for the chosen option and room — pick another room.
				</p>
			{/if}

			<div class="grid gap-3 sm:grid-cols-3">
				<div>
					<span class="mb-1 block text-xs font-medium text-slate-600">Package cost (vendor)</span>
					<p class="py-1.5 text-sm tabular-nums text-slate-700">{formatAmount(result.baseCost, currency)}</p>
				</div>
				<NumberField
					label="Package sell ({currency})"
					value={Number(traveller.sell_price)}
					hint="May be below cost"
					onCommit={(n) => $update.mutate({ id: traveller.id, patch: { sell_price: n } })}
				/>
				<div>
					<span class="mb-1 block text-xs font-medium text-slate-600">Margin</span>
					<p class="py-1.5 text-sm tabular-nums {baseMargin >= 0 ? 'text-green-600' : 'text-red-600'}">
						{formatAmount(baseMargin, currency)}
					</p>
				</div>
			</div>

			<details class="rounded-lg border border-slate-200 px-3 py-2" open={traveller.addons.length > 0}>
				<summary class="cursor-pointer text-sm font-medium text-slate-700">
					Add-ons
					{#if traveller.addons.length}
						<span class="ml-1 text-xs font-normal text-slate-400">({traveller.addons.length} taken)</span>
					{/if}
				</summary>
				<div class="mt-3">
					<TravellerAddons {queryId} {traveller} {pkg} {addons} {catalogues} {result} />
				</div>
			</details>

			<details class="rounded-lg border border-slate-200 px-3 py-2">
				<summary class="cursor-pointer text-sm font-medium text-slate-700">
					Hajj details
					{#if issueCount}
						<span class="ml-1 rounded-full bg-amber-50 px-1.5 text-xs font-normal text-amber-700">{issueCount} to complete</span>
					{:else}
						<span class="ml-1 text-xs font-normal text-green-600">complete</span>
					{/if}
				</summary>
				<div class="mt-3">
					<TravellerDetails {queryId} {traveller} {passenger} {others} />
				</div>
			</details>

			<details class="rounded-lg border border-slate-200 px-3 py-2" open={result.extras.length > 0}>
				<summary class="cursor-pointer text-sm font-medium text-slate-700">
					Other services
					{#if result.extras.length}
						<span class="ml-1 rounded-full bg-brand-50 px-1.5 text-xs font-normal text-brand-700">{result.extras.length}</span>
					{/if}
					<span class="ml-1 text-xs font-normal text-slate-400">wheelchair, luggage, anything not in the package</span>
				</summary>
				<div class="mt-3">
					<TravellerExtras {queryId} {traveller} results={result.extras} defaultCurrency={currency} />
				</div>
			</details>

			<details class="rounded-lg border border-slate-200 px-3 py-2" open={result.ticketSell > 0}>
				<summary class="cursor-pointer text-sm font-medium text-slate-700">
					Air ticket (PKR, adult fare — not in any package)
				</summary>
				<div class="mt-3 grid gap-3 sm:grid-cols-3">
					<Select label="Airline (from rates)" value={airlineId} options={airlineOptions} onchange={pickAirline} />
					<NumberField
						label="Ticket cost (PKR)"
						value={Number(traveller.ticket_cost_pkr)}
						onCommit={(n) => $update.mutate({ id: traveller.id, patch: { ticket_cost_pkr: n } })}
					/>
					<NumberField
						label="Ticket sell (PKR)"
						value={Number(traveller.ticket_sell_pkr)}
						onCommit={(n) => $update.mutate({ id: traveller.id, patch: { ticket_sell_pkr: n } })}
					/>
				</div>
			</details>
		</div>
	{:else}
		<p class="text-sm text-red-600">This traveller’s package is no longer in the catalogue.</p>
	{/if}

	{#if $update.isError}
		<p class="mt-2 text-xs text-red-600">Couldn’t save: {$update.error.message}</p>
	{/if}
</Card>
