<script lang="ts">
	import { untrack } from 'svelte';
	import { Sparkles, Map } from 'lucide-svelte';
	import { Button } from '$ui';
	import QuoteBuilder from '$features/quotations/QuoteBuilder.svelte';
	import { useQuotations, useAcceptQuotation } from '$features/quotations/queries';
	import type { Quotation } from '$features/quotations/types';
	import { useBookingForQuery, useSyncBookingFromQuotation } from './queries';

	let { queryId }: { queryId: string } = $props();

	const booking = untrack(() => useBookingForQuery(queryId));
	const quotations = untrack(() => useQuotations(queryId));
	const accept = untrack(() => useAcceptQuotation(queryId));
	const sync = untrack(() => useSyncBookingFromQuotation(queryId));

	// Load the current services into the builder: the booking's source version,
	// else the accepted one, else the latest — else start fresh.
	const sourceId = $derived.by(() => {
		const b = $booking.data;
		if (b?.quotation_id) return b.quotation_id;
		const qs = [...($quotations.data ?? [])];
		const accepted = qs.find((q) => q.status === 'accepted');
		if (accepted) return accepted.id;
		return qs.sort((a, b2) => b2.version - a.version)[0]?.id;
	});

	// Each save writes a new version; accept it and re-drive the booking from it.
	function onSaved(q: Quotation) {
		$accept.mutate(q, { onSettled: () => $sync.mutate(q) });
	}
</script>

<div class="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<Sparkles class="h-4 w-4 text-emerald-600" />
			<h2 class="text-sm font-semibold text-emerald-800">Finalize the booking</h2>
			<span class="text-xs text-emerald-700/70">same builder — saving books these services (the breakdown panel is our cost sheet)</span>
		</div>
		<Button size="sm" variant="secondary" href="/queries/{queryId}/itinerary">
			<Map class="h-4 w-4" /> Client itinerary
		</Button>
	</div>

	<div class="rounded-xl bg-white p-3">
		{#key sourceId}
			<QuoteBuilder {queryId} editId={sourceId} embedded mode="booking" {onSaved} />
		{/key}
	</div>
</div>
