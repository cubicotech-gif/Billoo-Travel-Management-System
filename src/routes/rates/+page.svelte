<script lang="ts">
	import { Pencil, Plus, Trash2, RefreshCw, Upload, CalendarClock } from 'lucide-svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { Badge, Button, Card, Input, BulkImportModal } from '$ui';
	import { formatAmount } from '$lib/money';
	import type { Currency, RateItemType } from '$lib/database.types';
	import { useVendors } from '$features/vendors/queries';
	import {
		useRates,
		useDeleteRate,
		useLatestRoe,
		useSetRoe
	} from '$features/rates/queries';
	import { bulkCreateRates } from '$features/rates/api';
	import { RATE_TYPES, RATE_TYPE_BY_KEY, latestRates, type RateCard } from '$features/rates/types';
	import { isRateValid, RATE_VALIDITY_DAYS } from '$features/rates/validity';
	import RateModal from '$features/rates/RateModal.svelte';

	const rates = useRates();
	const vendors = useVendors();
	const deleteRate = useDeleteRate();
	const latestRoe = useLatestRoe();
	const setRoe = useSetRoe();
	const client = useQueryClient();

	let bulkOpen = $state(false);
	const RATE_KEYS: RateItemType[] = ['hotel', 'transfer', 'visa', 'airline'];

	async function importRates(rows: string[][]): Promise<number> {
		const toInsert = rows
			.map((r) => {
				const type = (r[0] ?? '').trim().toLowerCase() as RateItemType;
				if (!RATE_KEYS.includes(type) || !r[1]?.trim()) return null;
				const cfg = RATE_TYPE_BY_KEY[type];
				return {
					item_type: type,
					name: r[1].trim(),
					city: r[2]?.trim() || null,
					currency: cfg.currency as Currency,
					unit: cfg.unit,
					cost_price: Number(r[3]) || 0,
					selling_price: Number(r[4]) || 0
				};
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
		const n = await bulkCreateRates(toInsert);
		await client.invalidateQueries({ queryKey: ['rates'] });
		return n;
	}

	let activeType = $state<RateItemType>('hotel');
	let modalOpen = $state(false);
	let editing = $state<RateCard | null>(null);
	let cloneMode = $state(false);

	const config = $derived(RATE_TYPE_BY_KEY[activeType]);
	// Show the latest rate per logical item — a clean daily-update worklist.
	const rows = $derived(
		latestRates($rates.data ?? [])
			.filter((r) => r.item_type === activeType)
			.sort((a, b) => a.name.localeCompare(b.name))
	);

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
		cloneMode = false;
		modalOpen = true;
	}
	function openEdit(r: RateCard) {
		editing = r;
		cloneMode = false;
		modalOpen = true;
	}
	function openUpdateToday(r: RateCard) {
		editing = r;
		cloneMode = true;
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
		latest rate per item; rates are valid for {RATE_VALIDITY_DAYS} days. Use “Update today” to
		refresh an item's rate in one click.
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
	<div class="flex gap-2">
		<Button size="sm" variant="secondary" onclick={() => (bulkOpen = true)}><Upload class="h-4 w-4" /> Bulk import</Button>
		<Button size="sm" onclick={openAdd}><Plus class="h-4 w-4" /> Add {config.label} rate</Button>
	</div>
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
						<td class="px-4 py-3 font-medium text-slate-700">
							{r.name}{#if r.item_type === 'hotel' && r.occupancy}<span class="ml-1 text-xs font-normal text-slate-400">· sleeps {r.occupancy}</span>{/if}
						</td>
						{#if config.hasCity}<td class="px-4 py-3"><Badge tone="neutral">{r.city ?? '—'}</Badge></td>{/if}
						<td class="px-4 py-3 text-slate-500">{vendorName(r.vendor_id)}</td>
						<td class="px-4 py-3 text-right text-slate-600">{formatAmount(Number(r.cost_price), r.currency)}</td>
						<td class="px-4 py-3 text-right text-slate-700">{formatAmount(Number(r.selling_price), r.currency)}</td>
						<td class="px-4 py-3 text-right font-medium {margin >= 0 ? 'text-green-600' : 'text-red-600'}">
							{formatAmount(margin, r.currency)}
						</td>
						<td class="px-4 py-3 text-xs">
							<div class="flex items-center gap-1.5">
								<span class="text-slate-400">{new Date(r.rate_date).toLocaleDateString()}</span>
								{#if isRateValid(r.rate_date)}
									<Badge tone="success">valid</Badge>
								{:else}
									<Badge tone="warning">stale</Badge>
								{/if}
							</div>
						</td>
						<td class="px-4 py-3">
							<div class="flex justify-end gap-1">
								<button onclick={() => openUpdateToday(r)} class="rounded p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" aria-label="Update today's rate" title="Update today's rate">
									<CalendarClock class="h-4 w-4" />
								</button>
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

<RateModal itemType={activeType} rate={editing} cloneAsNew={cloneMode} open={modalOpen} onClose={() => (modalOpen = false)} />

<BulkImportModal
	open={bulkOpen}
	onClose={() => (bulkOpen = false)}
	title="Bulk import rates"
	columns={['Type (hotel/transfer/visa/airline)', 'Name', 'City', 'Cost', 'Sell']}
	example={'hotel\tHilton Makkah\tMakkah\t200\t250\ntransfer\tSedan\t\t300\t380\nairline\tSaudia\t\t150000\t180000'}
	onImport={importRates}
/>
