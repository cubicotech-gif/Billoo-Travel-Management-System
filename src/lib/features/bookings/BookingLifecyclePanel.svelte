<script lang="ts">
	import { untrack } from 'svelte';
	import { Lock, LockOpen, Sparkles, Percent, CalendarCheck2 } from 'lucide-svelte';
	import { Badge, Button, Card, Input, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useQueryDetail } from '$features/queries/queries';
	import PaymentSchedule from '$features/payments/PaymentSchedule.svelte';
	import {
		BOOKING_STATUS_LABEL,
		BOOKING_STATUS_TONE,
		POST_COMPLETE_STATUSES
	} from '$features/queries/workflow';
	import type { BookingStatus } from '$lib/database.types';
	import {
		useBookingForQuery,
		useUpdateBookingDiscount,
		useSetBookingStatusManual,
		useClearBookingStatusOverride,
		useReconcileBookingLifecycle
	} from './queries';
	import { listBookingItems } from './api';
	import type { BookingItem } from './types';
	import { usePayments } from '$features/payments/queries';
	import { lifecycleSummary } from './lifecycle';

	let { queryId, embedded = false }: { queryId: string; embedded?: boolean } = $props();

	const query = untrack(() => useQueryDetail(queryId));
	const booking = untrack(() => useBookingForQuery(queryId));
	const bookingId = $derived($booking.data?.id);
	const payments = untrack(() => usePayments(queryId));

	// Booking items (for the trip's final date). Loaded reactively as the booking
	// resolves — same pattern as BookingSummary.
	let items = $state<BookingItem[]>([]);
	$effect(() => {
		const id = $booking.data?.id;
		if (!id) return;
		listBookingItems(id).then((r) => (items = r));
	});

	const saveDiscount = untrack(() => useUpdateBookingDiscount(queryId));
	const setManual = untrack(() => useSetBookingStatusManual(queryId));
	const clearOverride = untrack(() => useClearBookingStatusOverride(queryId));
	const reconcile = untrack(() => useReconcileBookingLifecycle(queryId));

	// Marked-complete bookings are in the money/date-driven lifecycle. Until then
	// the panel is just an early-payment + discount tool sitting under the builder.
	const finalized = $derived(!!$query.data?.completed_date);
	const locked = $derived(!!$query.data?.booking_status_locked);
	const current = $derived(($query.data?.booking_status ?? null) as BookingStatus | null);

	const summary = $derived.by(() => {
		const b = $booking.data;
		const q = $query.data;
		if (!b || !q) return null;
		return lifecycleSummary(b, items, $payments.data ?? [], q);
	});

	// On opening a finalized, auto (unpinned) booking, re-run the router once so a
	// trip whose date has since passed lands in the right column.
	let reconciledOnce = false;
	$effect(() => {
		if (finalized && !locked && $booking.data && !reconciledOnce) {
			reconciledOnce = true;
			$reconcile.mutate();
		}
	});

	// Discount editor (PKR off the package total).
	let discount = $state(0);
	let discountNote = $state('');
	let discountInit = false;
	$effect(() => {
		const b = $booking.data;
		if (b && !discountInit) {
			discountInit = true;
			discount = Number(b.discount_pkr) || 0;
			discountNote = b.discount_note ?? '';
		}
	});
	const discountDirty = $derived(
		!!$booking.data &&
			(Number(discount) !== (Number($booking.data.discount_pkr) || 0) ||
				(discountNote || '') !== ($booking.data.discount_note ?? ''))
	);
	function applyDiscount() {
		if (!bookingId) return;
		$saveDiscount.mutate({ bookingId, discountPkr: Number(discount) || 0, note: discountNote.trim() || null });
	}

	const overrideOptions = $derived(
		POST_COMPLETE_STATUSES.map((s) => ({ value: s, label: BOOKING_STATUS_LABEL[s] }))
	);
	let overridePick = $state<BookingStatus>('Payment Done - Check-in Left');
	function pinManual() {
		$setManual.mutate(overridePick);
	}
</script>

{#snippet body()}
	{#if !$booking.data}
		<p class="text-sm text-slate-400">No booking yet — start the booking to track payments and check-in.</p>
	{:else}
		<!-- Lifecycle status: where this booking sits, and why. -->
		{#if finalized && current}
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
				<div class="flex items-center gap-2">
					<CalendarCheck2 class="h-4 w-4 text-slate-400" />
					<Badge tone={BOOKING_STATUS_TONE[current]}>{BOOKING_STATUS_LABEL[current]}</Badge>
					{#if locked}
						<span class="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><Lock class="h-3.5 w-3.5" /> Manual</span>
					{:else}
						<span class="inline-flex items-center gap-1 text-xs font-medium text-slate-400"><Sparkles class="h-3.5 w-3.5" /> Auto</span>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					{#if locked}
						<Button size="sm" variant="secondary" disabled={$clearOverride.isPending} onclick={() => $clearOverride.mutate()}>
							<LockOpen class="h-4 w-4" /> Back to auto
						</Button>
					{:else}
						<div class="w-44"><Select bind:value={overridePick} options={overrideOptions} /></div>
						<Button size="sm" variant="secondary" disabled={$setManual.isPending} onclick={pinManual}>
							<Lock class="h-4 w-4" /> Pin
						</Button>
					{/if}
				</div>
			</div>
			{#if summary && !locked && summary.computed !== current}
				<p class="mb-3 text-xs text-amber-600">Auto-status will move this to “{BOOKING_STATUS_LABEL[summary.computed]}” on refresh.</p>
			{/if}
		{:else}
			<p class="mb-3 text-xs text-slate-400">
				Record any advance payments here. When you mark the booking complete, it auto-files into the
				right check-in stage based on what’s been paid.
			</p>
		{/if}

		<!-- Money snapshot -->
		{#if summary}
			<div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
				<div><div class="text-xs text-slate-400">Package owed</div><div class="font-semibold text-slate-700">{formatAmount(summary.owed, 'PKR')}</div></div>
				<div><div class="text-xs text-slate-400">Discount</div><div class="font-semibold text-slate-700">{formatAmount(Number($booking.data.discount_pkr) || 0, 'PKR')}</div></div>
				<div><div class="text-xs text-slate-400">Paid</div><div class="font-semibold text-green-600">{formatAmount(summary.paid, 'PKR')}</div></div>
				<div><div class="text-xs text-slate-400">Balance</div><div class="font-semibold {summary.balance > 0 ? 'text-amber-600' : 'text-green-600'}">{formatAmount(summary.balance, 'PKR')}</div></div>
			</div>
		{/if}

		<!-- Discount editor -->
		<div class="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3">
			<Percent class="mb-2 h-4 w-4 text-slate-400" />
			<div class="w-36"><Input label="Discount (PKR)" type="number" min="0" step="0.01" bind:value={discount} /></div>
			<div class="min-w-[10rem] flex-1"><Input label="Reason (optional)" bind:value={discountNote} placeholder="e.g. loyalty / group" /></div>
			<Button size="sm" variant={discountDirty ? 'primary' : 'secondary'} disabled={!discountDirty || $saveDiscount.isPending} onclick={applyDiscount}>
				{$saveDiscount.isPending ? 'Saving…' : 'Save discount'}
			</Button>
		</div>

		<!-- Payment records (record / edit / delete) — the single source for paid totals. -->
		<PaymentSchedule {queryId} sellingPkr={summary?.owed ?? 0} />
	{/if}
{/snippet}

{#if embedded}
	{@render body()}
{:else}
	<Card title="Payment & check-in">
		{@render body()}
	</Card>
{/if}
