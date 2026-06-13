<script lang="ts">
	import { untrack } from 'svelte';
	import { ChevronDown, ChevronRight, AlertTriangle, Building2 } from 'lucide-svelte';
	import { Badge } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useVendors } from '$features/vendors/queries';
	import { useHotelObservations } from './queries';
	import { groupHotelObservations } from './observations';

	let { hotelId }: { hotelId: string } = $props();

	// The parent remounts this panel via {#key hotelId}, so the initial value is
	// the intended one for the query.
	const obs = useHotelObservations(untrack(() => hotelId));
	const vendors = useVendors();
	let open = $state(false);

	const vendorName = $derived.by(() => {
		const map = new Map(($vendors.data ?? []).map((v) => [v.id, v.name]));
		return (id: string | null) => (id ? (map.get(id) ?? 'Unknown vendor') : 'Own / unspecified');
	});
	const groups = $derived(groupHotelObservations($obs.data ?? [], vendorName));
	const count = $derived(($obs.data ?? []).length);
	const cheapest = $derived.by(() => {
		const rates = ($obs.data ?? []).map((o) => Number(o.rate)).filter((r) => r > 0);
		return rates.length ? Math.min(...rates) : 0;
	});

	function fmtDate(s: string | null): string {
		if (!s) return '—';
		const d = new Date(s);
		return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}
	const roomLabel = (rt: string | null, occ: number | null) =>
		(rt ? rt.charAt(0).toUpperCase() + rt.slice(1) : 'Room') + (occ ? ` ·${occ}` : '');

	const mealTone = (m: string): 'neutral' | 'info' | 'warning' =>
		m === 'RO' ? 'neutral' : m === 'BB' ? 'info' : 'warning';
</script>

<div class="rounded-lg border border-slate-100 bg-slate-50/70">
	<button
		type="button"
		onclick={() => (open = !open)}
		class="flex w-full items-center justify-between px-3 py-2 text-left"
	>
		<span class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
			{#if open}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
			<Building2 class="h-3.5 w-3.5" /> Known vendor rates{count ? ` · ${count}` : ''}
		</span>
		{#if cheapest > 0}<span class="text-xs text-slate-400">from {formatAmount(cheapest, 'SAR')}</span>{/if}
	</button>

	{#if open}
		<div class="px-3 pb-3">
			{#if $obs.isLoading}
				<p class="text-xs text-slate-400">Loading rates…</p>
			{:else if groups.length === 0}
				<p class="text-xs text-slate-400">
					No saved vendor rates for this hotel yet. Rates you enter here are captured automatically.
				</p>
			{:else}
				<div class="space-y-3">
					{#each groups as g (g.vendor)}
						<div>
							<div class="mb-1 text-xs font-semibold text-slate-600">{g.vendor}</div>
							<div class="overflow-hidden rounded-md border border-slate-200 bg-white">
								<table class="w-full text-xs">
									<tbody class="divide-y divide-slate-50">
										{#each g.rows as r (`${r.roomType}|${r.mealPlan}|${r.validFrom}|${r.rate}`)}
											<tr class="hover:bg-slate-50">
												<td class="px-2 py-1.5 text-slate-600">{roomLabel(r.roomType, r.occupancy)}</td>
												<td class="px-2 py-1.5"><Badge tone={mealTone(r.mealPlan)}>{r.mealPlan}</Badge></td>
												<td class="whitespace-nowrap px-2 py-1.5 text-right font-medium text-slate-700">{formatAmount(r.rate, 'SAR')}</td>
												<td class="whitespace-nowrap px-2 py-1.5 text-slate-400">{fmtDate(r.validFrom)} → {fmtDate(r.validTo)}</td>
												<td class="px-2 py-1.5 text-right">
													{#if r.needsVerify}
														<span class="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-700">
															<AlertTriangle class="h-3 w-3" /> verify
														</span>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
