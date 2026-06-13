<script lang="ts">
	import {
		Plus,
		Pencil,
		Trash2,
		ShieldCheck,
		ShieldAlert,
		RotateCcw,
		X,
		ChevronDown,
		ChevronRight,
		Building2,
		AlertTriangle
	} from 'lucide-svelte';
	import { Badge, Button, Input, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useHotels } from '$features/hotels/queries';
	import { useVendors } from '$features/vendors/queries';
	import { useAllObservations, useDeleteObservation, useUpdateObservation } from './queries';
	import {
		enrichObservations,
		filterObservations,
		groupObservationsByHotel,
		EMPTY_FILTERS,
		type ObsFilters,
		type EnrichedObs
	} from './explorer';
	import ObservationModal from './ObservationModal.svelte';

	const obs = useAllObservations();
	const hotels = useHotels();
	const vendors = useVendors();
	const del = useDeleteObservation();
	const update = useUpdateObservation();

	let filters = $state<ObsFilters>({ ...EMPTY_FILTERS });
	let modalOpen = $state(false);
	let editing = $state<EnrichedObs | null>(null);
	// Hotels render expanded; staff collapse the ones they're not working on.
	let collapsed = $state(new Set<string>());

	const hotelMap = $derived(
		new Map(($hotels.data ?? []).map((h) => [h.id, { name: h.name, city: h.city }]))
	);
	const vendorName = $derived.by(() => {
		const map = new Map(($vendors.data ?? []).map((v) => [v.id, v.name]));
		return (id: string | null) => (id ? (map.get(id) ?? 'Unknown vendor') : 'Own / unspecified');
	});

	const enriched = $derived(enrichObservations($obs.data ?? [], hotelMap, vendorName));
	const filtered = $derived(filterObservations(enriched, filters));
	const groups = $derived(groupObservationsByHotel(filtered));
	const byId = $derived(new Map(enriched.map((r) => [r.id, r])));

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

	function reset() {
		filters = { ...EMPTY_FILTERS };
	}
	function toggleHotel(id: string) {
		const next = new Set(collapsed);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		collapsed = next;
	}
	function openAdd() {
		editing = null;
		modalOpen = true;
	}
	function openEdit(id: string) {
		editing = byId.get(id) ?? null;
		modalOpen = true;
	}
	function toggleVerify(id: string) {
		const r = byId.get(id);
		if (!r) return;
		const notes = r.needsVerify
			? (r.notes ?? '').replace(/^VERIFY:\s*/, '')
			: `VERIFY: ${r.notes ?? ''}`.trim();
		$update.mutate({ id, patch: { notes } });
	}
	function toggleInvalid(id: string) {
		const r = byId.get(id);
		if (!r) return;
		$update.mutate({ id, patch: { invalidated: !r.invalidated } });
	}
	function remove(id: string) {
		const r = byId.get(id);
		if (!r) return;
		if (confirm(`Delete this ${r.hotelName} rate permanently? Use “invalidate” instead to keep history.`))
			$del.mutate(id);
	}

	function fmtDate(s: string | null): string {
		if (!s) return '—';
		const d = new Date(s);
		return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
	}
	const roomLabel = (rt: string | null, occ: number | null) =>
		(rt ? rt.charAt(0).toUpperCase() + rt.slice(1) : 'Room') + (occ ? ` ·${occ}` : '');
	const mealTone = (m: string): 'neutral' | 'info' | 'warning' => (m === 'RO' ? 'neutral' : m === 'BB' ? 'info' : 'warning');
	const cityLabel = (c: string) => (c ? c.charAt(0).toUpperCase() + c.slice(1) : '');
</script>

