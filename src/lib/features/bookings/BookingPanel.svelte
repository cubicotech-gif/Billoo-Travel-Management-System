<script lang="ts">
	import { untrack } from 'svelte';
	import { PackageCheck, FilePlus2, Check } from 'lucide-svelte';
	import { Badge, Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import { QUOTATION_STATUS_TONE, type Quotation } from '$features/quotations/types';
	import { useQuotations, useAcceptQuotation } from '$features/quotations/queries';
	import { useBookingForQuery, useCreateBooking, useCreateBlankBooking } from './queries';
	import BookingDetail from './BookingDetail.svelte';

	let { queryId }: { queryId: string } = $props();

	const booking = untrack(() => useBookingForQuery(queryId));
	const quotations = untrack(() => useQuotations(queryId));
	const accept = untrack(() => useAcceptQuotation(queryId));
	const createBooking = untrack(() => useCreateBooking(queryId));
	const createBlank = untrack(() => useCreateBlankBooking(queryId));

	const versions = $derived(($quotations.data ?? []).filter((q) => q.status !== 'archived'));
	let working = $state<string | null>(null);

	// Seed the booking from a chosen version right here — accept it (if needed)
	// then build the booking from it. No trip back to the Working stage.
	function useVersion(q: Quotation) {
		working = q.id;
		const build = () => $createBooking.mutate(q, { onSettled: () => (working = null) });
		if (q.status === 'accepted') build();
		else $accept.mutate(q, { onSuccess: build, onError: () => (working = null) });
	}

	function fmtDate(iso: string): string {
		return new Date(iso).toLocaleDateString();
	}
</script>

{#if $booking.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $booking.data}
	{#key $booking.data.id}
		<BookingDetail booking={$booking.data} {queryId} />
	{/key}
{:else}
	<!-- No booking yet: pick a quoted version to seed it, or start blank. -->
	<div class="rounded-xl border border-slate-200 bg-white p-4">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-slate-700">Start the booking</h3>
			<Button size="sm" variant="secondary" disabled={$createBlank.isPending} onclick={() => $createBlank.mutate()}>
				<FilePlus2 class="h-4 w-4" /> Start blank
			</Button>
		</div>

		{#if versions.length === 0}
			<p class="text-sm text-slate-400">
				No quotations to pull from. Use <span class="font-medium">Start blank</span> to add vendor services directly.
			</p>
		{:else}
			<p class="mb-3 text-xs text-slate-400">Pick the version the client confirmed — it seeds the booking with those services and prices.</p>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each versions as q (q.id)}
					<div class="rounded-lg border border-slate-200 p-3">
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<span class="text-sm font-semibold text-slate-700">v{q.version}</span>
								{#if q.label}<Badge tone="info">{q.label}</Badge>{/if}
								<Badge tone={QUOTATION_STATUS_TONE[q.status]}>{q.status}</Badge>
							</div>
							<span class="text-[11px] text-slate-400">{fmtDate(q.created_at)}</span>
						</div>
						<div class="mt-2 flex items-end justify-between gap-2">
							<div>
								<div class="text-base font-bold text-slate-800">{formatAmount(Number(q.total_sell_pkr), 'PKR')}</div>
								{#if Number(q.per_person_pkr) > 0}
									<div class="text-xs text-slate-400">{formatAmount(Number(q.per_person_pkr), 'PKR')}/person</div>
								{/if}
								<div class="text-xs font-medium text-green-600">+{formatAmount(Number(q.profit_pkr), 'PKR')} profit</div>
							</div>
							<Button size="sm" disabled={working !== null} onclick={() => useVersion(q)}>
								{#if working === q.id}<Check class="h-4 w-4" /> Seeding…{:else}<PackageCheck class="h-4 w-4" /> Use this version{/if}
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
