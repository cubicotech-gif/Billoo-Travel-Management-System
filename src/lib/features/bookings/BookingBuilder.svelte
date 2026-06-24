<script lang="ts">
	import { untrack } from 'svelte';
	import { Map, FileText, CheckCircle2, Check, Layers, ChevronDown, ChevronRight, FilePlus2 } from 'lucide-svelte';
	import { Button } from '$ui';
	import QuoteBuilder from '$features/quotations/QuoteBuilder.svelte';
	import { useQuotations } from '$features/quotations/queries';
	import type { Quotation } from '$features/quotations/types';
	import { useUpdateQuery } from '$features/queries/queries';
	import {
		useBookingForQuery,
		useSyncBookingFromQuotation,
		useSetBookingBasis,
		useStartBlankBooking,
		useMarkBookingComplete
	} from './queries';

	let { queryId }: { queryId: string } = $props();

	const booking = untrack(() => useBookingForQuery(queryId));
	const quotations = untrack(() => useQuotations(queryId));
	const sync = untrack(() => useSyncBookingFromQuotation(queryId));
	const setBasis = untrack(() => useSetBookingBasis(queryId));
	const startBlank = untrack(() => useStartBlankBooking(queryId));
	const markComplete = untrack(() => useMarkBookingComplete(queryId));
	const update = useUpdateQuery();

	const hasBooking = $derived(!!$booking.data);
	// The quotation the booking currently edits (its own working copy).
	const basis = $derived($booking.data?.quotation_id ?? undefined);

	// Versions to drift from = the client tier quotes: everything except archived
	// ones and the booking's own working copy.
	const tiers = $derived(
		[...($quotations.data ?? [])]
			.filter((q) => q.status !== 'archived' && q.id !== basis)
			.sort((a, b) => b.version - a.version)
	);

	// Picker visible by default until a booking exists; then tucked behind a toggle.
	let pickerOpen = $state(false);
	const showPicker = $derived(!hasBooking || pickerOpen);

	const busy = $derived($setBasis.isPending || $startBlank.isPending);

	function drift(sourceId: string) {
		if (hasBooking && !confirm('Switch the booking to this version? It replaces the current booking services with this version (your tier quotes stay untouched).')) return;
		$setBasis.mutate(sourceId, { onSuccess: () => (pickerOpen = false) });
	}
	function blank() {
		if (hasBooking && !confirm('Start the booking over from a blank sheet?')) return;
		$startBlank.mutate(undefined, { onSuccess: () => (pickerOpen = false) });
	}

	// Brief "saved" confirmation after a save re-drives the booking.
	let savedAt = $state(0);
	$effect(() => {
		if (!savedAt) return;
		const t = setTimeout(() => (savedAt = 0), 3000);
		return () => clearTimeout(t);
	});

	// A booking-stage save updates the working copy in place (no new version).
	// Refresh the query's headline totals quietly and re-drive the booking.
	function onSaved(q: Quotation) {
		$update.mutate({ id: queryId, patch: { cost_price: q.total_cost_pkr, selling_price: q.total_sell_pkr } });
		$sync.mutate(q, { onSuccess: () => (savedAt = Date.now()) });
	}

	// Finalise the booking: the system stamps the completion date and auto-routes
	// to the right check-in-left bucket based on payments vs the package total.
	function markCompleted() {
		$markComplete.mutate();
	}

	function fmtDate(iso: string): string {
		return new Date(iso).toLocaleDateString();
	}
</script>

<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-sm font-semibold text-slate-700">Finalize the booking</h2>
		<div class="flex items-center gap-2">
			{#if busy}<span class="text-xs text-slate-400">working…</span>
			{:else if savedAt}<span class="inline-flex items-center gap-1 text-xs font-medium text-green-600"><Check class="h-3.5 w-3.5" /> Saved</span>{/if}
			<Button size="sm" variant="secondary" href="/queries/{queryId}/itinerary"><Map class="h-4 w-4" /> Itinerary</Button>
			<Button size="sm" variant="secondary" href="/queries/{queryId}/invoice"><FileText class="h-4 w-4" /> Invoice</Button>
			{#if hasBooking}
				<Button size="sm" disabled={$markComplete.isPending} onclick={markCompleted}><CheckCircle2 class="h-4 w-4" /> Mark completed</Button>
			{/if}
		</div>
	</div>

	<!-- Booking basis: pick a quotation version to drift from (or start blank). -->
	<div class="mb-3 rounded-xl border border-slate-200">
		<button
			type="button"
			onclick={() => (pickerOpen = !pickerOpen)}
			class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
			disabled={!hasBooking}
		>
			<span class="flex items-center gap-2 text-sm font-medium text-slate-600">
				<Layers class="h-4 w-4 text-slate-400" />
				{#if hasBooking}Booking basis · choose a version to drift from{:else}Start the booking — pick a quotation version{/if}
			</span>
			{#if hasBooking}
				{#if pickerOpen}<ChevronDown class="h-4 w-4 text-slate-400" />{:else}<ChevronRight class="h-4 w-4 text-slate-400" />{/if}
			{/if}
		</button>

		{#if showPicker}
			<div class="space-y-1.5 border-t border-slate-100 p-3">
				{#if $quotations.isLoading}
					<p class="text-sm text-slate-400">Loading versions…</p>
				{:else}
					{#each tiers as q (q.id)}
						<div class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
							<div class="min-w-0">
								<div class="truncate text-sm font-medium text-slate-700">
									Quote v{q.version}{q.label ? ` · ${q.label}` : ''}
								</div>
								<div class="text-xs text-slate-400">{q.status} · {fmtDate(q.created_at)}</div>
							</div>
							<Button size="sm" variant="secondary" disabled={busy} onclick={() => drift(q.id)}>
								{hasBooking ? 'Switch to this' : 'Start from this'}
							</Button>
						</div>
					{/each}
					{#if tiers.length === 0}
						<p class="text-sm text-slate-400">No quotation versions yet.</p>
					{/if}
					<button
						type="button"
						onclick={blank}
						disabled={busy}
						class="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
					>
						<FilePlus2 class="h-4 w-4" /> Start a blank booking
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if hasBooking && basis}
		<div class="rounded-xl bg-slate-50/50 p-3">
			{#key basis}
				<QuoteBuilder {queryId} editId={basis} embedded mode="booking" {onSaved} />
			{/key}
		</div>
	{:else if !hasBooking}
		<p class="px-1 py-6 text-center text-sm text-slate-400">
			Pick a quotation version above (or start blank) to begin the booking.
		</p>
	{/if}
</div>