<div class="mb-3 flex items-center justify-between">
	<p class="text-sm text-slate-500">Captured vendor rates, grouped by hotel → vendor → room. Each room lists its seasons.</p>
	<Button size="sm" onclick={openAdd}><Plus class="h-4 w-4" /> Add rate</Button>
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
		<span class="text-xs text-slate-500">{groups.length} hotels · {filtered.length} of {enriched.length} rates</span>
		{#if activeFilters > 0}
			<Button size="sm" variant="ghost" onclick={reset}><X class="h-4 w-4" /> Clear filters</Button>
		{/if}
	</div>
</div>

{#if $obs.isLoading}
	<p class="text-slate-400">Loading rates…</p>
{:else if $obs.isError}
	<p class="text-red-600">Failed to load: {$obs.error.message}</p>
{:else if groups.length === 0}
	<div class="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
		No rates match these filters.
	</div>
{:else}
	<div class="space-y-3">
		{#each groups as g (g.hotelId)}
			{@const open = !collapsed.has(g.hotelId)}
			<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
				<button
					type="button"
					onclick={() => toggleHotel(g.hotelId)}
					class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
				>
					<span class="flex items-center gap-2">
						{#if open}<ChevronDown class="h-4 w-4 text-slate-400" />{:else}<ChevronRight class="h-4 w-4 text-slate-400" />{/if}
						<Building2 class="h-4 w-4 text-slate-400" />
						<span class="font-semibold text-slate-800">{g.hotelName}</span>
						{#if g.hotelCity}<Badge tone="neutral">{cityLabel(g.hotelCity)}</Badge>{/if}
					</span>
					<span class="flex items-center gap-3 text-xs text-slate-400">
						{#if g.cheapest > 0}<span>from <span class="font-semibold text-slate-600">{formatAmount(g.cheapest, 'SAR')}</span></span>{/if}
						<span>{g.bandCount} {g.bandCount === 1 ? 'rate' : 'rates'}</span>
					</span>
				</button>

				{#if open}
					<div class="space-y-4 border-t border-slate-100 px-4 py-3">
						{#each g.vendors as v (v.vendorId ?? 'own')}
							<div>
								<div class="mb-1.5 flex items-center justify-between">
									<span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{v.vendor}</span>
									{#if v.cheapest > 0}<span class="text-xs text-slate-400">from {formatAmount(v.cheapest, 'SAR')}</span>{/if}
								</div>
								<div class="overflow-hidden rounded-lg border border-slate-100">
									<table class="w-full text-sm">
										<tbody class="divide-y divide-slate-50">
											{#each v.rooms as room (room.roomType + '|' + room.occupancy + '|' + room.mealPlan)}
												{#each room.bands as band, bi (band.id)}
													{@const r = byId.get(band.id)}
													<tr class="hover:bg-slate-50/60 {band.invalidated ? 'opacity-50' : ''}">
														<td class="w-32 px-3 py-1.5 align-top">
															{#if bi === 0}
																<span class="font-medium text-slate-700">{roomLabel(room.roomType, room.occupancy)}</span>
															{/if}
														</td>
														<td class="w-14 px-2 py-1.5 align-top">
															{#if bi === 0}<Badge tone={mealTone(room.mealPlan)}>{room.mealPlan}</Badge>{/if}
														</td>
														<td class="whitespace-nowrap px-3 py-1.5 text-slate-500">{fmtDate(band.from)} → {fmtDate(band.to)}</td>
														<td class="whitespace-nowrap px-3 py-1.5 text-right font-semibold text-slate-800">{formatAmount(band.rate, band.currency)}</td>
														<td class="px-3 py-1.5">
															<div class="flex items-center justify-end gap-1">
																{#if band.needsVerify}
																	<span class="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-700">
																		<AlertTriangle class="h-3 w-3" /> verify
																	</span>
																{/if}
																{#if band.invalidated}<Badge tone="danger">void</Badge>{/if}
																<button type="button" onclick={() => openEdit(band.id)} class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Edit"><Pencil class="h-4 w-4" /></button>
																<button type="button" onclick={() => toggleVerify(band.id)} class="rounded p-1 text-slate-400 hover:bg-amber-50 hover:text-amber-600" aria-label="Toggle verify">
																	{#if r?.needsVerify}<ShieldCheck class="h-4 w-4" />{:else}<ShieldAlert class="h-4 w-4" />{/if}
																</button>
																<button type="button" onclick={() => toggleInvalid(band.id)} class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Toggle invalidate"><RotateCcw class="h-4 w-4" /></button>
																<button type="button" onclick={() => remove(band.id)} class="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete"><Trash2 class="h-4 w-4" /></button>
															</div>
														</td>
													</tr>
												{/each}
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<ObservationModal observation={editing} open={modalOpen} onClose={() => (modalOpen = false)} />
