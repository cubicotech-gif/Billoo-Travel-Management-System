<script lang="ts">
	import { Card, Button, Badge } from '$ui';
	import { Download, LayoutGrid, ArrowDownCircle, ArrowUpCircle, TrendingUp } from 'lucide-svelte';
	import { formatAmount } from '$lib/money';
	import { useVendorBalances } from '$features/vendors/queries';
	import {
		useClientReceivables,
		useCollections,
		useProfitSummary
	} from '$features/finance/queries';

	const balances = useVendorBalances();
	const receivables = useClientReceivables();
	const collections = useCollections();
	const profit = useProfitSummary();

	const totalPayable = $derived(($balances.data ?? []).reduce((a, b) => a + Math.max(0, b.balance), 0));
	const totalReceivable = $derived(($receivables.data ?? []).reduce((a, r) => a + r.balance, 0));
	const totalCollected = $derived(($collections.data ?? []).reduce((a, c) => a + c.amount, 0));
	// Collected vs everything billed (collected + still outstanding).
	const billed = $derived(totalCollected + totalReceivable);
	const collectedPct = $derived(billed > 0 ? Math.min(100, Math.round((totalCollected / billed) * 100)) : 0);

	type Tab = 'overview' | 'collections' | 'receivables' | 'payables' | 'profit';
	let tab = $state<Tab>('overview');
	const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
		{ id: 'overview', label: 'Overview', icon: LayoutGrid },
		{ id: 'collections', label: 'Collections', icon: ArrowDownCircle },
		{ id: 'receivables', label: 'Receivables', icon: ArrowDownCircle },
		{ id: 'payables', label: 'Payables', icon: ArrowUpCircle },
		{ id: 'profit', label: 'Profit', icon: TrendingUp }
	];

	// Collections date filter.
	type Range = 'month' | '30d' | 'all';
	let range = $state<Range>('all');
	function cutoff(r: Range): number {
		if (r === 'all') return 0;
		const d = new Date();
		if (r === '30d') d.setDate(d.getDate() - 30);
		else d.setDate(1); // first of this month
		return d.getTime();
	}
	const shownCollections = $derived(
		($collections.data ?? []).filter((c) => {
			if (range === 'all') return true;
			if (!c.date) return false;
			return new Date(c.date).getTime() >= cutoff(range);
		})
	);
	const shownCollectedTotal = $derived(shownCollections.reduce((a, c) => a + c.amount, 0));

	// Only vendors we still owe.
	let payablesOnly = $state(true);
	const shownBalances = $derived(
		($balances.data ?? []).filter((b) => (payablesOnly ? b.balance > 0 : true))
	);

	function fmtDate(iso: string | null): string {
		return iso ? new Date(iso).toLocaleDateString() : '—';
	}
	function daysUntil(iso: string | null): number | null {
		if (!iso) return null;
		return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
	}

	function exportCsv(name: string, header: string[], rows: (string | number)[][]) {
		const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
		const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 4000);
	}
	function exportCollections() {
		exportCsv(
			'collections.csv',
			['Date', 'Client', 'Query', 'Label', 'Amount (PKR)'],
			shownCollections.map((c) => [fmtDate(c.date), c.clientName, c.queryNumber, c.label, c.amount])
		);
	}
	function exportReceivables() {
		exportCsv(
			'receivables.csv',
			['Client', 'Query', 'Travel date', 'Package (PKR)', 'Paid (PKR)', 'Balance (PKR)'],
			($receivables.data ?? []).map((r) => [r.clientName, r.queryNumber, fmtDate(r.travelDate), r.selling, r.paid, r.balance])
		);
	}
</script>

<div class="mb-5">
	<h1 class="text-2xl font-bold text-slate-800">Finance</h1>
	<p class="text-sm text-slate-500">The money hub — collections, receivables, vendor payables and profit across all bookings.</p>
</div>

