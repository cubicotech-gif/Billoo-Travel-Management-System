<script lang="ts">
	import { Badge, Select, Button, Modal, Input } from '$ui';
	import { Wallet, PlaneTakeoff, CheckCircle2, ExternalLink, Check, MessageCircle } from 'lucide-svelte';
	import { useQueries, useUpdateQuery } from '$features/queries/queries';
	import { useAllDocuments } from '$features/documents/queries';
	import { indexDocuments, readinessFor } from '$features/documents/checklist';
	import { BOOKING_STATUSES } from '$features/queries/workflow';
	import { OPS_LANES, groupIntoLanes, totalOutstanding, type OpsCard } from '$features/operations/lanes';
	import { formatAmount, money, add, toNumber } from '$lib/money';
	import { waLink } from '$lib/whatsapp';
	import type { BookingStatus } from '$lib/database.types';

	const queries = useQueries();
	const update = useUpdateQuery();
	const documents = useAllDocuments();

	// Record-payment modal state.
	let payCard = $state<OpsCard | null>(null);
	let payAmount = $state('');

	const lanes = $derived(groupIntoLanes($queries.data ?? []));
	const outstanding = $derived(totalOutstanding(lanes));
	const docIndex = $derived(indexDocuments($documents.data ?? []));

	const laneIcon = { payments: Wallet, checkins: PlaneTakeoff, completed: CheckCircle2 } as const;
	const headerTone: Record<string, string> = {
		warning: 'text-amber-700',
		info: 'text-brand-700',
		success: 'text-green-700'
	};

	const statusOptions = BOOKING_STATUSES.map((b) => b.status);

	function reference(card: OpsCard): string {
		const q = card.query;
		return `BLO-${new Date(q.created_at).getFullYear()}-${q.query_number.slice(-4)}`;
	}
	function pax(card: OpsCard): string {
		const q = card.query;
		return `${q.adults}A${q.children ? `·${q.children}C` : ''}${q.infants ? `·${q.infants}I` : ''}`;
	}

	// Re-lane a booking by changing its status; settling marks completed_date.
	// Reopening a Completed booking is deliberate — guard against a stray pick.
	function setStatus(card: OpsCard, next: BookingStatus) {
		if (next === card.query.booking_status) return;
		if (
			card.query.booking_status === 'Completed' &&
			next !== 'Completed' &&
			!confirm(`Reopen the completed booking for ${card.query.client_name}?`)
		) {
			return;
		}
		$update.mutate({
			id: card.query.id,
			patch: {
				booking_status: next,
				completed_date:
					next === 'Completed'
						? (card.query.completed_date ?? new Date().toISOString())
						: card.query.completed_date
			}
		});
	}

	// Check-in done (payment already settled) → close the booking out.
	function markCheckinDone(card: OpsCard) {
		$update.mutate({
			id: card.query.id,
			patch: {
				booking_status: 'Completed',
				completed_date: card.query.completed_date ?? new Date().toISOString()
			}
		});
	}

	// WhatsApp reminder: balance chase, or a check-in/documents nudge.
	function remind(card: OpsCard) {
		const msg =
			card.balance > 0
				? `Assalam o Alaikum ${card.query.client_name}, a gentle reminder: a balance of ${formatAmount(card.balance)} is pending for your booking ${reference(card)}. JazakAllah Khair — Billoo Travel.`
				: `Assalam o Alaikum ${card.query.client_name}, your booking ${reference(card)} is confirmed. Please complete your check-in and share any pending documents. JazakAllah Khair — Billoo Travel.`;
		const url = waLink(card.query.client_phone, msg);
		if (url) window.open(url, '_blank');
	}

	// Record a payment against the advance (money-safe add), then re-lane: fully
	// paid moves to check-ins, a part payment marks Partial.
	function confirmPayment() {
		const card = payCard;
		const amt = Number(payAmount);
		if (!card || !(amt > 0)) return;
		const newAdvance = toNumber(add(money(card.advance), money(amt)));
		const fullyPaid = newAdvance >= card.selling - 0.005;
		$update.mutate({
			id: card.query.id,
			patch: {
				advance_payment_amount: newAdvance,
				booking_status: fullyPaid ? 'Payment Done - Check-in Pending' : 'Partial Payment'
			}
		});
		payCard = null;
		payAmount = '';
	}
</script>

