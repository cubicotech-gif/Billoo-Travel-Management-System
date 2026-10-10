<script lang="ts">
	import { untrack } from 'svelte';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import { Badge } from '$ui';
	import { optionStays, summarizeStays } from './catalogue';
	import { useHajjPackageDays } from './queries';
	import type { HajjOptionCode, HajjPackage } from './types';

	// Hotels for the chosen option, plus a collapsible day-by-day itinerary.
	// Mount per package (e.g. inside {#key pkg.id}): the days hook is keyed on it.
	let { pkg, option }: { pkg: HajjPackage; option: HajjOptionCode } = $props();

	const days = untrack(() => useHajjPackageDays(pkg.id));
	let open = $state(false);

	const rows = $derived($days.data ?? []);
	const stays = $derived(optionStays(rows, option));
</script>

<div class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
	<div class="flex flex-wrap items-center gap-2">
		<span class="font-medium text-slate-700">{pkg.has_aziziya ? 'With Aziziya' : 'Non-Aziziya'}</span>
		<Badge tone="neutral">{pkg.is_shifting ? 'Shifting' : 'Non-shifting'}</Badge>
		{#if pkg.is_short}<Badge tone="warning">Short package</Badge>{/if}
		<button
			type="button"
			class="ml-auto inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
			onclick={() => (open = !open)}
		>
			{open ? 'Hide' : 'Show'} itinerary
			{#if open}<ChevronUp class="h-3.5 w-3.5" />{:else}<ChevronDown class="h-3.5 w-3.5" />{/if}
		</button>
	</div>

	{#if $days.isLoading}
		<p class="mt-1 text-slate-400">Loading hotels…</p>
	{:else if stays.length}
		<p class="mt-1">{summarizeStays(stays)}</p>
	{/if}
	{#if pkg.notes}<p class="mt-1 text-slate-500">{pkg.notes}</p>{/if}

	{#if open}
		<div class="table-scroll mt-2">
			<table class="w-full text-left text-xs">
				<thead class="text-slate-400">
					<tr>
						<th class="py-1 pr-3 font-medium">Day</th>
						<th class="py-1 pr-3 font-medium">Date</th>
						<th class="py-1 pr-3 font-medium">Hijri</th>
						<th class="py-1 pr-3 font-medium">City</th>
						<th class="py-1 font-medium">Accommodation</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as d (d.id)}
						{@const hotel = option === 'B' ? (d.hotel_b ?? d.hotel_a) : d.hotel_a}
						<tr class="border-t border-slate-200 {d.kind === 'stay' ? '' : 'text-slate-500'}">
							<td class="py-1 pr-3 tabular-nums">{d.day_no}</td>
							<td class="py-1 pr-3 whitespace-nowrap">
								{new Date(`${d.date_ad}T00:00:00Z`).toLocaleDateString('en-GB', {
									day: 'numeric',
									month: 'short',
									timeZone: 'UTC'
								})}{d.date_ad_end
									? `–${new Date(`${d.date_ad_end}T00:00:00Z`).getUTCDate()}`
									: ''}
							</td>
							<td class="py-1 pr-3 whitespace-nowrap">{d.hijri_label ?? ''}</td>
							<td class="py-1 pr-3">{d.city_label}</td>
							<td class="py-1">{hotel}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
