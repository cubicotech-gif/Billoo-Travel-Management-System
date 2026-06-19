<script lang="ts">
	import { untrack } from 'svelte';
	import {
		Package,
		History,
		MessageSquare,
		ArrowRight,
		FileText,
		PackageCheck,
		Wallet,
		Dot,
		Pencil,
		NotebookPen
	} from 'lucide-svelte';
	import { formatAmount } from '$lib/money';
	import { daysSince } from './workflow';
	import { useReplies, useActivity, useUpdateQuery } from './queries';
	import type { ActivityKind } from './activity';
	import type { Quotation } from '$features/quotations/types';
	import type { Query } from './types';

	// The context shown on every stage: what the package is, what's happened
	// recently, and the latest word from the client. `compact` lays the three
	// sections out as a horizontal strip (used above the full-width builder).
	let { query: q, latest, compact = false }: { query: Query; latest: Quotation | null; compact?: boolean } =
		$props();

	const replies = untrack(() => useReplies(q.id));
	const activity = untrack(() => useActivity(q.id));
	const update = untrack(() => useUpdateQuery());

	// The response/notes are the running working basis — editable right here so we
	// never have to reopen the intake form to see or update them.
	let editingNotes = $state(false);
	let notesDraft = $state('');
	function startNotes() {
		notesDraft = q.response_text ?? '';
		editingNotes = true;
	}
	function saveNotes() {
		$update.mutate(
			{ id: q.id, patch: { response_text: notesDraft.trim() || null } },
			{ onSuccess: () => (editingNotes = false) }
		);
	}

	const pax = $derived(
		`${q.adults}A${q.children ? ` · ${q.children}C` : ''}${q.infants ? ` · ${q.infants}I` : ''}`
	);
	const priced = $derived(Number(q.selling_price) > 0);

	interface Update {
		label: string;
		when: string;
		kind?: ActivityKind;
	}

	// Icon + accent per activity kind, so the timeline reads at a glance.
	const kindStyle: Record<ActivityKind, { icon: typeof Dot; tone: string }> = {
		stage: { icon: ArrowRight, tone: 'text-brand-500' },
		quote: { icon: FileText, tone: 'text-indigo-500' },
		message: { icon: MessageSquare, tone: 'text-slate-400' },
		booking: { icon: PackageCheck, tone: 'text-green-500' },
		payment: { icon: Wallet, tone: 'text-amber-500' },
		note: { icon: Dot, tone: 'text-slate-400' }
	};
	const styleFor = (k?: ActivityKind) => kindStyle[k ?? 'note'];

	const limit = $derived(compact ? 3 : 5);

	// Prefer the real activity log; fall back to a timeline synthesised from the
	// timestamps we have (covers queries created before logging, or when the
	// activity migration hasn't been applied yet).
	const updates = $derived.by((): Update[] => {
		const logged = $activity.data ?? [];
		if (logged.length) {
			return logged
				.slice(0, limit)
				.map((a) => ({ label: a.summary, when: a.created_at, kind: a.kind as ActivityKind }));
		}
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
			.slice(0, limit);
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

<div class="space-y-3">
	<div class={compact ? 'grid grid-cols-1 gap-4 md:grid-cols-3' : 'space-y-3'}>
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
			{#if q.hotel_preference}
				<div class="flex justify-between gap-2">
					<dt class="shrink-0 text-slate-400">Hotels</dt>
					<dd class="text-right font-medium text-slate-700">{q.hotel_preference}</dd>
				</div>
			{/if}
			{#if q.customer_plan}
				<div class="flex justify-between gap-2">
					<dt class="shrink-0 text-slate-400">Plan</dt>
					<dd class="text-right font-medium text-slate-700">{q.customer_plan}</dd>
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
				{@const s = styleFor(u.kind)}
				<li class="flex items-start gap-2 text-sm">
					<s.icon class="mt-0.5 h-3.5 w-3.5 shrink-0 {s.tone}" />
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

	<!-- Response & notes: the live working basis, editable in place on any stage. -->
	<section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<div class="mb-2 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<NotebookPen class="h-4 w-4 text-slate-400" />
				<h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Response &amp; notes</h2>
			</div>
			{#if !editingNotes}
				<button type="button" onclick={startNotes} class="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
					<Pencil class="h-3 w-3" /> Edit
				</button>
			{/if}
		</div>
		{#if editingNotes}
			<textarea
				bind:value={notesDraft}
				rows="3"
				placeholder="What we told the client, hotels offered, running conversation notes…"
				class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
			></textarea>
			<div class="mt-2 flex justify-end gap-2">
				<button type="button" onclick={() => (editingNotes = false)} class="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
					Cancel
				</button>
				<button type="button" onclick={saveNotes} disabled={$update.isPending} class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
					{$update.isPending ? 'Saving…' : 'Save'}
				</button>
			</div>
		{:else if q.response_text}
			<p class="whitespace-pre-wrap text-sm text-slate-700">{q.response_text}</p>
		{:else}
			<button type="button" onclick={startNotes} class="text-sm italic text-slate-400 hover:text-slate-600">
				Add the response / notes…
			</button>
		{/if}
	</section>
</div>
