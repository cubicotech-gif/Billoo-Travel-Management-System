<script lang="ts">
	import { untrack } from 'svelte';
	import { Sparkles, Map, FileText, CheckCircle2, RotateCcw, Check } from 'lucide-svelte';
	import { Badge, Button } from '$ui';
	import QuoteBuilder from '$features/quotations/QuoteBuilder.svelte';
	import { useQuotations, useAcceptQuotation } from '$features/quotations/queries';
	import type { Quotation } from '$features/quotations/types';
	import { useQueryDetail, useUpdateQuery } from '$features/queries/queries';
	import { useBookingForQuery, useSyncBookingFromQuotation } from './queries';

	let { queryId }: { queryId: string } = $props();

	const query = untrack(() => useQueryDetail(queryId));
	const booking = untrack(() => useBookingForQuery(queryId));
	const quotations = untrack(() => useQuotations(queryId));
	const accept = untrack(() => useAcceptQuotation(queryId));
	const sync = untrack(() => useSyncBookingFromQuotation(queryId));
	const update = useUpdateQuery();

	// Pin the version the builder opens with ONCE — the booking's source version,
	// else the accepted one, else the latest. Pinning avoids remounting (and
	// losing the user's edits) every time a save re-syncs the booking.
	let pinned = $state<string | undefined>(undefined);
	let ready = $state(false);
	$effect(() => {
		if (ready) return;
		if ($query.isLoading || $booking.isLoading || $quotations.isLoading) return;
		const b = $booking.data;
		const qs = [...($quotations.data ?? [])];
		pinned =
			b?.quotation_id ??
			qs.find((q) => q.status === 'accepted')?.id ??
			qs.sort((a, c) => c.version - a.version)[0]?.id;
		ready = true;
	});

	const completed = $derived($query.data?.booking_status === 'Completed');
	const hasBooking = $derived(!!$booking.data);

	// Brief "saved" confirmation after a save re-drives the booking.
	let savedAt = $state(0);
	$effect(() => {
		if (!savedAt) return;
		const t = setTimeout(() => (savedAt = 0), 3500);
		return () => clearTimeout(t);
	});

	// A save writes a new version; accept it, then re-drive the booking from it.
	function onSaved(q: Quotation) {
		$accept.mutate(q, {
			onSettled: () => $sync.mutate(q, { onSuccess: () => (savedAt = Date.now()) })
		});
	}

	function toggleCompleted() {
		const patch = completed
			? { booking_status: null, completed_date: null }
			: { booking_status: 'Completed' as const, completed_date: new Date().toISOString() };
		$update.mutate({ id: queryId, patch });
	}

	const busy = $derived($accept.isPending || $sync.isPending);
</script>

<div
	class="rounded-2xl border p-4 shadow-sm transition-colors {completed
		? 'border-green-300 bg-green-50/50'
		: 'border-emerald-200 bg-emerald-50/40'}"
>
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<div class="flex flex-wrap items-center gap-2">
			<Sparkles class="h-4 w-4 {completed ? 'text-green-600' : 'text-emerald-600'}" />
			<h2 class="text-sm font-semibold {completed ? 'text-green-800' : 'text-emerald-800'}">
				{completed ? 'Booking completed' : 'Finalize the booking'}
			</h2>
			{#if completed}
				<Badge tone="success">Completed</Badge>
			{:else}
				<span class="text-xs text-emerald-700/70">
					same builder — saving books these services (the breakdown panel is our cost sheet)
				</span>
			{/if}
			{#if busy}
				<span class="text-xs text-slate-400">saving…</span>
			{:else if savedAt}
				<span class="inline-flex items-center gap-1 text-xs font-medium text-green-600">
					<Check class="h-3.5 w-3.5" /> Booked
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<Button size="sm" variant="secondary" href="/queries/{queryId}/itinerary">
				<Map class="h-4 w-4" /> Client itinerary
			</Button>
			<Button size="sm" variant="secondary" href="/queries/{queryId}/invoice">
				<FileText class="h-4 w-4" /> Invoice
			</Button>
			{#if hasBooking}
				<Button
					size="sm"
					variant={completed ? 'ghost' : 'primary'}
					disabled={$update.isPending}
					onclick={toggleCompleted}
				>
					{#if completed}
						<RotateCcw class="h-4 w-4" /> Reopen
					{:else}
						<CheckCircle2 class="h-4 w-4" /> Mark completed
					{/if}
				</Button>
			{/if}
		</div>
	</div>

	<div class="rounded-xl bg-white p-3">
		{#if ready}
			<QuoteBuilder {queryId} editId={pinned} embedded mode="booking" {onSaved} />
		{:else}
			<p class="p-4 text-sm text-slate-400">Loading booking…</p>
		{/if}
	</div>
</div>
