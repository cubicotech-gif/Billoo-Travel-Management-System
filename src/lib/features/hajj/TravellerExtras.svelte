<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus, Trash2 } from 'lucide-svelte';
	import { Button } from '$ui';
	import NumberField from './NumberField.svelte';
	import { useAddTravellerExtra, useRemoveTravellerExtra, useUpdateTravellerExtra } from './queries';
	import type { ExtraResult } from './calc';
	import type { HajjCurrency, HajjTraveller } from './types';

	// Other services: anything a client asks for that is not in the vendor
	// catalogue (wheelchair assistance, extra luggage, a private car …), entered
	// by hand with its own cost and selling price. Never sold below cost.
	let {
		queryId,
		traveller,
		results,
		defaultCurrency
	}: {
		queryId: string;
		traveller: HajjTraveller;
		results: ExtraResult[];
		defaultCurrency: HajjCurrency;
	} = $props();

	const add = untrack(() => useAddTravellerExtra(queryId));
	const update = untrack(() => useUpdateTravellerExtra(queryId));
	const remove = untrack(() => useRemoveTravellerExtra(queryId));

	const CURRENCIES = ['SAR', 'USD', 'PKR'] as const;
	const rows = $derived(traveller.extras ?? []);

	let label = $state('');
	let currency = $state<HajjCurrency | 'PKR'>(untrack(() => defaultCurrency));
	let cost = $state('');
	let sell = $state('');
	let error = $state('');

	const num = (t: string) => (t.trim() === '' ? 0 : Number(t));
	// type=number inputs bound with bind:value yield numbers, so read them as text.

	function addNow() {
		const c = num(cost);
		const s = sell.trim() === '' ? c : num(sell);
		if (!label.trim()) return (error = 'Name the service (e.g. Wheelchair assistance).');
		if (!Number.isFinite(c) || c < 0 || !Number.isFinite(s) || s < 0)
			return (error = 'Cost and price must be zero or more.');
		if (s < c) return (error = 'The selling price can’t be below the cost.');
		error = '';
		$add.mutate(
			{
				traveller_id: traveller.id,
				label: label.trim(),
				currency,
				cost: c,
				sell_price: s,
				sort_order: rows.length
			},
			{
				onSuccess: () => {
					label = '';
					cost = '';
					sell = '';
				}
			}
		);
	}

	function rename(id: string, current: string, text: string) {
		const next = text.trim();
		if (next && next !== current) $update.mutate({ id, patch: { label: next } });
	}
</script>

<div class="space-y-3" data-testid="hajj-extras">
	{#each rows as e (e.id)}
		{@const r = results.find((x) => x.id === e.id)}
		<div class="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_7rem_7rem_auto]">
			<label class="block">
				<span class="mb-1 block text-xs font-medium text-slate-600">Service</span>
				<input
					value={e.label}
					onchange={(ev) => rename(e.id, e.label, ev.currentTarget.value)}
					class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
				/>
			</label>
			<label class="block">
				<span class="mb-1 block text-xs font-medium text-slate-600">Currency</span>
				<select
					value={e.currency}
					onchange={(ev) => $update.mutate({ id: e.id, patch: { currency: ev.currentTarget.value as HajjCurrency | 'PKR' } })}
					class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
				>
					{#each CURRENCIES as c (c)}<option value={c}>{c}</option>{/each}
				</select>
			</label>
			<NumberField
				label="Cost"
				value={Number(e.cost)}
				onCommit={(n) => $update.mutate({ id: e.id, patch: { cost: n } })}
			/>
			<NumberField
				label="Sell"
				value={Number(e.sell_price)}
				onCommit={(n) => $update.mutate({ id: e.id, patch: { sell_price: n } })}
			/>
			<button
				type="button"
				onclick={() => $remove.mutate(e.id)}
				class="mb-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
				aria-label="Remove service"
			>
				<Trash2 class="h-4 w-4" />
			</button>
			{#if r?.floored}
				<p class="text-xs text-amber-600 sm:col-span-5">Price is below cost — sold at cost.</p>
			{/if}
		</div>
	{/each}

	<div class="grid items-end gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_7rem_7rem_auto]">
		<label class="block">
			<span class="mb-1 block text-xs font-medium text-slate-600">New service</span>
			<input
				bind:value={label}
				placeholder="e.g. Wheelchair assistance"
				data-testid="hajj-extra-label"
				class="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
			/>
		</label>
		<label class="block">
			<span class="mb-1 block text-xs font-medium text-slate-600">Currency</span>
			<select bind:value={currency} class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
				{#each CURRENCIES as c (c)}<option value={c}>{c}</option>{/each}
			</select>
		</label>
		<label class="block">
			<span class="mb-1 block text-xs font-medium text-slate-600">Cost</span>
			<input type="number" min="0" step="any" value={cost} oninput={(e) => (cost = e.currentTarget.value)} data-testid="hajj-extra-cost" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
		</label>
		<label class="block">
			<span class="mb-1 block text-xs font-medium text-slate-600">Sell</span>
			<input type="number" min="0" step="any" value={sell} oninput={(e) => (sell = e.currentTarget.value)} data-testid="hajj-extra-sell" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm" />
		</label>
		<Button size="sm" onclick={addNow} disabled={$add.isPending}><Plus class="h-4 w-4" /> Add</Button>
		{#if error}<p class="text-xs text-red-600 sm:col-span-5">{error}</p>{/if}
	</div>
	<p class="text-[11px] text-slate-400">
		Shown to the client by name (price included only if you tick “Price breakup” on the proposal).
		SAR / USD services join that currency’s total; PKR ones are added to the PKR total.
	</p>
</div>
