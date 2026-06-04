<script lang="ts">
	import { untrack } from 'svelte';
	import { scale } from 'svelte/transition';
	import { CheckCircle2, Circle, MessageCircle, PartyPopper, FileText } from 'lucide-svelte';
	import { Button, Card } from '$ui';
	import { formatAmount } from '$lib/money';
	import { waLink } from '$lib/whatsapp';
	import { useBookingForQuery } from '$features/bookings/queries';
	import { useDocuments } from '$features/documents/queries';
	import { useUpdateQuery } from './queries';
	import { isSettled } from './workflow';
	import type { Query } from './types';

	let { query, queryId }: { query: Query; queryId: string } = $props();

	const booking = untrack(() => useBookingForQuery(queryId));
	const docs = untrack(() => useDocuments('query', queryId));
	const update = useUpdateQuery();

	const reference = $derived(
		`BLO-${new Date(query.created_at).getFullYear()}-${query.query_number.slice(-4)}`
	);
	const selling = $derived(Number(query.selling_price));
	const advance = $derived(Number(query.advance_payment_amount ?? 0));
	const balance = $derived(Math.max(0, selling - advance));

	const checks = $derived([
		{ label: 'Priced (quotation accepted)', done: selling > 0 },
		{ label: 'Services locked (booking created)', done: !!$booking.data },
		{ label: 'Deposit received', done: advance > 0 },
		{ label: 'Documents uploaded', done: ($docs.data ?? []).length > 0 }
	]);
	const allDone = $derived(checks.every((c) => c.done));
	const confirmed = $derived(isSettled(query.status, query.booking_status));

	function waMessage(): string {
		return [
			`✅ Booking Confirmed — ${reference}`,
			`${query.package_type ?? query.destination} · ${query.adults}A${query.children ? ` ${query.children}C` : ''}${query.infants ? ` ${query.infants}I` : ''}`,
			'',
			`Total: PKR ${Math.round(selling).toLocaleString('en-US')}`,
			advance > 0 ? `Advance received: PKR ${Math.round(advance).toLocaleString('en-US')}` : '',
			balance > 0 ? `Balance: PKR ${Math.round(balance).toLocaleString('en-US')}` : 'Fully paid ✅',
			'',
			'Your voucher is attached. Thank you for booking with Billoo Travel.'
		]
			.filter(Boolean)
			.join('\n');
	}

	function sendVoucher() {
		const url = waLink(query.client_phone, waMessage());
		if (url) window.open(url, '_blank');
		$update.mutate({ id: queryId, patch: { voucher_sent_at: new Date().toISOString() } });
	}

	function markConfirmed() {
		$update.mutate({
			id: queryId,
			patch: { booking_status: 'Completed', completed_date: query.completed_date ?? new Date().toISOString() }
		});
	}
</script>

<Card title="Confirmation">
	{#if confirmed}
		<div in:scale={{ duration: 250, start: 0.96 }} class="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">
			<PartyPopper class="h-5 w-5" /> Booking confirmed & completed — {reference}
		</div>
	{/if}

	<!-- Completion checklist -->
	<ul class="mb-4 space-y-1.5 text-sm">
		{#each checks as c (c.label)}
			<li class="flex items-center gap-2 {c.done ? 'text-slate-700' : 'text-slate-400'}">
				{#if c.done}<CheckCircle2 class="h-4 w-4 text-green-600" />{:else}<Circle class="h-4 w-4" />{/if}
				{c.label}
			</li>
		{/each}
	</ul>

	<!-- Payment summary -->
	{#if selling > 0}
		<div class="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
			<div><div class="text-xs text-slate-400">Total</div><div class="font-semibold">{formatAmount(selling, 'PKR')}</div></div>
			<div><div class="text-xs text-slate-400">Advance</div><div class="font-semibold text-green-600">{formatAmount(advance, 'PKR')}</div></div>
			<div><div class="text-xs text-slate-400">Balance</div><div class="font-semibold {balance > 0 ? 'text-amber-600' : 'text-green-600'}">{formatAmount(balance, 'PKR')}</div></div>
		</div>
	{/if}

	{#if !allDone}
		<p class="mb-3 text-xs text-amber-600">Complete the checklist above before confirming.</p>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<Button variant="secondary" size="sm" href="/queries/{queryId}/voucher">
			<FileText class="h-4 w-4" /> Voucher PDF
		</Button>
		<Button size="sm" onclick={sendVoucher} disabled={$update.isPending}>
			<MessageCircle class="h-4 w-4" /> Send on WhatsApp
		</Button>
		{#if !confirmed}
			<Button variant="secondary" size="sm" onclick={markConfirmed} disabled={$update.isPending || !allDone}>
				<CheckCircle2 class="h-4 w-4" /> Mark confirmed
			</Button>
		{/if}
		{#if query.voucher_sent_at}
			<span class="inline-flex items-center gap-1 text-xs text-green-600">
				<CheckCircle2 class="h-3.5 w-3.5" /> Voucher sent {new Date(query.voucher_sent_at).toLocaleDateString()}
			</span>
		{/if}
	</div>
</Card>
