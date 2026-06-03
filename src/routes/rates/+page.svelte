<script lang="ts">
	import { Pencil, Plus, Trash2, RefreshCw } from 'lucide-svelte';
	import { Badge, Button, Card, Input } from '$ui';
	import { formatAmount } from '$lib/money';
	import type { RateItemType } from '$lib/database.types';
	import { useVendors } from '$features/vendors/queries';
	import {
		useRates,
		useDeleteRate,
		useLatestRoe,
		useSetRoe
	} from '$features/rates/queries';
	import { RATE_TYPES, RATE_TYPE_BY_KEY, type RateCard } from '$features/rates/types';
	import RateModal from '$features/rates/RateModal.svelte';

	const rates = useRates();
	const vendors = useVendors();
	const deleteRate = useDeleteRate();
	const latestRoe = useLatestRoe();
	const setRoe = useSetRoe();

	let activeType = $state<RateItemType>('hotel');
	let modalOpen = $state(false);
	let editing = $state<RateCard | null>(null);

	const config = $derived(RATE_TYPE_BY_KEY[activeType]);
	const rows = $derived(($rates.data ?? []).filter((r) => r.item_type === activeType));

	const vendorName = $derived.by(() => {
		const map = new Map(($vendors.data ?? []).map((v) => [v.id, v.name]));
		return (id: string | null) => (id ? (map.get(id) ?? '—') : '—');
	});

	// ROE-of-the-day input, seeded from the latest known rate.
	let roeInput = $state('');
	$effect(() => {
		if ($latestRoe.data && roeInput === '') roeInput = String($latestRoe.data.sar_to_pkr);
	});

	function saveRoe() {
		const value = Number(roeInput);
		if (value > 0) $setRoe.mutate({ value });
	}

	function openAdd() {
		editing = null;
		modalOpen = true;
	}
	function openEdit(r: RateCard) {
		editing = r;
		modalOpen = true;
	}
	function remove(r: RateCard) {
		if (confirm(`Delete rate "${r.name}"?`)) $deleteRate.mutate(r.id);
	}
</script>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-slate-800">Daily Rates</h1>
	<p class="text-sm text-slate-500">
		Set today's exchange rate and maintain per-item cost & selling prices. Quotations use the
		latest rate per item.
	</p>
</div>

<!-- ROE of the day -->
<div class="mb-6">
	<Card title="Exchange rate · SAR → PKR">
		<div class="flex flex-wrap items-end gap-4">
			<div class="w-40">
				<Input label="1 SAR = ? PKR" type="number" min="0" step="0.0001" bind:value={roeInput} />
			</div>
			<Button onclick={saveRoe} disabled={$setRoe.isPending}>
				<RefreshCw class="h-4 w-4" /> Set today's rate
			</Button>
			{#if $latestRoe.data}
				<span class="pb-2 text-sm text-slate-500">
					Latest: <span class="font-semibold text-slate-700">1 SAR = {$latestRoe.data.sar_to_pkr} PKR</span>
					(set {new Date($latestRoe.data.rate_date).toLocaleDateString()})
				</span>
			{:else}
				<span class="pb-2 text-sm text-amber-600">No rate set yet — quotations need this.</span>
			{/if}
		</div>
	</Card>
</div>

<!-- Type tabs -->
<div class="mb-4 flex items-center justify-between">
	<div class="flex gap-1 rounded-lg bg-slate-100 p-1">
		{#each RATE_TYPES as t (t.type)}
			<button
				onclick={() => (activeType = t.type)}
				class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {activeType === t.type
					? 'bg-white text-brand-700 shadow-sm'
					: 'text-slate-500 hover:text-slate-700'}"
			>
				{t.label}
			</button>
		{/each}
	</div>
	<Button size="sm" onclick={openAdd}><Plus class="h-4 w-4" /> Add {config.label} rate</Button>
</div>

{#if $rates.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $rates.isError}
	<p class="text-red-600">Failed to load: {$rates.error.message}</p>
{:else if rows.length === 0}
	<div class="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
		No {config.label.toLowerCase()} rates yet. Add one — priced in {config.currency}, {config.unit}.
	</div>
{:else}
	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
				<tr>
					<th class="px-4 py-3 font-medium">Name</th>
					{#if config.hasCity}<th class="px-4 py-3 font-medium">City</th>{/if}
					<th class="px-4 py-3 font-medium">Vendor</th>
					<th class="px-4 py-3 text-right font-medium">Cost</th>
					<th class="px-4 py-3 text-right font-medium">Selling</th>
					<th class="px-4 py-3 text-right font-medium">Margin</th>
					<th class="px-4 py-3 font-medium">Date</th>
					<th class="px-4 py-3"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-50">
				{#each rows as r (r.id)}
					{@const margin = Number(r.selling_price) - Number(r.cost_price)}
					<tr class="hover:bg-slate-50">
						<td class="px-4 py-3 font-medium text-slate-700">{r.name}</td>
						{#if config.hasCity}<td class="px-4 py-3"><Badge tone="neutral">{r.city ?? '—'}</Badge></td>{/if}
						<td class="px-4 py-3 text-slate-500">{vendorName(r.vendor_id)}</td>
						<td class="px-4 py-3 text-right text-slate-600">{formatAmount(Number(r.cost_price), r.currency)}</td>
						<td class="px-4 py-3 text-right text-slate-700">{formatAmount(Number(r.selling_price), r.currency)}</td>
						<td class="px-4 py-3 text-right font-medium {margin >= 0 ? 'text-green-600' : 'text-red-600'}">
							{formatAmount(margin, r.currency)}
						</td>
						<td class="px-4 py-3 text-xs text-slate-400">{new Date(r.rate_date).toLocaleDateString()}</td>
						<td class="px-4 py-3">
							<div class="flex justify-end gap-1">
								<button onclick={() => openEdit(r)} class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Edit">
									<Pencil class="h-4 w-4" />
								</button>
								<button onclick={() => remove(r)} class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<RateModal itemType={activeType} rate={editing} open={modalOpen} onClose={() => (modalOpen = false)} />