<!-- KPI cards (always visible) -->
<div class="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
	<Card><div class="text-xs uppercase tracking-wide text-slate-400">Collected</div><div class="mt-1 text-2xl font-bold text-green-600">{formatAmount(totalCollected, 'PKR')}</div></Card>
	<Card><div class="text-xs uppercase tracking-wide text-slate-400">Receivable</div><div class="mt-1 text-2xl font-bold text-brand-700">{formatAmount(totalReceivable, 'PKR')}</div></Card>
	<Card><div class="text-xs uppercase tracking-wide text-slate-400">Payable</div><div class="mt-1 text-2xl font-bold text-amber-600">{formatAmount(totalPayable, 'PKR')}</div></Card>
	<Card><div class="text-xs uppercase tracking-wide text-slate-400">Net position</div><div class="mt-1 text-2xl font-bold text-slate-800">{formatAmount(totalReceivable - totalPayable, 'PKR')}</div></Card>
	<Card><div class="text-xs uppercase tracking-wide text-slate-400">Net profit</div><div class="mt-1 text-2xl font-bold {($profit.data?.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}">{formatAmount($profit.data?.netProfit ?? 0, 'PKR')}</div></Card>
</div>

<!-- Tab bar -->
<div class="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
	{#each TABS as t (t.id)}
		{@const Icon = t.icon}
		<button
			type="button"
			onclick={() => (tab = t.id)}
			class="-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors {tab === t.id
				? 'border-brand-500 text-brand-700'
				: 'border-transparent text-slate-500 hover:text-slate-700'}"
		>
			<Icon class="h-4 w-4" />
			{t.label}
		</button>
	{/each}
</div>

