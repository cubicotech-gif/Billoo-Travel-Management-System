<script lang="ts">
	import { untrack } from 'svelte';
	import { Wallet, Calculator, Clock, FileCheck } from 'lucide-svelte';
	import { Badge, Button, Card, Input, Select } from '$ui';
	import type { BookingStatus } from '$lib/database.types';
	import { formatAmount } from '$lib/money';
	import { BOOKING_STATUSES, BOOKING_STATUS_TONE } from './workflow';
	import { useUpdateQuery } from './queries';
	import IntakeSummary from './IntakeSummary.svelte';
	import type { Query } from './types';

	let { query }: { query: Query } = $props();

	const update = useUpdateQuery();

	function fmtDate(iso: string | null): string {
		return iso ? new Date(iso).toLocaleDateString() : '—';
	}

	// --- Booking: advance payment -----------------------------------------
	let advance = $state(
		untrack(() => ({
			amount: Number(query.advance_payment_amount ?? 0),
			date: query.advance_payment_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
		}))
	);

	function recordAdvance(e: SubmitEvent) {
		e.preventDefault();
		$update.mutate({
			id: query.id,
			patch: {
				advance_payment_amount: Number(advance.amount),
				advance_payment_date: advance.date,
				finalized_date: query.finalized_date ?? new Date().toISOString()
			}
		});
	}

	// --- Booking: payment / check-in status -------------------------------
	const bookingStatusOptions: string[] = BOOKING_STATUSES.map((b) => b.status);
	let bookingStatus = $state<string>(untrack(() => query.booking_status ?? 'Pending Payment'));

	function saveBookingStatus() {
		const next = bookingStatus as BookingStatus;
		const completedDate =
			next === 'Completed' ? (query.completed_date ?? new Date().toISOString()) : query.completed_date;
		$update.mutate({
			id: query.id,
			patch: { booking_status: next, completed_date: completedDate }
		});
	}
</script>

{#if query.status === 'New Query'}
	<Card title="New Query — intake">
		<div class="mb-4 flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
			<Clock class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
			<p>Logged, not yet priced. Review the intake below, then advance to <span class="font-medium text-slate-700">Working</span> to build the quotation.</p>
		</div>
		<IntakeSummary {query} />
	</Card>
{:else if query.status === 'Working'}
	<Card title="Working — build the quotation">
		<div class="mb-4 flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
			<Calculator class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
			<p>Build the package in the quotation builder below — it auto-fills from this intake. Saving a quote moves the query to <span class="font-medium text-slate-700">Quoted</span>.</p>
		</div>
		<IntakeSummary {query} />
	</Card>
{:else if query.status === 'Quoted'}
	<Card title="Quoted — awaiting client">
		<div class="flex items-start gap-3 text-sm text-slate-500">
			<FileCheck class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
			<p>
				Quotation(s) shared — awaiting the client's decision. <span class="font-medium text-slate-700">Open proposal</span> to re-send, move
				<span class="font-medium text-slate-700">Back</span> to Working for changes, or <span class="font-medium text-slate-700">Accept</span> a tier to convert to a booking.
			</p>
		</div>
	</Card>
{:else if query.status === 'Booking'}
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<Card title="Payment & check-in status">
			<div class="space-y-3">
				{#if query.booking_status}
					<Badge tone={BOOKING_STATUS_TONE[query.booking_status]}>{query.booking_status}</Badge>
				{/if}
				<div class="flex items-end gap-2">
					<div class="flex-1">
						<Select bind:value={bookingStatus} options={bookingStatusOptions} />
					</div>
					<Button onclick={saveBookingStatus} disabled={$update.isPending}>Update</Button>
				</div>
			</div>
		</Card>
		<Card title="Advance payment">
			<form onsubmit={recordAdvance} class="flex flex-wrap items-end gap-3">
				<div class="w-32">
					<Input label="Advance (PKR)" type="number" min="0" step="0.01" bind:value={advance.amount} />
				</div>
				<div class="w-40">
					<Input label="Date" type="date" bind:value={advance.date} />
				</div>
				<Button type="submit" disabled={$update.isPending}>
					<Wallet class="h-4 w-4" /> Record
				</Button>
			</form>
			{#if query.advance_payment_amount}
				<p class="mt-2 text-sm text-slate-500">
					Recorded
					<span class="font-semibold text-green-600"
						>{formatAmount(Number(query.advance_payment_amount))}</span
					>
					on {fmtDate(query.advance_payment_date)}
				</p>
			{/if}
		</Card>
	</div>
{/if}
