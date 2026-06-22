<script lang="ts">
	import { untrack } from 'svelte';
	import { Map, FileText, Receipt, RotateCcw, FolderOpen } from 'lucide-svelte';
	import { Button } from '$ui';
	import { useUpdateQuery } from '$features/queries/queries';
	import { useBookingForQuery } from './queries';
	import { listBookingItems } from './api';
	import type { BookingItem } from './types';

	// Read-only confirmation view for a COMPLETED booking. Kept deliberately plain
	// for now (no banners / badges / amounts — those come later); the point is a
	// clear, finalised list of what's booked, distinct from the editor, plus a
	// Reopen escape hatch.
	let { queryId }: { queryId: string } = $props();

	const booking = untrack(() => useBookingForQuery(queryId));
	const update = useUpdateQuery();

	let rawItems = $state<BookingItem[]>([]);
	let itemsLoading = $state(true);
	$effect(() => {
		const id = $booking.data?.id;
		if (!id) return;
		itemsLoading = true;
		listBookingItems(id).then((r) => {
			rawItems = r;
			itemsLoading = false;
		});
	});

	const GROUPS: { type: BookingItem['line_type']; label: string }[] = [
		{ type: 'hotel', label: 'Accommodation' },
		{ type: 'transfer', label: 'Transfers' },
		{ type: 'visa', label: 'Visa' },
		{ type: 'ticket', label: 'Air tickets' },
		{ type: 'other', label: 'Other services' }
	];
	const groups = $derived(
		GROUPS.map((g) => ({ ...g, rows: rawItems.filter((i) => i.line_type === g.type) })).filter(
			(g) => g.rows.length > 0
		)
	);

	function isBooked(i: BookingItem): boolean {
		return (i.meta as Record<string, unknown>)?.booked === true;
	}
	function reopen() {
		$update.mutate({ id: queryId, patch: { booking_status: null, completed_date: null } });
	}
</script>

<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-sm font-semibold text-slate-700">Booking completed</h2>
		<div class="flex items-center gap-2">
			<Button size="sm" variant="secondary" href="/queries/{queryId}/itinerary"><Map class="h-4 w-4" /> Itinerary</Button>
			<Button size="sm" variant="secondary" href="/queries/{queryId}/invoice"><Receipt class="h-4 w-4" /> Invoice</Button>
			<Button size="sm" variant="secondary" href="/queries/{queryId}/voucher"><FileText class="h-4 w-4" /> Voucher</Button>
			<Button size="sm" disabled={$update.isPending} onclick={reopen}><RotateCcw class="h-4 w-4" /> Reopen</Button>
		</div>
	</div>

	{#if itemsLoading}
		<p class="text-sm text-slate-400">Loading booking…</p>
	{:else if groups.length === 0}
		<p class="text-sm text-slate-400">No services recorded on this booking.</p>
	{:else}
		<div class="space-y-3">
			{#each groups as g (g.label)}
				<div class="overflow-hidden rounded-xl border border-slate-200">
					<div class="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
						{g.label}
					</div>
					<div class="divide-y divide-slate-50">
						{#each g.rows as r (r.id)}
							<div class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
								<span class="truncate text-slate-700">{r.label}</span>
								<span class="shrink-0 text-xs font-medium {isBooked(r) ? 'text-green-600' : 'text-slate-400'}">
									{isBooked(r) ? 'Booked' : 'Pending'}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="mt-3 flex items-center gap-2 text-xs text-slate-400">
		<FolderOpen class="h-4 w-4" /> Proofs & vouchers are filed under Documents on this query.
	</div>
</div>
