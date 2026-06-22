<script lang="ts">
	import { untrack } from 'svelte';
	import { CheckCircle2, Map, FileText, Receipt, RotateCcw, FolderOpen, Circle } from 'lucide-svelte';
	import { Badge, Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import { toNumber } from '$lib/money';
	import { useQueryDetail, useUpdateQuery } from '$features/queries/queries';
	import { useBookingForQuery } from './queries';
	import { listBookingItems } from './api';
	import { ratesOf, toPkr } from './totals';
	import type { BookingItem } from './types';

	// Read-only confirmation summary for a COMPLETED booking. Distinct from the
	// builder so staff instantly see the booking is done — grouped, status-driven
	// service cards + the final figures, with a Reopen escape hatch to edit again.
	let { queryId }: { queryId: string } = $props();

	const query = untrack(() => useQueryDetail(queryId));
	const booking = untrack(() => useBookingForQuery(queryId));
	const update = useUpdateQuery();

	// Load the booking's items once its id resolves (read-only view).
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

	const rates = $derived($booking.data ? ratesOf($booking.data) : { roe: 0, usdRate: 0 });

	const GROUPS: { type: BookingItem['line_type']; label: string; accent: string }[] = [
		{ type: 'hotel', label: 'Accommodation', accent: 'border-l-indigo-400' },
		{ type: 'transfer', label: 'Transfers', accent: 'border-l-amber-400' },
		{ type: 'visa', label: 'Visa', accent: 'border-l-emerald-400' },
		{ type: 'ticket', label: 'Air tickets', accent: 'border-l-sky-400' },
		{ type: 'other', label: 'Other services', accent: 'border-l-violet-400' }
	];
	const groups = $derived(
		GROUPS.map((g) => ({
			...g,
			rows: rawItems.filter((i) => i.line_type === g.type)
		})).filter((g) => g.rows.length > 0)
	);

	const pax = $derived($query.data ? $query.data.adults + $query.data.children : 0);
	const perPerson = $derived(pax > 0 ? Number($booking.data?.actual_sell_pkr ?? 0) / pax : 0);

	function pkr(i: BookingItem): number {
		return toNumber(toPkr(Number(i.actual_sell), i.currency, rates));
	}
	function isBooked(i: BookingItem): boolean {
		return (i.meta as Record<string, unknown>)?.booked === true;
	}

	function reopen() {
		$update.mutate({ id: queryId, patch: { booking_status: null, completed_date: null } });
	}
</script>

<div class="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
	<!-- Confirmation banner -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-4">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
				<CheckCircle2 class="h-6 w-6 text-green-600" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h2 class="text-base font-bold text-green-800">Booking confirmed</h2>
					<Badge tone="success">Completed</Badge>
				</div>
				<p class="text-xs text-green-700/70">
					All services finalised{$query.data?.completed_date ? ` · ${new Date($query.data.completed_date).toLocaleDateString()}` : ''}.
				</p>
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Button size="sm" variant="secondary" href="/queries/{queryId}/itinerary"><Map class="h-4 w-4" /> Itinerary</Button>
			<Button size="sm" variant="secondary" href="/queries/{queryId}/invoice"><Receipt class="h-4 w-4" /> Invoice</Button>
			<Button size="sm" variant="secondary" href="/queries/{queryId}/voucher"><FileText class="h-4 w-4" /> Voucher</Button>
			<Button size="sm" variant="ghost" disabled={$update.isPending} onclick={reopen}><RotateCcw class="h-4 w-4" /> Reopen</Button>
		</div>
	</div>

	<!-- Headline figures -->
	<div class="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
		<div class="bg-white px-5 py-3">
			<div class="text-xs uppercase tracking-wide text-slate-400">Total (sell)</div>
			<div class="text-lg font-bold text-slate-800">{formatAmount(Number($booking.data?.actual_sell_pkr ?? 0), 'PKR')}</div>
		</div>
		<div class="bg-white px-5 py-3">
			<div class="text-xs uppercase tracking-wide text-slate-400">Cost</div>
			<div class="text-lg font-semibold text-slate-600">{formatAmount(Number($booking.data?.actual_cost_pkr ?? 0), 'PKR')}</div>
		</div>
		<div class="bg-white px-5 py-3">
			<div class="text-xs uppercase tracking-wide text-slate-400">Profit</div>
			<div class="text-lg font-bold text-green-600">{formatAmount(Number($booking.data?.profit_pkr ?? 0), 'PKR')}</div>
		</div>
		<div class="bg-white px-5 py-3">
			<div class="text-xs uppercase tracking-wide text-slate-400">Per person</div>
			<div class="text-lg font-semibold text-brand-700">{formatAmount(perPerson, 'PKR')}</div>
		</div>
	</div>

	<!-- Service groups -->
	<div class="space-y-4 p-5">
		{#if itemsLoading}
			<p class="text-sm text-slate-400">Loading booking…</p>
		{:else if groups.length === 0}
			<p class="text-sm text-slate-400">No services recorded on this booking.</p>
		{:else}
			{#each groups as g (g.label)}
				<div class="overflow-hidden rounded-xl border border-l-4 border-slate-200 {g.accent}">
					<div class="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
						{g.label}
					</div>
					<div class="divide-y divide-slate-50">
						{#each g.rows as r (r.id)}
							<div class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
								<div class="flex min-w-0 items-center gap-2">
									{#if isBooked(r)}
										<CheckCircle2 class="h-4 w-4 shrink-0 text-green-500" />
									{:else}
										<Circle class="h-4 w-4 shrink-0 text-slate-300" />
									{/if}
									<span class="truncate text-slate-700">{r.label}</span>
									{#if isBooked(r)}<Badge tone="success">Booked</Badge>{:else}<Badge tone="neutral">Pending</Badge>{/if}
								</div>
								<div class="shrink-0 text-right">
									<div class="font-medium text-slate-700">{formatAmount(Number(r.actual_sell), r.currency)}</div>
									{#if r.currency !== 'PKR'}<div class="text-xs text-slate-400">{formatAmount(pkr(r), 'PKR')}</div>{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		{/if}

		<div class="flex items-center gap-2 pt-1 text-xs text-slate-400">
			<FolderOpen class="h-4 w-4" />
			Proofs & vouchers are filed under Documents on this query.
		</div>
	</div>
</div>
