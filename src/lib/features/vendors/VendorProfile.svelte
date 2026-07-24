<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, MessageCircle, Phone, MapPin, Plus, Trash2, X } from 'lucide-svelte';
	import { Badge, Button, Card, Input } from '$ui';
	import { formatAmount } from '$lib/money';
	import type { Currency, QuotationLineType } from '$lib/database.types';
	import { useVendor, useVendorLedger, useCreateVendorPayment, useDeleteVendorPayment } from './queries';
	import { paymentPkr, type VendorServiceLine } from './ledger';

	let { id }: { id: string } = $props();

	// Vendors are paid in PKR, or sometimes SAR / USD (converted to PKR via rate).
	const CURRENCIES: Currency[] = ['PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP'];

	const vendor = untrack(() => useVendor(id));
	const ledger = untrack(() => useVendorLedger(id));
	const createPayment = untrack(() => useCreateVendorPayment(id));
	const removePayment = untrack(() => useDeleteVendorPayment(id));

	const today = new Date().toISOString().slice(0, 10);
	let form = $state({ amount: 0, currency: 'PKR' as Currency, rate: 1, date: today, method: '', reference: '' });
	// What this payment is for: a specific service, or null = general.
	let payTarget = $state<VendorServiceLine | null>(null);

	// PKR needs no rate; foreign payments convert at amount × rate.
	const rateNeeded = $derived(form.currency !== 'PKR');
	const rateValid = $derived(!rateNeeded || Number(form.rate) > 0);
	const pkrPreview = $derived(
		rateNeeded ? paymentPkr({ amount: form.amount, currency: form.currency, rate_to_pkr: form.rate }) : Number(form.amount) || 0
	);

	const services = $derived($ledger.data?.services ?? []);
	// Service-type filter chips (only types this vendor actually has).
	const presentTypes = $derived([...new Set(services.map((s) => s.lineType))]);
	let typeFilter = $state<QuotationLineType | 'all'>('all');
	const shownServices = $derived(
		typeFilter === 'all' ? services : services.filter((s) => s.lineType === typeFilter)
	);
	// Map service id -> label, to show what each payment was for.
	const labelByItem = $derived(new Map(services.map((s) => [s.itemId, s.label])));

	const TYPE_LABEL: Record<QuotationLineType, string> = {
		hotel: 'Hotel',
		transfer: 'Transfer',
		visa: 'Visa',
		ticket: 'Ticket',
		other: 'Other'
	};

	function payFor(s: VendorServiceLine) {
		payTarget = s;
		// The balance is in PKR, so settle in PKR by default.
		form.amount = Math.max(0, Math.round(s.balancePkr));
		form.currency = 'PKR';
		form.rate = 1;
		document.getElementById('vendor-pay-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
	function clearTarget() {
		payTarget = null;
	}

	async function addPayment(e: SubmitEvent) {
		e.preventDefault();
		if (!rateValid) return;
		await $createPayment.mutateAsync({
			vendor_id: id,
			amount: Number(form.amount),
			currency: form.currency,
			rate_to_pkr: form.currency === 'PKR' ? 1 : Number(form.rate),
			payment_date: form.date,
			method: form.method || null,
			reference: form.reference || null,
			booking_item_id: payTarget?.itemId ?? null,
			booking_id: payTarget?.bookingId ?? null,
			query_id: payTarget?.queryId ?? null
		});
		form = { amount: 0, currency: 'PKR', rate: 1, date: today, method: '', reference: '' };
		payTarget = null;
	}
</script>

<a href="/vendors" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
	<ArrowLeft class="h-4 w-4" /> Back to vendors
</a>

{#if $vendor.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if $vendor.isError}
	<p class="text-red-600">Failed to load: {$vendor.error.message}</p>
{:else if $vendor.data}
	{@const v = $vendor.data}
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-slate-800">{v.name}</h1>
		<div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
			{#each v.service_types?.length ? v.service_types : [v.type] as s (s)}<Badge tone="info">{s}</Badge>{/each}
			{#if v.whatsapp_group}
				<a href={v.whatsapp_group} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-green-600 hover:underline">
					<MessageCircle class="h-4 w-4" /> Open group
				</a>
			{/if}
			{#if v.phone}<span class="inline-flex items-center gap-1"><Phone class="h-4 w-4" /> {v.phone}</span>{/if}
			{#if v.location}<span class="inline-flex items-center gap-1"><MapPin class="h-4 w-4" /> {v.location}</span>{/if}
		</div>
	</div>

	<div class="mb-6">
		<Card title="Vendor details">
			<dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-3">
				<div><dt class="text-xs uppercase tracking-wide text-slate-400">Type</dt><dd class="mt-0.5 font-medium text-slate-700">{v.type}</dd></div>
				<div><dt class="text-xs uppercase tracking-wide text-slate-400">Contact person</dt><dd class="mt-0.5 font-medium text-slate-700">{v.contact_person ?? '—'}</dd></div>
				<div><dt class="text-xs uppercase tracking-wide text-slate-400">Phone</dt><dd class="mt-0.5 font-medium text-slate-700">{v.phone ?? '—'}</dd></div>
				<div><dt class="text-xs uppercase tracking-wide text-slate-400">WhatsApp</dt><dd class="mt-0.5 font-medium text-slate-700">{v.whatsapp_number ?? '—'}</dd></div>
				<div><dt class="text-xs uppercase tracking-wide text-slate-400">Email</dt><dd class="mt-0.5 truncate font-medium text-slate-700">{v.email ?? '—'}</dd></div>
				<div><dt class="text-xs uppercase tracking-wide text-slate-400">Location</dt><dd class="mt-0.5 font-medium text-slate-700">{v.location ?? '—'}{v.country ? `, ${v.country}` : ''}</dd></div>
				{#if v.address}<div class="col-span-2 lg:col-span-3"><dt class="text-xs uppercase tracking-wide text-slate-400">Address</dt><dd class="mt-0.5 font-medium text-slate-700">{v.address}</dd></div>{/if}
			</dl>
			{#if (v.tags ?? []).length || v.notes}
				<div class="mt-3 border-t border-slate-100 pt-3">
					{#if (v.tags ?? []).length}<div class="mb-2 flex flex-wrap gap-1.5">{#each v.tags ?? [] as t (t)}<Badge tone="info">{t}</Badge>{/each}</div>{/if}
					{#if v.notes}<p class="whitespace-pre-line text-sm text-slate-600">{v.notes}</p>{/if}
				</div>
			{/if}
		</Card>
	</div>

	{#if $ledger.data}
		{@const l = $ledger.data}
		<div class="mb-6 grid grid-cols-3 gap-4">
			<Card><div class="text-xs uppercase tracking-wide text-slate-400">We owe</div><div class="mt-1 text-xl font-bold text-slate-800">{formatAmount(l.owed, 'PKR')}</div></Card>
			<Card><div class="text-xs uppercase tracking-wide text-slate-400">Paid</div><div class="mt-1 text-xl font-bold text-green-600">{formatAmount(l.paid, 'PKR')}</div></Card>
			<Card><div class="text-xs uppercase tracking-wide text-slate-400">Balance</div><div class="mt-1 text-xl font-bold {l.balance > 0 ? 'text-amber-600' : 'text-green-600'}">{formatAmount(l.balance, 'PKR')}</div></Card>
		</div>

		<!-- Per-service ledger -->
		<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-lg font-semibold text-slate-800">Services (owed vs paid)</h2>
			{#if presentTypes.length > 1}
				<div class="flex flex-wrap gap-1.5">
					<button type="button" onclick={() => (typeFilter = 'all')} class="rounded-full border px-2.5 py-0.5 text-xs font-medium {typeFilter === 'all' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}">All</button>
					{#each presentTypes as t (t)}
						<button type="button" onclick={() => (typeFilter = t)} class="rounded-full border px-2.5 py-0.5 text-xs font-medium {typeFilter === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}">{TYPE_LABEL[t]}</button>
					{/each}
				</div>
			{/if}
		</div>
		{#if shownServices.length === 0}
			<div class="mb-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
				No charges yet — these appear when a booking records this vendor on a service.
			</div>
		{:else}
			<div class="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
				<table class="w-full text-sm">
					<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
						<tr>
							<th class="px-4 py-2 font-medium">Service</th>
							<th class="px-4 py-2 font-medium">Booking / passenger</th>
							<th class="px-4 py-2 text-right font-medium">Owed</th>
							<th class="px-4 py-2 text-right font-medium">Paid</th>
							<th class="px-4 py-2 text-right font-medium">Balance</th>
							<th class="px-4 py-2"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-50">
						{#each shownServices as s (s.itemId)}
							<tr class="hover:bg-slate-50">
								<td class="px-4 py-2">
									<div class="font-medium text-slate-700">{s.label}</div>
									<span class="text-[10px] uppercase text-slate-400">{TYPE_LABEL[s.lineType]}</span>
								</td>
								<td class="px-4 py-2">
									{#if s.queryId}<a href="/queries/{s.queryId}" class="text-brand-600 hover:underline">{s.clientName ?? s.queryNumber}</a>{:else}—{/if}
								</td>
								<td class="px-4 py-2 text-right text-slate-600">{formatAmount(s.owedPkr, 'PKR')}</td>
								<td class="px-4 py-2 text-right text-green-600">{formatAmount(s.paidPkr, 'PKR')}</td>
								<td class="px-4 py-2 text-right font-medium {s.balancePkr > 0 ? 'text-amber-600' : 'text-green-600'}">{formatAmount(s.balancePkr, 'PKR')}</td>
								<td class="px-4 py-2 text-right">
									{#if s.balancePkr > 0}
										<Button size="sm" variant="secondary" onclick={() => payFor(s)}>Pay</Button>
									{:else}
										<span class="text-xs text-green-600">Settled</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Record a payment -->
		<h2 class="mb-2 text-lg font-semibold text-slate-800">Payments made</h2>
		<Card>
			<form id="vendor-pay-form" onsubmit={addPayment} class="mb-3">
				<div class="mb-2 flex items-center gap-2 text-sm">
					<span class="text-slate-400">For:</span>
					{#if payTarget}
						<span class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
							{payTarget.label}{payTarget.clientName ? ` · ${payTarget.clientName}` : ''}
							<button type="button" onclick={clearTarget} aria-label="Clear" class="text-brand-400 hover:text-brand-700"><X class="h-3.5 w-3.5" /></button>
						</span>
					{:else}
						<span class="text-slate-500">General payment (not tied to a service)</span>
					{/if}
				</div>
				<div class="flex flex-wrap items-end gap-2">
					<div class="w-32"><Input label="Amount ({form.currency})" type="number" min="0" step="0.01" bind:value={form.amount} /></div>
					<div class="w-24">
						<label class="mb-1 block text-xs font-medium text-slate-600" for="pay-currency">Currency</label>
						<select id="pay-currency" bind:value={form.currency} class="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
							{#each CURRENCIES as c (c)}<option value={c}>{c}</option>{/each}
						</select>
					</div>
					{#if rateNeeded}
						<div class="w-28"><Input label="Rate → PKR" type="number" min="0" step="0.0001" bind:value={form.rate} /></div>
					{/if}
					<div class="w-40"><Input label="Date" type="date" bind:value={form.date} /></div>
					<div class="w-32"><Input label="Method" bind:value={form.method} placeholder="Cash / Bank" /></div>
					<div class="w-36"><Input label="Reference" bind:value={form.reference} /></div>
					<Button type="submit" size="sm" disabled={$createPayment.isPending || !rateValid}><Plus class="h-4 w-4" /> Record</Button>
				</div>
				{#if rateNeeded}
					<p class="mt-1.5 text-xs text-slate-400">
						{#if rateValid}= {formatAmount(pkrPreview, 'PKR')} at {form.rate} PKR/{form.currency}{:else}Enter a conversion rate to PKR.{/if}
					</p>
				{/if}
			</form>
			{#if l.payments.length === 0}
				<p class="text-sm text-slate-400">No payments recorded yet.</p>
			{:else}
				<div class="divide-y divide-slate-50">
					{#each l.payments as p (p.id)}
						<div class="flex items-center gap-3 py-2 text-sm">
							<span class="w-24 text-slate-400">{p.payment_date}</span>
							<span class="w-28 font-medium text-slate-700">
								{formatAmount(Number(p.amount), p.currency)}
								{#if p.currency !== 'PKR'}<span class="block text-[10px] font-normal text-slate-400">≈ {formatAmount(paymentPkr(p), 'PKR')}</span>{/if}
							</span>
							<span class="flex-1 text-slate-500">
								{p.booking_item_id ? (labelByItem.get(p.booking_item_id) ?? 'Service') : 'General'}
								{p.method ? ` · ${p.method}` : ''}{p.reference ? ` · ${p.reference}` : ''}
							</span>
							<button onclick={() => confirm('Delete this payment?') && $removePayment.mutate(p.id)} class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	{/if}
{/if}
