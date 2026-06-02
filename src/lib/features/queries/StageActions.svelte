<script lang="ts">
	import { untrack } from 'svelte';
	import { Send, Wallet, MessageSquare, CheckCircle2 } from 'lucide-svelte';
	import { Button, Card, Input } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useUpdateQuery } from './queries';
	import type { Query } from './types';

	let { query }: { query: Query } = $props();

	const update = useUpdateQuery();

	function fmtDate(iso: string | null): string {
		return iso ? new Date(iso).toLocaleDateString() : '—';
	}

	// --- Proposal: send / re-send -----------------------------------------
	function sendProposal() {
		$update.mutate({
			id: query.id,
			patch: {
				proposal_sent_date: new Date().toISOString(),
				current_proposal_version: (query.current_proposal_version ?? 0) + 1
			}
		});
	}

	// --- Booking: record advance payment ----------------------------------
	// Seed the form once from the query (untrack: don't clobber input on refetch).
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

	// --- Completed: feedback ----------------------------------------------
	let feedback = $state(untrack(() => query.customer_feedback ?? ''));

	function saveFeedback(e: SubmitEvent) {
		e.preventDefault();
		$update.mutate({
			id: query.id,
			patch: {
				customer_feedback: feedback || null,
				completed_date: query.completed_date ?? new Date().toISOString()
			}
		});
	}
</script>

{#if query.status === 'Inquiry'}
	<Card title="Inquiry">
		<p class="text-sm text-slate-500">
			Respond to the client and capture their requirements. When you're ready to build the package,
			advance to <span class="font-medium text-slate-700">Proposal</span> and start adding services.
		</p>
	</Card>
{:else if query.status === 'Proposal'}
	<Card title="Proposal">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="text-sm text-slate-500">
				{#if query.proposal_sent_date}
					Last sent <span class="font-medium text-slate-700">{fmtDate(query.proposal_sent_date)}</span>
					· version {query.current_proposal_version ?? 1}
				{:else}
					No proposal sent yet. Add the services below, then send the quote.
				{/if}
			</div>
			<Button onclick={sendProposal} disabled={$update.isPending}>
				<Send class="h-4 w-4" />
				{query.proposal_sent_date ? 'Re-send (new version)' : 'Send proposal'}
			</Button>
		</div>
	</Card>
{:else if query.status === 'Booking'}
	<Card title="Booking — advance payment">
		<form onsubmit={recordAdvance} class="flex flex-wrap items-end gap-3">
			<div class="w-40">
				<Input label="Advance (PKR)" type="number" min="0" step="0.01" bind:value={advance.amount} />
			</div>
			<div class="w-44">
				<Input label="Date" type="date" bind:value={advance.date} />
			</div>
			<Button type="submit" disabled={$update.isPending}>
				<Wallet class="h-4 w-4" /> Record advance
			</Button>
			{#if query.advance_payment_amount}
				<span class="pb-2 text-sm text-slate-500">
					Recorded: <span class="font-semibold text-green-600"
						>{formatAmount(Number(query.advance_payment_amount))}</span
					>
					on {fmtDate(query.advance_payment_date)}
				</span>
			{/if}
		</form>
	</Card>
{:else if query.status === 'Delivery'}
	<Card title="Delivery">
		<p class="text-sm text-slate-500">
			Booking confirmed. Issue tickets, vouchers and documents to the client, then advance to
			<span class="font-medium text-slate-700">Completed</span> once the trip is delivered.
		</p>
	</Card>
{:else if query.status === 'Completed'}
	<Card title="Completed — customer feedback">
		<form onsubmit={saveFeedback} class="space-y-3">
			<div class="flex items-center gap-2 text-sm text-green-700">
				<CheckCircle2 class="h-4 w-4" /> Completed on {fmtDate(query.completed_date)}
			</div>
			<textarea
				bind:value={feedback}
				rows="3"
				placeholder="How did the trip go? Any notes for next time…"
				class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
			></textarea>
			<Button type="submit" disabled={$update.isPending}>
				<MessageSquare class="h-4 w-4" /> Save feedback
			</Button>
		</form>
	</Card>
{/if}