<div class="mb-6 flex items-end justify-between">
	<div>
		<h1 class="text-2xl font-bold text-slate-800">Operations</h1>
		<p class="text-sm text-slate-500">
			Booked deals, off the sales board — follow up on payments and check-ins here.
		</p>
	</div>
	{#if outstanding > 0}
		<div class="rounded-lg bg-amber-50 px-4 py-2 text-right">
			<div class="text-xs font-medium uppercase tracking-wide text-amber-600">Outstanding</div>
			<div class="text-lg font-bold text-amber-700">{formatAmount(outstanding)}</div>
		</div>
	{/if}
</div>

{#if $queries.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $queries.isError}
	<p class="text-red-600">Failed to load: {$queries.error.message}</p>
{:else}
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		{#each OPS_LANES as lane (lane.id)}
			{@const cards = lanes[lane.id]}
			{@const Icon = laneIcon[lane.id]}
			<div class="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60">
				<div class="border-b border-slate-200/70 px-4 py-3">
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-2 text-sm font-semibold {headerTone[lane.tone]}">
							<Icon class="h-4 w-4" /> {lane.label}
						</span>
						<span class="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm">
							{cards.length}
						</span>
					</div>
					<p class="mt-0.5 text-xs text-slate-400">{lane.hint}</p>
				</div>

				<div class="flex flex-1 flex-col gap-2 p-3">
					{#each cards as card (card.query.id)}
						{@const docs = readinessFor(docIndex, card.query.id, card.query.passenger_id)}
						<div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0">
									<div class="truncate text-sm font-semibold text-slate-800">{card.query.client_name}</div>
									<div class="font-mono text-[10px] text-slate-400">{reference(card)}</div>
								</div>
								<a
									href="/queries/{card.query.id}"
									class="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
									aria-label="Open booking"
								>
									<ExternalLink class="h-4 w-4" />
								</a>
							</div>

							<div class="mt-1 text-xs text-slate-500">
								{card.query.package_type ?? card.query.destination} · {pax(card)}{card.query
									.duration_days
									? ` · ${card.query.duration_days}N`
									: ''}
							</div>

							<div class="mt-2 flex items-center justify-between text-xs">
								<span class="text-slate-500">Total {formatAmount(card.selling)}</span>
								{#if card.balance > 0}
									<Badge tone="warning">Balance {formatAmount(card.balance)}</Badge>
								{:else}
									<Badge tone="success">Paid</Badge>
								{/if}
							</div>

							<div class="mt-1.5 flex items-center gap-1.5 text-xs">
								{#if docs.complete}
									<Badge tone="success">Docs ✓</Badge>
								{:else}
									<Badge tone="neutral">Docs {docs.done}/{docs.total}</Badge>
									<span class="truncate text-slate-400">{docs.missing.join(', ')}</span>
								{/if}
							</div>

							{#if lane.id !== 'completed'}
								<div class="mt-2 flex flex-wrap gap-1.5">
									{#if lane.id === 'payments'}
										<Button size="sm" onclick={() => (payCard = card)} disabled={$update.isPending}>
											<Wallet class="h-3.5 w-3.5" /> Record payment
										</Button>
									{/if}
									{#if lane.id === 'checkins'}
										<Button size="sm" onclick={() => markCheckinDone(card)} disabled={$update.isPending}>
											<Check class="h-3.5 w-3.5" /> Check-in done
										</Button>
									{/if}
									<Button size="sm" variant="secondary" onclick={() => remind(card)}>
										<MessageCircle class="h-3.5 w-3.5" /> Remind
									</Button>
								</div>
							{/if}

							<div class="mt-2">
								<Select
									value={card.query.booking_status ?? ''}
									options={statusOptions}
									onchange={(v) => setStatus(card, v as BookingStatus)}
								/>
							</div>
						</div>
					{/each}

					{#if cards.length === 0}
						<div class="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-300">
							Nothing here
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if lanes.payments.length + lanes.checkins.length + lanes.completed.length === 0}
		<div class="mt-6 rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
			<p class="text-sm text-slate-400">No booked deals yet.</p>
			<p class="mt-1 text-xs text-slate-400">
				Confirm a booking from a query's <Badge tone="success">Booking</Badge> stage and it'll show up here.
			</p>
		</div>
	{/if}
{/if}

<Modal
	open={!!payCard}
	onClose={() => {
		payCard = null;
		payAmount = '';
	}}
	title="Record payment"
>
	{#if payCard}
		<div class="space-y-4">
			<div class="rounded-lg bg-slate-50 p-3 text-sm">
				<div class="font-semibold text-slate-800">{payCard.query.client_name}</div>
				<div class="mt-0.5 text-slate-500">
					Total {formatAmount(payCard.selling)} · Paid {formatAmount(payCard.advance)} ·
					<span class="font-medium text-amber-600">Balance {formatAmount(payCard.balance)}</span>
				</div>
			</div>
			<Input
				label="Amount received (PKR)"
				type="number"
				min="0"
				bind:value={payAmount}
				placeholder="e.g. 50000"
			/>
			<div class="flex justify-end gap-2">
				<Button
					variant="secondary"
					onclick={() => {
						payCard = null;
						payAmount = '';
					}}>Cancel</Button
				>
				<Button onclick={confirmPayment} disabled={!(Number(payAmount) > 0) || $update.isPending}>
					Record
				</Button>
			</div>
		</div>
	{/if}
</Modal>