{#if tab === 'overview'}
	<Card>
		<div class="mb-2 flex items-center justify-between text-sm">
			<span class="font-medium text-slate-600">Collected of total billed</span>
			<span class="text-slate-500">{formatAmount(totalCollected, 'PKR')} / {formatAmount(billed, 'PKR')} · {collectedPct}%</span>
		</div>
		<div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
			<div class="h-full rounded-full bg-green-500" style="width: {collectedPct}%"></div>
		</div>
		<p class="mt-2 text-xs text-slate-400">{formatAmount(totalReceivable, 'PKR')} still to collect from clients.</p>
	</Card>
{:else if tab === 'collections'}
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-1.5">
			{#each [['month', 'This month'], ['30d', 'Last 30 days'], ['all', 'All']] as [val, label] (val)}
				<button type="button" onclick={() => (range = val as Range)} class="rounded-full border px-3 py-1 text-xs font-medium {range === val ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}">{label}</button>
			{/each}
			<span class="ml-2 text-sm text-slate-500">Total: <span class="font-semibold text-green-600">{formatAmount(shownCollectedTotal, 'PKR')}</span></span>
		</div>
		<Button size="sm" variant="secondary" onclick={exportCollections} disabled={shownCollections.length === 0}><Download class="h-4 w-4" /> CSV</Button>
	</div>
	{#if shownCollections.length === 0}
		<div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">No payments in this range.</div>
	{:else}
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
			<table class="w-full text-sm">
				<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
					<tr><th class="px-4 py-2 font-medium">Date</th><th class="px-4 py-2 font-medium">Client</th><th class="px-4 py-2 font-medium">For</th><th class="px-4 py-2 text-right font-medium">Amount</th></tr>
				</thead>
				<tbody class="divide-y divide-slate-50">
					{#each shownCollections as c (c.id)}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-2 text-xs text-slate-400">{fmtDate(c.date)}</td>
							<td class="px-4 py-2 font-medium text-slate-700"><a href="/queries/{c.queryId}" class="hover:text-brand-600">{c.clientName}</a></td>
							<td class="px-4 py-2 text-slate-500">{c.label}</td>
							<td class="px-4 py-2 text-right font-medium text-green-600">{formatAmount(c.amount, 'PKR')}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{:else if tab === 'receivables'}
	<div class="mb-3 flex items-center justify-between">
		<span class="text-sm text-slate-500">Outstanding: <span class="font-semibold text-amber-600">{formatAmount(totalReceivable, 'PKR')}</span></span>
		<Button size="sm" variant="secondary" onclick={exportReceivables} disabled={($receivables.data ?? []).length === 0}><Download class="h-4 w-4" /> CSV</Button>
	</div>
	{#if ($receivables.data ?? []).length === 0}
		<div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">Nothing outstanding from clients.</div>
	{:else}
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
			<table class="w-full text-sm">
				<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
					<tr><th class="px-4 py-2 font-medium">Client</th><th class="px-4 py-2 font-medium">Travel</th><th class="px-4 py-2 text-right font-medium">Package</th><th class="px-4 py-2 text-right font-medium">Paid</th><th class="px-4 py-2 text-right font-medium">Balance</th></tr>
				</thead>
				<tbody class="divide-y divide-slate-50">
					{#each $receivables.data ?? [] as r (r.queryId)}
						{@const d = daysUntil(r.travelDate)}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-2 font-medium text-slate-700"><a href="/queries/{r.queryId}" class="hover:text-brand-600">{r.clientName}</a></td>
							<td class="px-4 py-2">
								{#if d === null}<span class="text-slate-400">—</span>
								{:else if d < 0}<Badge tone="danger">Travelled</Badge>
								{:else if d <= 14}<Badge tone="warning">{d}d to travel</Badge>
								{:else}<span class="text-xs text-slate-500">{fmtDate(r.travelDate)}</span>{/if}
							</td>
							<td class="px-4 py-2 text-right text-slate-600">{formatAmount(r.selling, 'PKR')}</td>
							<td class="px-4 py-2 text-right text-green-600">{formatAmount(r.paid, 'PKR')}</td>
							<td class="px-4 py-2 text-right font-medium text-amber-600">{formatAmount(r.balance, 'PKR')}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{:else if tab === 'payables'}
	<div class="mb-3 flex items-center gap-2">
		<button type="button" onclick={() => (payablesOnly = !payablesOnly)} class="rounded-full border px-3 py-1 text-xs font-medium {payablesOnly ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}">With balance only</button>
		<span class="text-sm text-slate-500">Owed: <span class="font-semibold text-amber-600">{formatAmount(totalPayable, 'PKR')}</span></span>
	</div>
	{#if shownBalances.length === 0}
		<div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">No vendor activity.</div>
	{:else}
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
			<table class="w-full text-sm">
				<thead class="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
					<tr><th class="px-4 py-2 font-medium">Vendor</th><th class="px-4 py-2 text-right font-medium">Owed</th><th class="px-4 py-2 text-right font-medium">Paid</th><th class="px-4 py-2 text-right font-medium">Balance</th></tr>
				</thead>
				<tbody class="divide-y divide-slate-50">
					{#each shownBalances as b (b.vendor.id)}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-2 font-medium text-slate-700"><a href="/vendors/{b.vendor.id}" class="hover:text-brand-600">{b.vendor.name}</a></td>
							<td class="px-4 py-2 text-right text-slate-600">{formatAmount(b.owed, 'PKR')}</td>
							<td class="px-4 py-2 text-right text-green-600">{formatAmount(b.paid, 'PKR')}</td>
							<td class="px-4 py-2 text-right font-medium {b.balance > 0 ? 'text-amber-600' : 'text-green-600'}">{formatAmount(b.balance, 'PKR')}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{:else if tab === 'profit'}
	{@const pf = $profit.data}
	<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		<Card><div class="text-xs uppercase tracking-wide text-slate-400">Revenue (sell)</div><div class="mt-1 text-xl font-bold text-slate-800">{formatAmount(pf?.revenue ?? 0, 'PKR')}</div></Card>
		<Card><div class="text-xs uppercase tracking-wide text-slate-400">Cost</div><div class="mt-1 text-xl font-bold text-slate-800">{formatAmount(pf?.cost ?? 0, 'PKR')}</div></Card>
		<Card><div class="text-xs uppercase tracking-wide text-slate-400">Discounts</div><div class="mt-1 text-xl font-bold text-slate-800">{formatAmount(pf?.discount ?? 0, 'PKR')}</div></Card>
		<Card><div class="text-xs uppercase tracking-wide text-slate-400">Net profit</div><div class="mt-1 text-xl font-bold {(pf?.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}">{formatAmount(pf?.netProfit ?? 0, 'PKR')}</div></Card>
	</div>
	<p class="mt-3 text-xs text-slate-400">Net profit = revenue − cost − discounts, across all non-deleted bookings.</p>
{/if}
