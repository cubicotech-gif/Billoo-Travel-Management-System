<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { AlertTriangle, CheckCircle2, FileText, RefreshCw, RotateCcw } from 'lucide-svelte';
	import { Button, Card } from '$ui';
	import BookingLifecyclePanel from '$features/bookings/BookingLifecyclePanel.svelte';
	import {
		useBookingForQuery,
		useMarkBookingComplete,
		useReopenBooking
	} from '$features/bookings/queries';
	import { usePassengers } from '$features/passengers/queries';
	import { fullName } from '$features/passengers/types';
	import { useQueryDetail } from '$features/queries/queries';
	import { afterHajjEdit } from './booking';
	import HajjSummary from './HajjSummary.svelte';
	import { useHajjTravellers } from './queries';
	import { travellerIssues } from './readiness';

	// The Hajj Booking stage: confirms who is travelling and what is still missing,
	// then hands money to the standard payment & check-in panel (the finance rows
	// are kept in step with the quote by ./booking.ts).
	let { queryId }: { queryId: string } = $props();

	const client = useQueryClient();
	const query = untrack(() => useQueryDetail(queryId));
	const booking = untrack(() => useBookingForQuery(queryId));
	const travellers = untrack(() => useHajjTravellers(queryId));
	const passengers = untrack(() => usePassengers());
	const markComplete = untrack(() => useMarkBookingComplete(queryId));
	const reopen = untrack(() => useReopenBooking(queryId));

	const finalized = $derived(!!$query.data?.completed_date);

	const rows = $derived.by(() => {
		const byId = new Map(($passengers.data ?? []).map((p) => [p.id, p]));
		return ($travellers.data ?? []).map((t) => {
			const p = byId.get(t.passenger_id);
			return {
				id: t.id,
				name: p ? fullName(p) : 'Traveller',
				issues: travellerIssues(t, p ?? null)
			};
		});
	});
	const ready = $derived(rows.filter((r) => r.issues.length === 0).length);

	// Make sure the finance rows exist and are current (a quote that entered
	// Booking before this existed, or whose figures drifted).
	let refreshing = $state(false);
	async function refresh() {
		refreshing = true;
		try {
			await afterHajjEdit(queryId);
		} finally {
			refreshing = false;
			client.invalidateQueries({ queryKey: ['booking', queryId] });
			client.invalidateQueries({ queryKey: ['queries', queryId] });
			client.invalidateQueries({ queryKey: ['payments', queryId] });
		}
	}
	let autoRan = false;
	$effect(() => {
		if (!autoRan && $booking.isSuccess && $booking.data === null) {
			autoRan = true;
			void refresh();
		}
	});
</script>

<div class="space-y-4">
	<Card>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h3 class="text-base font-semibold text-slate-800">Hajj booking</h3>
				<p class="text-xs text-slate-500">
					{rows.length} traveller{rows.length === 1 ? '' : 's'} · {ready} ready ·
					{rows.length - ready} to complete
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Button variant="secondary" size="sm" href="/queries/{queryId}/hajj-proposal">
					<FileText class="h-4 w-4" /> Proposal
				</Button>
				<Button variant="secondary" size="sm" disabled={refreshing} onclick={refresh}>
					<RefreshCw class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" /> Refresh figures
				</Button>
				{#if finalized}
					<Button size="sm" variant="secondary" disabled={$reopen.isPending} onclick={() => $reopen.mutate()}>
						<RotateCcw class="h-4 w-4" /> Reopen
					</Button>
				{:else}
					<Button size="sm" disabled={$markComplete.isPending || !$booking.data} onclick={() => $markComplete.mutate()}>
						<CheckCircle2 class="h-4 w-4" /> Mark booking complete
					</Button>
				{/if}
			</div>
		</div>

		{#if rows.some((r) => r.issues.length)}
			<ul class="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
				{#each rows.filter((r) => r.issues.length) as r (r.id)}
					<li class="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2">
						<span class="min-w-[8rem] font-medium text-slate-700">{r.name}</span>
						<span class="flex flex-1 flex-wrap gap-1.5">
							{#each r.issues as i (i.key)}
								<span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
									<AlertTriangle class="h-3 w-3" /> {i.text}
								</span>
							{/each}
						</span>
					</li>
				{/each}
			</ul>
			<p class="mt-2 text-[11px] text-slate-400">
				Hajj details are edited per traveller in the Working stage (back one step); identity and passport on the passenger’s profile.
			</p>
		{:else if rows.length}
			<p class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-green-600">
				<CheckCircle2 class="h-3.5 w-3.5" /> Every traveller’s details are complete.
			</p>
		{/if}
	</Card>

	<BookingLifecyclePanel {queryId} />
	<HajjSummary {queryId} />
</div>
