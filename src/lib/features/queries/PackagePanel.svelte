<script lang="ts">
	import { untrack } from 'svelte';
	import { Package, History, MessageSquare } from 'lucide-svelte';
	import { formatAmount } from '$lib/money';
	import { daysSince } from './workflow';
	import { useReplies } from './queries';
	import type { Quotation } from '$features/quotations/types';
	import type { Query } from './types';

	// The context shown on every stage: what the package is, what's happened
	// recently, and the latest word from the client. `compact` lays the three
	// sections out as a horizontal strip (used above the full-width builder).
	let { query: q, latest, compact = false }: { query: Query; latest: Quotation | null; compact?: boolean } =
		$props();

	const replies = untrack(() => useReplies(q.id));

	const pax = $derived(
		`${q.adults}A${q.children ? ` · ${q.children}C` : ''}${q.infants ? ` · ${q.infants}I` : ''}`
	);
	const priced = $derived(Number(q.selling_price) > 0);

	interface Update {
		label: string;
		when: string;
	}

	// No activity table yet — synthesise a timeline from the timestamps we do have.
	const updates = $derived.by((): Update[] => {
		const list: Update[] = [];
		if (q.completed_date) list.push({ label: 'Trip completed', when: q.completed_date });
		if (q.advance_payment_date)
			list.push({
				label: `Advance ${formatAmount(Number(q.advance_payment_amount ?? 0))} recorded`,
				when: q.advance_payment_date
			});
		if (latest) list.push({ label: `Quote v${latest.version} (${latest.status})`, when: latest.created_at });
		list.push({ label: `Entered ${q.status}`, when: q.stage_changed_at ?? q.created_at });
		list.push({ label: 'Query created', when: q.created_at });
		return list
			.filter((u) => u.when)
			.sort((a, b) => +new Date(b.when) - +new Date(a.when))
			.slice(0, compact ? 3 : 5);
	});

	const recentReplies = $derived(
		($replies.data ?? [])
			.filter((r) => r.sender === 'client')
			.slice(compact ? -1 : -3)
			.reverse()
	);

	function fmt(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	}
	function fmtRel(iso: string): string {
		const d = daysSince(iso);
		return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`;
	}
</script>

<div class={compact ? 'grid grid-cols-1 gap-4 md:grid-cols-3' : 'space-y-4'}>
	<!-- Complete details -->
	<section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<div class="mb-3 flex items-center gap-2">
			<Package class="h-4 w-4 text-slate-400" />
			<h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Package details</h2>
		</div>
		<dl class="space-y-2 text-sm">
			<div class="flex justify-between gap-2">
				<dt class="text-slate-400">Package</dt>
				<dd class="text-right font-medium text-slate-700">{q.package_type ?? q.destination}</dd>
			</div>
			<div class="flex justify-between gap-2">
				<dt class="text-slate-400">Pax</dt>
				<dd class="text-right font-medium text-slate-700">{pax}</dd>
			</div>
			{#if q.travel_date}
				<div class="flex justify-between gap-2">
					<dt class="text-slate-400">Travel</dt>
					<dd class="text-right font-medium text-slate-700">{fmt(q.travel_date)}</dd>
				</div>
			{/if}
			{#if (q.itinerary_cities ?? []).length}
				<div class="flex justify-between gap-2">
					<dt class="text-slate-400">Itinerary</dt>
					<dd class="text-right font-medium text-slate-700">
						{(q.itinerary_cities ?? []).map((c) => `${c.city} ${c.nights}N`).join(' · ')}
					</dd>
				</div>
			{/if}
			<div class="flex justify-between gap-2">
				<dt class="text-slate-400">Owner</dt>
				<dd class="text-right font-medium text-slate-700">{q.created_by_staff ?? '—'}</dd>
			</div>
		</dl>

		{#if priced}
			<div class="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm">
				<div>
					<div class="text-[10px] uppercase tracking-wide text-slate-400">Selling</div>
					<div class="font-bold text-slate-800">{formatAmount(Number(q.selling_price))}</div>
				</div>
				<div>
					<div class="text-[10px] uppercase tracking-wide text-slate-400">Cost</div>
					<div class="font-bold text-slate-800">{formatAmount(Number(q.cost_price))}</div>
				</div>
				<div>
					<div class="text-[10px] uppercase tracking-wide text-slate-400">Profit</div>
					<div class="font-bold text-green-600">{formatAmount(Number(q.profit))}</div>
				</div>
				<div>
					<div class="text-[10px] uppercase tracking-wide text-slate-400">Margin</div>
					<div class="font-bold text-slate-800">{Number(q.profit_margin).toFixed(1)}%</div>
				</div>
			</div>
		{/if}
	</section>

	<!-- Recent updates -->
	<section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<div class="mb-3 flex items-center gap-2">
			<History class="h-4 w-4 text-slate-400" />
			<h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent updates</h2>
		</div>
		<ul class="space-y-2">
			{#each updates as u (u.label + u.when)}
				<li class="flex items-start gap-2 text-sm">
					<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"></span>
					<span class="flex-1 text-slate-600">{u.label}</span>
					<span class="shrink-0 text-xs text-slate-400">{fmtRel(u.when)}</span>
				</li>
			{/each}
		</ul>
	</section>

	<!-- Latest client suggestions -->
	<section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<div class="mb-3 flex items-center gap-2">
			<MessageSquare class="h-4 w-4 text-slate-400" />
			<h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest from client</h2>
		</div>
		{#if recentReplies.length === 0}
			<p class="text-sm text-slate-400">No messages yet.</p>
		{:else}
			<ul class="space-y-2">
				{#each recentReplies as r (r.id)}
					<li class="rounded-lg bg-slate-50 px-3 py-2 text-sm">
						<p class="whitespace-pre-wrap text-slate-700">{r.body}</p>
						<span class="mt-1 block text-[10px] text-slate-400">{fmt(r.created_at)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
