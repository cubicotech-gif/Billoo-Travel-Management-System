<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, MessageCircle, Phone, MapPin, Plus, Trash2 } from 'lucide-svelte';
	import { Badge, Button, Card, Input } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useVendor, useVendorLedger, useCreateVendorPayment, useDeleteVendorPayment } from './queries';

	let { id }: { id: string } = $props();

	const vendor = untrack(() => useVendor(id));
	const ledger = untrack(() => useVendorLedger(id));
	const createPayment = untrack(() => useCreateVendorPayment(id));
	const removePayment = untrack(() => useDeleteVendorPayment(id));

	const today = new Date().toISOString().slice(0, 10);
	let form = $state({ amount: 0, date: today, method: '', reference: '' });

	async function addPayment(e: SubmitEvent) {
		e.preventDefault();
		await $createPayment.mutateAsync({
			vendor_id: id,
			amount: Number(form.amount),
			payment_date: form.date,
			method: form.method || null,
			reference: form.reference || null
		});
		form = { amount: 0, date: today, method: '', reference: '' };
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

	{#if $ledger.data}
		{@const l = $ledger.data}
		<div class="mb-6 grid grid-cols-3 gap-4">
			<Card>
				<div class="text-xs uppercase tracking-wide text-slate-400">We owe</div>
				<div class="mt-1 text-xl font-bold text-slate-800">{formatAmount(l.owed, 'PKR')}</div>
			</Card>
			<Card>
				<div class="text-xs uppercase tracking-wide text-slate-400">Paid</div>
				<div class="mt-1 text-xl font-bold text-green-600">{formatAmount(l.paid, 'PKR')}</div>
			</Card>
			<Card>
				<div class="text-xs uppercase tracking-wide text-slate-400">Balance</div>
				<div class="mt-1 text-xl font-bold {l.balance > 0 ? 'text-amber-600' : 'text-green-600'}">{formatAmount(l.balance, 'PKR')}</div>
			</Card>
		</div>

		<!-- What we owe (from booking actuals) -->
		<h2 class="mb-2 text-lg font-semibold text-slate-800">Charges (from bookings)</h2>
		{#if l.charges.length === 0}
			<div class="mb-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
				No charges yet — these appear when a booking records this vendor on a component.
			</div>
		{:else}
			<div class="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
				<table class="w-full text-sm">
					<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
						<tr>
							<th class="px-4 py-2 font-medium">Component</th>
							<th class="px-4 py-2 font-medium">Query</th>
							<th class="px-4 py-2 text-right font-medium">Cost</th>
							<th class="px-4 py-2 text-right font-medium">Owed (PKR)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-50">
						{#each l.charges as c (c.itemId)}
							<tr class="hover:bg-slate-50">
								<td class="px-4 py-2 text-slate-700">{c.label}</td>
								<td class="px-4 py-2">
									{#if c.queryId}<a href="/queries/{c.queryId}" class="text-brand-600 hover:underline">{c.clientName ?? c.queryNumber}</a>{:else}—{/if}
								</td>
								<td class="px-4 py-2 text-right text-slate-500">{formatAmount(c.actualCost, c.currency)}</td>
								<td class="px-4 py-2 text-right font-medium text-slate-700">{formatAmount(c.owedPkr, 'PKR')}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Payments we made -->
		<h2 class="mb-2 text-lg font-semibold text-slate-800">Payments made</h2>
		<Card>
			<form onsubmit={addPayment} class="mb-3 flex flex-wrap items-end gap-2">
				<div class="w-32"><Input label="Amount (PKR)" type="number" min="0" step="0.01" bind:value={form.amount} /></div>
				<div class="w-40"><Input label="Date" type="date" bind:value={form.date} /></div>
				<div class="w-32"><Input label="Method" bind:value={form.method} placeholder="Cash / Bank" /></div>
				<div class="w-36"><Input label="Reference" bind:value={form.reference} /></div>
				<Button type="submit" size="sm" disabled={$createPayment.isPending}><Plus class="h-4 w-4" /> Record</Button>
			</form>
			{#if l.payments.length === 0}
				<p class="text-sm text-slate-400">No payments recorded yet.</p>
			{:else}
				<div class="divide-y divide-slate-50">
					{#each l.payments as p (p.id)}
						<div class="flex items-center gap-3 py-2 text-sm">
							<span class="w-24 text-slate-400">{p.payment_date}</span>
							<span class="flex-1 font-medium text-slate-700">{formatAmount(Number(p.amount), 'PKR')}</span>
							<span class="text-slate-500">{p.method ?? ''}{p.reference ? ` · ${p.reference}` : ''}</span>
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
