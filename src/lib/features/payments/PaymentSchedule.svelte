<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus, Check, Trash2, Receipt, CalendarClock, Wand2 } from 'lucide-svelte';
	import { Badge, Button, Card, Input } from '$ui';
	import { formatAmount } from '$lib/money';
	import { usePayments, useCreatePayment, useUpdatePayment, useDeletePayment } from './queries';
	import { paymentStatus, type Payment } from './api';
	import { addDays, defaultCheckIn } from '$features/quotations/dates';

	let { queryId, sellingPkr }: { queryId: string; sellingPkr: number } = $props();

	const payments = untrack(() => usePayments(queryId));
	const create = untrack(() => useCreatePayment(queryId));
	const update = untrack(() => useUpdatePayment(queryId));
	const remove = untrack(() => useDeletePayment(queryId));

	const today = new Date().toISOString().slice(0, 10);
	let form = $state({ label: 'Payment', amount: 0, due: today });

	const rows = $derived($payments.data ?? []);
	const paid = $derived(rows.filter((p) => p.status === 'paid').reduce((a, p) => a + Number(p.amount), 0));
	const balance = $derived(Math.max(0, sellingPkr - paid));
	const overdue = $derived(rows.filter((p) => paymentStatus(p) === 'overdue').length);

	const tone = { paid: 'success', overdue: 'danger', pending: 'warning' } as const;

	async function add(e: SubmitEvent) {
		e.preventDefault();
		await $create.mutateAsync({ query_id: queryId, label: form.label, amount: Number(form.amount), due_date: form.due });
		form = { label: 'Payment', amount: 0, due: today };
	}

	function markPaid(p: Payment) {
		$update.mutate({ id: p.id, patch: { status: 'paid', paid_date: today } });
	}

	// Quick plan: 25% deposit due today + balance due in ~30 days (check-in − a bit).
	function quickPlan() {
		if (sellingPkr <= 0) return;
		const deposit = Math.round(sellingPkr * 0.25);
		$create.mutate({ query_id: queryId, label: 'Deposit', amount: deposit, due_date: today });
		$create.mutate({ query_id: queryId, label: 'Balance', amount: sellingPkr - deposit, due_date: addDays(defaultCheckIn(), -7) });
	}
</script>

<Card title="Payment schedule">
	<div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
		<div><div class="text-xs text-slate-400">Package</div><div class="font-semibold text-slate-700">{formatAmount(sellingPkr, 'PKR')}</div></div>
		<div><div class="text-xs text-slate-400">Paid</div><div class="font-semibold text-green-600">{formatAmount(paid, 'PKR')}</div></div>
		<div><div class="text-xs text-slate-400">Balance</div><div class="font-semibold {balance > 0 ? 'text-amber-600' : 'text-green-600'}">{formatAmount(balance, 'PKR')}</div></div>
		<div><div class="text-xs text-slate-400">Overdue</div><div class="font-semibold {overdue ? 'text-red-600' : 'text-slate-700'}">{overdue}</div></div>
	</div>

	{#if rows.length === 0}
		<div class="mb-3 rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
			No scheduled payments.
			{#if sellingPkr > 0}
				<button class="ml-1 inline-flex items-center gap-1 font-medium text-brand-600 hover:underline" onclick={quickPlan}>
					<Wand2 class="h-3.5 w-3.5" /> Add deposit + balance
				</button>
			{/if}
		</div>
	{:else}
		<div class="mb-3 overflow-hidden rounded-lg border border-slate-200">
			<table class="w-full text-sm">
				<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
					<tr>
						<th class="px-3 py-2 font-medium">Label</th>
						<th class="px-3 py-2 text-right font-medium">Amount</th>
						<th class="px-3 py-2 font-medium">Due</th>
						<th class="px-3 py-2 font-medium">Status</th>
						<th class="px-3 py-2"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-50">
					{#each rows as p (p.id)}
						{@const st = paymentStatus(p)}
						<tr class="hover:bg-slate-50">
							<td class="px-3 py-2 text-slate-700">{p.label}</td>
							<td class="px-3 py-2 text-right text-slate-700">{formatAmount(Number(p.amount), 'PKR')}</td>
							<td class="px-3 py-2 text-slate-500">
								<span class="inline-flex items-center gap-1">
									{#if st === 'overdue'}<CalendarClock class="h-3.5 w-3.5 text-red-500" />{/if}
									{p.due_date ?? '—'}
								</span>
							</td>
							<td class="px-3 py-2"><Badge tone={tone[st]}>{st}</Badge></td>
							<td class="px-3 py-2">
								<div class="flex justify-end gap-1">
									{#if p.status !== 'paid'}
										<button onclick={() => markPaid(p)} class="rounded p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600" aria-label="Mark paid" title="Mark paid">
											<Check class="h-4 w-4" />
										</button>
									{:else}
										<a href="/queries/{queryId}/receipt/{p.id}" class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Receipt" title="Receipt">
											<Receipt class="h-4 w-4" />
										</a>
									{/if}
									<button onclick={() => confirm('Delete this payment?') && $remove.mutate(p.id)} class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<form onsubmit={add} class="flex flex-wrap items-end gap-2">
		<div class="w-32"><Input label="Label" bind:value={form.label} /></div>
		<div class="w-32"><Input label="Amount (PKR)" type="number" min="0" step="0.01" bind:value={form.amount} /></div>
		<div class="w-40"><Input label="Due date" type="date" bind:value={form.due} /></div>
		<Button type="submit" size="sm" disabled={$create.isPending}><Plus class="h-4 w-4" /> Add</Button>
	</form>
</Card>
