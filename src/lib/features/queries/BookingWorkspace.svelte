<script lang="ts">
	import { Building2, Wallet } from 'lucide-svelte';
	import BookingPanel from '$features/bookings/BookingPanel.svelte';
	import PaymentSchedule from '$features/payments/PaymentSchedule.svelte';
	import type { Query } from './types';

	let { query, queryId }: { query: Query; queryId: string } = $props();

	const selling = $derived(Number(query.selling_price) || 0);
</script>

{#snippet sectionHead(Icon: typeof Wallet, label: string)}
	<div class="mb-2 flex items-center gap-2">
		<Icon class="h-4 w-4 text-slate-400" />
		<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</h3>
	</div>
{/snippet}

<!-- Booking in progress: just the two things that matter here — book the vendor
     services, then record the client's payments. -->
<section class="mb-8">
	{@render sectionHead(Building2, 'Service booking')}
	<BookingPanel {queryId} />
</section>

<section class="mb-8">
	{@render sectionHead(Wallet, 'Payments')}
	<PaymentSchedule {queryId} sellingPkr={selling} />
</section>
