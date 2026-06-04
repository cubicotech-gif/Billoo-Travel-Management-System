<script lang="ts">
	import { Badge } from '$ui';
	import { MapPin, MessageSquareText, ClipboardList } from 'lucide-svelte';
	import type { Query } from './types';

	let { query }: { query: Query } = $props();

	const cities = $derived(query.itinerary_cities ?? []);
	const hasResponse = $derived(query.responded || query.response_text || query.initial_quotation);
	const hasCapture = $derived(query.customer_plan || query.quick_note);
</script>

<div class="space-y-4">
	<!-- Trip -->
	<div class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
		<div>
			<div class="text-xs uppercase tracking-wide text-slate-400">Trip type</div>
			<div class="font-medium text-slate-700">{query.package_type ?? '—'}</div>
		</div>
		{#if query.trip_country}
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Country</div>
				<div class="font-medium text-slate-700">{query.trip_country}</div>
			</div>
		{/if}
		{#if query.travel_date}
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Travel date</div>
				<div class="font-medium text-slate-700">{query.travel_date}</div>
			</div>
		{/if}
		{#if query.duration_days}
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-400">Duration</div>
				<div class="font-medium text-slate-700">{query.duration_days} days</div>
			</div>
		{/if}
	</div>

	<!-- Itinerary cities -->
	{#if cities.length}
		<div>
			<div class="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
				<MapPin class="h-3.5 w-3.5" /> Itinerary
			</div>
			<div class="overflow-hidden rounded-lg border border-slate-200">
				<table class="w-full text-sm">
					<tbody class="divide-y divide-slate-50">
						{#each cities as c, i (i)}
							<tr>
								<td class="px-3 py-1.5 font-medium text-slate-700">{c.city || '—'}</td>
								<td class="px-3 py-1.5 text-slate-500">{c.nights} nights</td>
								{#if c.arrival_date}<td class="px-3 py-1.5 text-slate-500">arr {c.arrival_date}</td>{/if}
								{#if c.activities}<td class="px-3 py-1.5 text-slate-500">{c.activities} activities</td>{/if}
								<td class="px-3 py-1.5 text-slate-400">{c.hotel_preference}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Preferences -->
	{#if query.hotel_preference || query.client_preference}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#if query.hotel_preference}
				<div>
					<div class="text-xs uppercase tracking-wide text-slate-400">Hotel preference</div>
					<div class="text-sm text-slate-600">{query.hotel_preference}</div>
				</div>
			{/if}
			{#if query.client_preference}
				<div>
					<div class="text-xs uppercase tracking-wide text-slate-400">Client preference</div>
					<div class="text-sm text-slate-600">{query.client_preference}</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Free-text capture -->
	{#if hasCapture}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#if query.customer_plan}
				<div class="rounded-lg bg-slate-50 p-3">
					<div class="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-slate-400">
						<ClipboardList class="h-3.5 w-3.5" /> Customer's plan
					</div>
					<p class="whitespace-pre-wrap text-sm text-slate-600">{query.customer_plan}</p>
				</div>
			{/if}
			{#if query.quick_note}
				<div class="rounded-lg bg-slate-50 p-3">
					<div class="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-slate-400">
						<MessageSquareText class="h-3.5 w-3.5" /> Quick note
					</div>
					<p class="whitespace-pre-wrap text-sm text-slate-600">{query.quick_note}</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Initial response -->
	{#if hasResponse}
		<div class="rounded-lg border border-slate-100 p-3">
			<div class="mb-1 flex items-center gap-2">
				<span class="text-xs font-semibold uppercase text-slate-400">Initial response</span>
				<Badge tone={query.responded ? 'success' : 'neutral'}>{query.responded ? 'Responded' : 'Not yet'}</Badge>
			</div>
			{#if query.response_text}<p class="text-sm text-slate-600">{query.response_text}</p>{/if}
			{#if query.initial_quotation}<p class="mt-1 text-sm text-slate-500">Initial quote: {query.initial_quotation}</p>{/if}
		</div>
	{/if}

	{#if !cities.length && !hasCapture && !query.client_preference && !query.hotel_preference}
		<p class="text-sm text-slate-400">No intake detail captured yet.</p>
	{/if}
</div>
