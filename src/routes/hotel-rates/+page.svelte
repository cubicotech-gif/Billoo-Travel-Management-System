<script lang="ts">
	import { Plus, Pencil, Trash2, ShieldCheck, ShieldAlert, RotateCcw, X } from 'lucide-svelte';
	import { Badge, Button, Input, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useHotels } from '$features/hotels/queries';
	import { useVendors } from '$features/vendors/queries';
	import { useAllObservations, useDeleteObservation, useUpdateObservation } from '$features/rates/queries';
	import {
		enrichObservations,
		filterObservations,
		sortObservations,
		EMPTY_FILTERS,
		type ObsFilters,
		type ObsSort,
		type ObsSortKey,
		type EnrichedObs
	} from '$features/rates/explorer';
	import type { RateObservation } from '$features/rates/observations';
	import ObservationModal from '$features/rates/ObservationModal.svelte';

	const obs = useAllObservations();
	const hotels = useHotels();
	const vendors = useVendors();
	const del = useDeleteObservation();
	const update = useUpdateObservation();

	let filters = $state<ObsFilters>({ ...EMPTY_FILTERS });
	let sort = $state<ObsSort>({ key: 'captured_at', dir: 'desc' });
	let modalOpen = $state(false);
	let editing = $state<RateObservation | null>(null);

	const hotelMap = $derived(
		new Map(($hotels.data ?? []).map((h) => [h.id, { name: h.name, city: h.city }]))
	);
	const vendorName = $derived.by(() => {
		const map = new Map(($vendors.data ?? []).map((v) => [v.id, v.name]));
		return (id: string | null) => (id ? (map.get(id) ?? 'Unknown vendor') : 'Own / unspecified');
	});

	const enriched = $derived(enrichObservations($obs.data ?? [], hotelMap, vendorName));
	const rows = $derived(sortObservations(filterObservations(enriched, filters), sort));

	const hotelOptions = $derived([
		{ value: '', label: 'All hotels' },
		...($hotels.data ?? []).map((h) => ({ value: h.id, label: `${h.name} · ${h.city}` }))
	]);
	const vendorOptions = $derived([
		{ value: '', label: 'All vendors' },
		...($vendors.data ?? []).map((v) => ({ value: v.id, label: v.name }))
	]);
	const roomOptions = [
		{ value: '', label: 'All rooms' },
		{ value: 'double', label: 'Double' },
		{ value: 'triple', label: 'Triple' },
		{ value: 'quad', label: 'Quad' },
		{ value: 'sharing', label: 'Sharing' },
		{ value: 'custom', label: 'Custom' }
	];
	const mealOptions = [
		{ value: '', label: 'All meals' },
		{ value: 'RO', label: 'RO' },
		{ value: 'BB', label: 'BB' },
		{ value: 'HB', label: 'HB' },
		{ value: 'FB', label: 'FB' }
	];
	const cityOptions = [
		{ value: '', label: 'All cities' },
		{ value: 'makkah', label: 'Makkah' },
		{ value: 'madinah', label: 'Madinah' },
		{ value: 'other', label: 'Other' }
	];
	const sourceOptions = [
		{ value: '', label: 'All sources' },
		{ value: 'manual_entry', label: 'Manual' },
		{ value: 'rate_sheet_import', label: 'Rate sheet' },
		{ value: 'workshop_capture', label: 'Workshop' },
		{ value: 'suggestion_accepted', label: 'Suggestion' },
		{ value: 'backfill_quotations', label: 'Backfill' }
	];
	const statusOptions = [
		{ value: 'live', label: 'Live only' },
		{ value: 'verify', label: 'Needs verify' },
		{ value: 'invalidated', label: 'Invalidated' },
		{ value: 'all', label: 'All' }
	];

	const activeFilters = $derived(
		Object.entries(filters).filter(([k, v]) => v && !(k === 'status' && v === 'live')).length
	);

	function setSort(key: ObsSortKey) {
		if (sort.key === key) sort = { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' };
		else sort = { key, dir: key === 'rate' ? 'asc' : 'desc' };
	}
	function reset() {
		filters = { ...EMPTY_FILTERS };
	}
	function openAdd() {
		editing = null;
		modalOpen = true;
	}
	function openEdit(r: EnrichedObs) {
		editing = $obs.data?.find((o) => o.id === r.id) ?? null;
		modalOpen = true;
	}
	function toggleVerify(r: EnrichedObs) {
		const notes = r.needsVerify
			? (r.notes ?? '').replace(/^VERIFY:\s*/, '')
			: `VERIFY: ${r.notes ?? ''}`.trim();
		$update.mutate({ id: r.id, patch: { notes } });
	}
	function toggleInvalid(r: EnrichedObs) {
		$update.mutate({ id: r.id, patch: { invalidated: !r.invalidated } });
	}
	function remove(r: EnrichedObs) {
		if (confirm(`Delete this ${r.hotelName} rate permanently? Use “invalidate” instead to keep history.`))
			$del.mutate(r.id);
	}

	function fmtDate(s: string | null): string {
		if (!s) return '—';
		const d = new Date(s);
		return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
	}
	const mealTone = (m: string): 'neutral' | 'info' | 'warning' => (m === 'RO' ? 'neutral' : m === 'BB' ? 'info' : 'warning');
	const sortIcon = (key: ObsSortKey) => (sort.key === key ? (sort.dir === 'asc' ? '↑' : '↓') : '');
</script>

<div class="mb-5 flex items-center justify-between">
	<div>
		<h1 class="text-2xl font-bold text-slate-800">Hotel Rates</h1>
		<p class="text-sm text-slate-500">Every vendor rate ever captured — filter, compare, and keep clean.</p>
	</div>
	<Button onclick={openAdd}><Plus class="h-4 w-4" /> Add rate</Button>
</div>

<!-- Filters -->
<div class="mb-4 rounded-xl border border-slate-200 bg-white p-3">
	<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
		<Select label="Vendor" bind:value={filters.vendorId} options={vendorOptions} />
		<Select label="Hotel" bind:value={filters.hotelId} options={hotelOptions} />
		<Select label="City" bind:value={filters.city} options={cityOptions} />
		<Select label="Room" bind:value={filters.roomType} options={roomOptions} />
		<Select label="Meal" bind:value={filters.mealPlan} options={mealOptions} />
		<Select label="Source" bind:value={filters.source} options={sourceOptions} />
		<Select label="Status" bind:value={filters.status} options={statusOptions} />
		<Input label="Search" bind:value={filters.search} placeholder="hotel / vendor / note" />
		<Input label="Valid from" type="date" bind:value={filters.from} />
		<Input label="Valid to" type="date" bind:value={filters.to} />
	</div>
	<div class="mt-2 flex items-center justify-between">
		<span class="text-xs text-slate-500">{rows.length} of {enriched.length} rates</span>
		{#if activeFilters > 0}
			<Button size="sm" variant="ghost" onclick={reset}><X class="h-4 w-4" /> Clear filters</Button>
		{/if}
	</div>
</div>

{#if $obs.isLoading}
	<p class="text-slate-400">Loading rates…</p>
{:else if $obs.isError}
	<p class="text-red-600">Failed to load: {$obs.error.message}</p>
{:else if rows.length === 0}
	<div class="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
		No rates match these filters.
	</div>
{:else}
	<div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
				<tr>
					<th class="cursor-pointer px-3 py-2" onclick={() => setSort('hotel')}>Hotel {sortIcon('hotel')}</th>
					<th class="cursor-pointer px-3 py-2" onclick={() => setSort('vendor')}>Vendor {sortIcon('vendor')}</th>
					<th class="px-3 py-2">Room</th>
					<th class="px-3 py-2">Meal</th>
					<th class="cursor-pointer px-3 py-2 text-right" onclick={() => setSort('rate')}>Rate {sortIcon('rate')}</th>
					<th class="cursor-pointer px-3 py-2" onclick={() => setSort('check_in')}>Valid {sortIcon('check_in')}</th>
					<th class="cursor-pointer px-3 py-2" onclick={() => setSort('captured_at')}>Captured {sortIcon('captured_at')}</th>
					<th class="px-3 py-2"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-50">
				{#each rows as r (r.id)}
					<tr class="hover:bg-slate-50 {r.invalidated ? 'opacity-50' : ''}">
						<td class="px-3 py-2">
							<div class="font-medium text-slate-700">{r.hotelName}</div>
							<div class="text-xs capitalize text-slate-400">{r.hotelCity}</div>
						</td>
						<td class="px-3 py-2 text-slate-600">{r.vendorName}</td>
						<td class="px-3 py-2 capitalize text-slate-600">{r.room_type ?? '—'}{r.occupancy ? ` ·${r.occupancy}` : ''}</td>
						<td class="px-3 py-2"><Badge tone={mealTone(r.meal_plan)}>{r.meal_plan}</Badge></td>
						<td class="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-800">{formatAmount(Number(r.rate), r.currency)}</td>
						<td class="whitespace-nowrap px-3 py-2 text-slate-500">{fmtDate(r.check_in)} → {fmtDate(r.check_out)}</td>
						<td class="whitespace-nowrap px-3 py-2 text-xs text-slate-400">{fmtDate(r.captured_at)}</td>
						<td class="px-3 py-2">
							<div class="flex items-center justify-end gap-1">
								{#if r.needsVerify}<Badge tone="warning">verify</Badge>{/if}
								{#if r.invalidated}<Badge tone="danger">void</Badge>{/if}
								<button type="button" onclick={() => openEdit(r)} class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Edit"><Pencil class="h-4 w-4" /></button>
								<button type="button" onclick={() => toggleVerify(r)} class="rounded p-1 text-slate-400 hover:bg-amber-50 hover:text-amber-600" aria-label="Toggle verify">
									{#if r.needsVerify}<ShieldCheck class="h-4 w-4" />{:else}<ShieldAlert class="h-4 w-4" />{/if}
								</button>
								<button type="button" onclick={() => toggleInvalid(r)} class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Toggle invalidate">
									<RotateCcw class="h-4 w-4" />
								</button>
								<button type="button" onclick={() => remove(r)} class="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete"><Trash2 class="h-4 w-4" /></button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<ObservationModal observation={editing} open={modalOpen} onClose={() => (modalOpen = false)} />
