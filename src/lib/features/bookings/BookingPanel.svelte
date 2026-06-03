<script lang="ts">
	import { untrack } from 'svelte';
	import { PackageCheck } from 'lucide-svelte';
	import { Button, Card } from '$ui';
	import { useQuotations } from '$features/quotations/queries';
	import { useBookingForQuery, useCreateBooking } from './queries';
	import BookingDetail from './BookingDetail.svelte';

	let { queryId }: { queryId: string } = $props();

	const booking = untrack(() => useBookingForQuery(queryId));
	const quotations = untrack(() => useQuotations(queryId));
	const createBooking = untrack(() => useCreateBooking(queryId));

	// The quotation a booking is built from: the accepted one.
	const accepted = $derived(($quotations.data ?? []).find((q) => q.status === 'accepted'));

	function create() {
		if (accepted) $createBooking.mutate(accepted);
	}
</script>

<div class="mb-3 flex items-center justify-between">
	<h2 class="text-lg font-semibold text-slate-800">Booking</h2>
</div>

{#if $booking.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if !$booking.data}
	<Card>
		{#if accepted}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm text-slate-500">
					Create the booking from the accepted quotation (v{accepted.version}). Items
					auto-populate; you then record the actual vendor and costs.
				</p>
				<Button onclick={create} disabled={$createBooking.isPending}>
					<PackageCheck class="h-4 w-4" />
					{$createBooking.isPending ? 'Creating…' : 'Create booking'}
				</Button>
			</div>
		{:else}
			<p class="text-sm text-slate-500">
				Accept a quotation first (above) — the booking is built from it.
			</p>
		{/if}
	</Card>
{:else}
	{#key $booking.data.id}
		<BookingDetail booking={$booking.data} {queryId} />
	{/key}
{/if}
