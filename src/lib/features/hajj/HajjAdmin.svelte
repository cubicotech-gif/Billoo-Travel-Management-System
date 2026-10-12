<script lang="ts">
	import { untrack } from 'svelte';
	import { Plus, RefreshCw, Trash2, Users } from 'lucide-svelte';
	import { Badge, Button, Card, Input, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { usePassengers } from '$features/passengers/queries';
	import { fullName } from '$features/passengers/types';
	import {
		useAddCommissionReceipt,
		useAddVendorPayment,
		useDeleteVendorPayment,
		usePayablesData,
		useVendorPayments,
		useCommissionReceipts,
		useDeleteCommissionReceipt,
		useGmcPoolData,
		useHajjTravellerRefs,
		useSetPackageCommission,
		useSettleGmc
	} from './admin-queries';
	import { formatSpan } from './catalogue';
	import { commissionSummary } from './commission';
	import { costByQuery, payablesSummary } from './payables';
	import { poolReport } from './pools';
	import { useHajjAddons, useHajjCatalogues, useHajjPackages } from './queries';
	import type { HajjCurrency } from './types';

	// Staff-only Hajj back office: what the vendor pays us per person, what it has
	// paid so far, and how the shared GMC vehicles are filled across clients.
	let tab = $state<'commission' | 'received' | 'payable' | 'gmc'>('commission');

	const catalogues = untrack(() => useHajjCatalogues());
	const packages = untrack(() => useHajjPackages());
	const refs = untrack(() => useHajjTravellerRefs());
	const receipts = untrack(() => useCommissionReceipts());
	const addReceipt = untrack(() => useAddCommissionReceipt());
	const deleteReceipt = untrack(() => useDeleteCommissionReceipt());
	const setCommission = untrack(() => useSetPackageCommission());
	const pools = untrack(() => useGmcPoolData());
	const addons = untrack(() => useHajjAddons());
	const payablesData = untrack(() => usePayablesData());
	const vendorPayments = untrack(() => useVendorPayments());
	const addPayment = untrack(() => useAddVendorPayment());
	const deletePayment = untrack(() => useDeleteVendorPayment());
	const settle = untrack(() => useSettleGmc());
	const passengers = untrack(() => usePassengers());

	const cats = $derived($catalogues.data ?? []);
	const pkgs = $derived($packages.data ?? []);

	// Confirmed = the traveller's query is in the Booking stage.
	const confirmedByPackage = $derived.by(() => {
		const status = new Map(($refs.data?.queries ?? []).map((q) => [q.id, q]));
		const out = new Map<string, number>();
		for (const t of $refs.data?.travellers ?? []) {
			const q = status.get(t.query_id);
			if (q && q.status === 'Booking' && !q.is_deleted)
				out.set(t.package_id, (out.get(t.package_id) ?? 0) + 1);
		}
		return out;
	});

	// --- Commission set-up --------------------------------------------------------
	function saveCommission(packageId: string, raw: string, current: number | null) {
		const text = raw.trim();
		const next = text === '' ? null : Number(text);
		if (next !== null && (!Number.isFinite(next) || next < 0)) return;
		if (next === current) return;
		$setCommission.mutate({ packageId, commission: next });
	}
	let bulk = $state<Record<string, string>>({});
	function fillBlank(catalogueId: string) {
		const n = Number(bulk[catalogueId]);
		if (!Number.isFinite(n) || n < 0 || !(bulk[catalogueId] ?? '').trim()) return;
		for (const p of pkgs)
			if (p.catalogue_id === catalogueId && p.commission_per_person === null)
				$setCommission.mutate({ packageId: p.id, commission: n });
	}

	// --- Commission received ------------------------------------------------------
	const summary = $derived.by(() => {
		const status = new Map(($refs.data?.queries ?? []).map((q) => [q.id, q]));
		const pkgById = new Map(pkgs.map((p) => [p.id, p]));
		const catById = new Map(cats.map((c) => [c.id, c]));
		const travellers = ($refs.data?.travellers ?? []).flatMap((t) => {
			const p = pkgById.get(t.package_id);
			const cur = p ? catById.get(p.catalogue_id)?.currency : undefined;
			const q = status.get(t.query_id);
			if (!p || !cur) return [];
			return [
				{
					currency: cur,
					commission: p.commission_per_person === null ? null : Number(p.commission_per_person),
					confirmed: !!q && q.status === 'Booking' && !q.is_deleted
				}
			];
		});
		return commissionSummary(
			travellers,
			($receipts.data ?? []).map((r) => ({ amount: Number(r.amount), currency: r.currency }))
		);
	});

	const today = new Date().toISOString().slice(0, 10);
	let form = $state({ amount: '', currency: 'SAR' as HajjCurrency, date: today, reference: '', notes: '' });
	let formError = $state<string | null>(null);
	function addReceiptNow() {
		const amount = Number(form.amount);
		if (!Number.isFinite(amount) || amount <= 0) {
			formError = 'Enter the amount received.';
			return;
		}
		formError = null;
		$addReceipt.mutate(
			{
				amount,
				currency: form.currency,
				received_date: form.date,
				reference: form.reference.trim() || null,
				notes: form.notes.trim() || null
			},
			{ onSuccess: () => (form = { ...form, amount: '', reference: '', notes: '' }) }
		);
	}

	// --- Vendor payments (what we owe the vendor) ---------------------------------
	const payables = $derived.by(() => {
		const d = $payablesData.data;
		if (!d) return null;
		const rows = costByQuery({
			travellers: d.travellers,
			queries: d.queries,
			packages: pkgs,
			addons: $addons.data ?? [],
			catalogues: cats
		});
		return {
			rows,
			...payablesSummary(
				rows,
				($vendorPayments.data ?? []).map((p) => ({
					amount: Number(p.amount),
					currency: p.currency,
					query_id: p.query_id
				}))
			)
		};
	});
	const queryLabel = $derived(
		new Map(($payablesData.data?.queries ?? []).map((q) => [q.id, `${q.query_number} · ${q.client_name}`]))
	);
	let pay = $state({ amount: '', currency: 'SAR' as HajjCurrency, date: today, queryId: '', reference: '', notes: '' });
	let payError = $state<string | null>(null);
	function addPaymentNow() {
		const amount = Number(pay.amount);
		if (!Number.isFinite(amount) || amount <= 0) {
			payError = 'Enter the amount paid.';
			return;
		}
		payError = null;
		$addPayment.mutate(
			{
				amount,
				currency: pay.currency,
				paid_date: pay.date,
				query_id: pay.queryId || null,
				reference: pay.reference.trim() || null,
				notes: pay.notes.trim() || null
			},
			{ onSuccess: () => (pay = { ...pay, amount: '', reference: '', notes: '' }) }
		);
	}

	// --- GMC pools ------------------------------------------------------------------
	const vehicles = $derived.by(() => {
		const d = $pools.data;
		if (!d) return [];
		const nameOfPassenger = new Map(($passengers.data ?? []).map((p) => [p.id, fullName(p)]));
		const names = Object.fromEntries(
			d.travellers.map((t) => [t.id, nameOfPassenger.get(t.passenger_id) ?? 'Traveller'])
		);
		return poolReport({ lines: d.lines, travellers: d.travellers, queries: d.queries, names });
	});
</script>

<div class="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-0.5 sm:inline-flex">
	{#each [['commission', 'Commission set-up'], ['received', 'Commission received'], ['payable', 'Vendor payments'], ['gmc', 'GMC pools']] as [key, label] (key)}
		<button
			type="button"
			onclick={() => (tab = key as typeof tab)}
			class="rounded-md px-3 py-1.5 text-sm font-medium {tab === key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}"
			>{label}</button
		>
	{/each}
</div>

{#if tab === 'commission'}
	<p class="mb-3 text-sm text-slate-500">
		The fixed amount the vendor pays us <strong>per person</strong>, per package — the same for every room type and
		add-on. Leave blank until it is known. It is money we receive later, and is counted in profit for confirmed bookings.
	</p>
	{#each cats as cat (cat.id)}
		{@const list = pkgs.filter((p) => p.catalogue_id === cat.id)}
		<Card title="{cat.name} — commission per person ({cat.currency})" class="mb-4">
			<div class="mb-3 flex flex-wrap items-end gap-2">
				<div class="w-40">
					<Input
						label="Fill all blank with"
						type="number"
						min="0"
						step="any"
						value={bulk[cat.id] ?? ''}
						oninput={(e) => (bulk[cat.id] = e.currentTarget.value)}
					/>
				</div>
				<Button size="sm" variant="secondary" onclick={() => fillBlank(cat.id)}>Apply to blank packages</Button>
			</div>
			<div class="table-scroll">
				<table class="w-full text-sm">
					<thead class="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
						<tr>
							<th class="py-2 pr-3 font-medium">Package</th>
							<th class="py-2 pr-3 font-medium">Dates</th>
							<th class="py-2 pr-3 text-right font-medium">Confirmed travellers</th>
							<th class="py-2 text-right font-medium">Commission ({cat.currency})</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each list as p (p.id)}
							<tr>
								<td class="py-1.5 pr-3">
									<span class="font-mono text-xs text-slate-400">{p.code}</span> {p.title}
									{#if p.duration_label}<span class="text-xs text-slate-400">({p.duration_label})</span>{/if}
								</td>
								<td class="py-1.5 pr-3 whitespace-nowrap text-slate-500">{formatSpan(p.start_date, p.end_date)}</td>
								<td class="py-1.5 pr-3 text-right tabular-nums">{confirmedByPackage.get(p.id) ?? 0}</td>
								<td class="py-1.5 text-right">
									<input
										type="number"
										min="0"
										step="any"
										placeholder="—"
										value={p.commission_per_person ?? ''}
										onblur={(e) =>
											saveCommission(
												p.id,
												e.currentTarget.value,
												p.commission_per_person === null ? null : Number(p.commission_per_person)
											)}
										class="w-32 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
									/>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{/each}
{:else if tab === 'received'}
	<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
		<div class="space-y-4">
			<Card title="Commission owed to us (confirmed bookings)">
				{#if summary.length === 0}
					<p class="text-sm text-slate-400">Nothing yet — commission accrues once Hajj queries reach the Booking stage.</p>
				{:else}
					<div class="table-scroll">
						<table class="w-full text-sm tabular-nums">
							<thead class="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
								<tr>
									<th class="py-2 pr-3 font-medium">Currency</th>
									<th class="py-2 pr-3 text-right font-medium">Travellers</th>
									<th class="py-2 pr-3 text-right font-medium">Expected</th>
									<th class="py-2 pr-3 text-right font-medium">Received</th>
									<th class="py-2 text-right font-medium">Outstanding</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-100">
								{#each summary as l (l.currency)}
									<tr>
										<td class="py-2 pr-3 font-medium">{l.currency}</td>
										<td class="py-2 pr-3 text-right">
											{l.travellers}
											{#if l.missing}<span class="ml-1 text-xs text-amber-600">({l.missing} without commission)</span>{/if}
										</td>
										<td class="py-2 pr-3 text-right">{formatAmount(l.expected, l.currency)}</td>
										<td class="py-2 pr-3 text-right text-green-600">{formatAmount(l.received, l.currency)}</td>
										<td class="py-2 text-right font-semibold {l.outstanding > 0 ? 'text-amber-600' : 'text-slate-700'}">{formatAmount(l.outstanding, l.currency)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</Card>

			<Card title="Received from the vendor">
				{#if ($receipts.data ?? []).length === 0}
					<p class="text-sm text-slate-400">No receipts recorded yet.</p>
				{:else}
					<ul class="divide-y divide-slate-100 text-sm">
						{#each $receipts.data ?? [] as r (r.id)}
							<li class="flex flex-wrap items-center justify-between gap-2 py-2">
								<div>
									<span class="font-medium tabular-nums">{formatAmount(Number(r.amount), r.currency)}</span>
									<span class="ml-2 text-slate-500">{r.received_date}</span>
									{#if r.reference}<span class="ml-2 font-mono text-xs text-slate-400">{r.reference}</span>{/if}
									{#if r.notes}<div class="text-xs text-slate-400">{r.notes}</div>{/if}
								</div>
								<Button size="sm" variant="ghost" disabled={$deleteReceipt.isPending} onclick={() => confirm('Delete this receipt?') && $deleteReceipt.mutate(r.id)}>
									<Trash2 class="h-4 w-4" />
								</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
		</div>

		<Card title="Record a receipt">
			<div class="space-y-3">
				<Input label="Amount" type="number" min="0" step="any" bind:value={form.amount} />
				<Select label="Currency" bind:value={form.currency} options={['SAR', 'USD']} />
				<Input label="Date received" type="date" bind:value={form.date} />
				<Input label="Reference" bind:value={form.reference} placeholder="Transfer / cheque no." />
				<Input label="Notes" bind:value={form.notes} />
				{#if formError}<p class="text-sm text-red-600">{formError}</p>{/if}
				<Button disabled={$addReceipt.isPending} onclick={addReceiptNow}><Plus class="h-4 w-4" /> Add receipt</Button>
			</div>
		</Card>
	</div>
{:else if tab === 'payable'}
	<p class="mb-3 max-w-2xl text-sm text-slate-500">
		What we owe the vendor is its catalogue cost for every traveller whose query is in the Booking stage (package
		plus add-ons, GMC at its settled share), kept in USD and SAR separately. Air tickets are ours, and commission
		is tracked under “Commission received” — neither is netted here.
	</p>
	<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]" data-testid="hajj-payables">
		<div class="space-y-4">
			<Card title="Payable to the vendor">
				{#if !payables}
					<p class="text-sm text-slate-400">Loading…</p>
				{:else if payables.lines.length === 0}
					<p class="text-sm text-slate-400">Nothing yet — amounts accrue once Hajj queries reach the Booking stage.</p>
				{:else}
					<div class="table-scroll">
						<table class="w-full text-sm tabular-nums">
							<thead class="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
								<tr>
									<th class="py-2 pr-3 font-medium">Currency</th>
									<th class="py-2 pr-3 text-right font-medium">We owe</th>
									<th class="py-2 pr-3 text-right font-medium">Paid</th>
									<th class="py-2 text-right font-medium">Outstanding</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-100">
								{#each payables.lines as l (l.currency)}
									<tr>
										<td class="py-2 pr-3 font-medium">{l.currency}</td>
										<td class="py-2 pr-3 text-right">{formatAmount(l.owed, l.currency)}</td>
										<td class="py-2 pr-3 text-right text-green-600">
											{formatAmount(l.paid, l.currency)}
											{#if l.unallocated > 0}<div class="text-xs text-slate-400">{formatAmount(l.unallocated, l.currency)} not tied to a booking</div>{/if}
										</td>
										<td class="py-2 text-right font-semibold {l.outstanding > 0 ? 'text-amber-600' : l.outstanding < 0 ? 'text-blue-600' : 'text-slate-700'}">
											{formatAmount(l.outstanding, l.currency)}
											{#if l.outstanding < 0}<div class="text-xs font-normal">overpaid</div>{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</Card>

			{#if payables && payables.queries.length > 0}
				<Card title="By booking">
					<div class="table-scroll">
						<table class="w-full text-sm tabular-nums">
							<thead class="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
								<tr>
									<th class="py-2 pr-3 font-medium">Booking</th>
									<th class="py-2 pr-3 text-right font-medium">We owe</th>
									<th class="py-2 pr-3 text-right font-medium">Paid</th>
									<th class="py-2 text-right font-medium">Balance</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-100">
								{#each payables.queries as r (r.queryId)}
									<tr>
										<td class="py-2 pr-3">
											<a class="font-medium text-brand-700 hover:underline" href="/queries/{r.queryId}">{r.queryNumber}</a>
											<div class="text-xs text-slate-500">{r.client} · {r.travellers} traveller{r.travellers === 1 ? '' : 's'}</div>
										</td>
										<td class="py-2 pr-3 text-right">
											{#each Object.entries(r.owed) as [cur, n] (cur)}<div>{formatAmount(Number(n), cur as HajjCurrency)}</div>{/each}
										</td>
										<td class="py-2 pr-3 text-right text-green-600">
											{#each Object.entries(r.paid) as [cur, n] (cur)}<div>{formatAmount(Number(n), cur as HajjCurrency)}</div>{/each}
										</td>
										<td class="py-2 text-right">
											{#each Object.entries(r.balance) as [cur, n] (cur)}
												<div class="font-medium {Number(n) > 0 ? 'text-amber-600' : 'text-slate-600'}">{formatAmount(Number(n), cur as HajjCurrency)}</div>
											{/each}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Card>
			{/if}

			<Card title="Paid to the vendor">
				{#if ($vendorPayments.data ?? []).length === 0}
					<p class="text-sm text-slate-400">No payments recorded yet.</p>
				{:else}
					<ul class="divide-y divide-slate-100 text-sm">
						{#each $vendorPayments.data ?? [] as p (p.id)}
							<li class="flex flex-wrap items-center justify-between gap-2 py-2">
								<div>
									<span class="font-medium tabular-nums">{formatAmount(Number(p.amount), p.currency)}</span>
									<span class="ml-2 text-slate-500">{p.paid_date}</span>
									{#if p.reference}<span class="ml-2 font-mono text-xs text-slate-400">{p.reference}</span>{/if}
									<div class="text-xs text-slate-400">
										{p.query_id ? (queryLabel.get(p.query_id) ?? 'Booking') : 'Not tied to a booking'}{p.notes ? ` · ${p.notes}` : ''}
									</div>
								</div>
								<Button size="sm" variant="ghost" disabled={$deletePayment.isPending} onclick={() => confirm('Delete this payment?') && $deletePayment.mutate(p.id)}>
									<Trash2 class="h-4 w-4" />
								</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
		</div>

		<Card title="Record a payment">
			<div class="space-y-3">
				<Input label="Amount" type="number" min="0" step="any" bind:value={pay.amount} />
				<Select label="Currency" bind:value={pay.currency} options={['SAR', 'USD']} />
				<Input label="Date paid" type="date" bind:value={pay.date} />
				<Select
					label="For booking (optional)"
					bind:value={pay.queryId}
					options={[
						{ value: '', label: 'Not tied to a booking' },
						...(payables?.rows ?? []).map((r) => ({ value: r.query.id, label: `${r.query.query_number} · ${r.query.client_name}` }))
					]}
				/>
				<Input label="Reference" bind:value={pay.reference} placeholder="Transfer / cheque no." />
				<Input label="Notes" bind:value={pay.notes} />
				{#if payError}<p class="text-sm text-red-600">{payError}</p>{/if}
				<Button disabled={$addPayment.isPending} onclick={addPaymentNow}><Plus class="h-4 w-4" /> Add payment</Button>
			</div>
		</Card>
	</div>
{:else}
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<p class="max-w-2xl text-sm text-slate-500">
			One GMC vehicle holds up to 6. A family that takes it fills its own vehicle; single travellers pool across clients
			and packages in the order confirmed. Only queries in the Booking stage are counted.
		</p>
		<Button variant="secondary" size="sm" disabled={$settle.isPending} onclick={() => $settle.mutate()}>
			<RefreshCw class="h-4 w-4 {$settle.isPending ? 'animate-spin' : ''}" /> Recalculate now
		</Button>
	</div>
	{#if vehicles.length === 0}
		<Card><p class="text-sm text-slate-400">No settled GMC vehicles yet.</p></Card>
	{/if}
	<div class="grid gap-4 md:grid-cols-2">
		{#each vehicles as v (v.vehicle)}
			{@const cur = (v.currency === 'USD' ? 'USD' : 'SAR') as HajjCurrency}
			<Card>
				<div class="mb-2 flex flex-wrap items-center gap-2">
					<h4 class="font-semibold text-slate-800">GMC {v.vehicle}</h4>
					<Badge tone={v.scope === 'family' ? 'info' : 'success'}>{v.scope === 'family' ? 'Family vehicle' : 'Shared pool'}</Badge>
					<span class="ml-auto inline-flex items-center gap-1 text-xs text-slate-500"><Users class="h-3.5 w-3.5" /> {v.occupants.length} / 6</span>
				</div>
				<ul class="divide-y divide-slate-100 text-sm">
					{#each v.occupants as o (o.lineId)}
						<li class="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
							<span>
								{o.traveller}
								<a class="ml-1 font-mono text-xs text-brand-600 hover:underline" href="/queries/{o.queryId}">{o.queryNumber}</a>
							</span>
							<span class="tabular-nums">{formatAmount(o.cost, cur)}</span>
						</li>
					{/each}
				</ul>
				<p class="mt-2 text-right text-xs text-slate-400">
					Vehicle total {formatAmount(v.occupants.reduce((a, o) => a + Math.round(o.cost * 100), 0) / 100, cur)}
				</p>
			</Card>
		{/each}
	</div>
{/if}
