<script lang="ts">
	import { untrack } from 'svelte';
	import {
		Package,
		History,
		MessagesSquare,
		ArrowRight,
		FileText,
		PackageCheck,
		Wallet,
		Dot,
		Plus,
		Send
	} from 'lucide-svelte';
	import { formatAmount } from '$lib/money';
	import { auth } from '$lib/stores/auth.svelte';
	import { daysSince } from './workflow';
	import { useReplies, useActivity, useAddReply } from './queries';
	import type { ActivityKind } from './activity';
	import type { Quotation } from '$features/quotations/types';
	import type { Query } from './types';

	// The live working basis shown on every stage: the captured package, the system
	// timeline, and the dated conversation/notes record. `compact` lays the three
	// boxes out as a horizontal strip (the workspace cover).
	let { query: q, latest, compact = false }: { query: Query; latest: Quotation | null; compact?: boolean } =
		$props();

	const replies = untrack(() => useReplies(q.id));
	const activity = untrack(() => useActivity(q.id));
	const addReply = untrack(() => useAddReply(q.id));

	const pax = $derived(
		`${q.adults}A${q.children ? ` · ${q.children}C` : ''}${q.infants ? ` · ${q.infants}I` : ''}`
	);
	const priced = $derived(Number(q.selling_price) > 0);

	// --- Recent updates (activity log) ---------------------------------------
	interface Update {
		label: string;
		when: string;
		kind?: ActivityKind;
	}
	const kindStyle: Record<ActivityKind, { icon: typeof Dot; tone: string }> = {
		stage: { icon: ArrowRight, tone: 'text-brand-500' },
		quote: { icon: FileText, tone: 'text-indigo-500' },
		message: { icon: MessagesSquare, tone: 'text-slate-400' },
		booking: { icon: PackageCheck, tone: 'text-green-500' },
		payment: { icon: Wallet, tone: 'text-amber-500' },
		note: { icon: Dot, tone: 'text-slate-400' }
	};
	const styleFor = (k?: ActivityKind) => kindStyle[k ?? 'note'];

	const updates = $derived.by((): Update[] => {
		const logged = $activity.data ?? [];
		if (logged.length) {
			return logged.map((a) => ({ label: a.summary, when: a.created_at, kind: a.kind as ActivityKind }));
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
		return list.filter((u) => u.when).sort((a, b) => +new Date(b.when) - +new Date(a.when));
	});

	// --- Conversation & notes (dated record) ---------------------------------
	// One thread: our notes/responses + the client's messages, each dated. The
	// intake "Response given" seeds it as the first entry; new notes append here
	// (and show up in the Quoted chat too — same query_replies).
	type Who = 'us' | 'client' | 'intake';
	interface Entry {
		id: string;
		who: Who;
		body: string;
		when: string;
	}
	const record = $derived.by((): Entry[] => {
		const entries: Entry[] = ($replies.data ?? []).map((r) => ({
			id: r.id,
			who: r.sender as Who,
			body: r.body,
			when: r.created_at
		}));
		if (q.response_text) entries.push({ id: 'intake', who: 'intake', body: q.response_text, when: q.created_at });
		return entries.sort((a, b) => +new Date(b.when) - +new Date(a.when));
	});
	const whoLabel: Record<Who, string> = { us: 'Us', client: 'Client', intake: 'Intake' };
	const whoTone: Record<Who, string> = {
		us: 'text-brand-600',
		client: 'text-green-600',
		intake: 'text-slate-400'
	};

	let adding = $state(false);
	let draft = $state('');
	let noteError = $state<string | null>(null);
	function addNote() {
		const body = draft.trim();
		if (!body) return;
		noteError = null;
		$addReply.mutate(
			{ query_id: q.id, body, sender: 'us', author: auth.user?.email ?? null },
			{
				onSuccess: () => {
					draft = '';
					adding = false;
				},
				onError: (e) => (noteError = e instanceof Error ? e.message : 'Could not save — try again.')
			}
		);
	}

	function fmtDateTime(iso: string): string {
		return new Date(iso).toLocaleString(undefined, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	function fmtRel(iso: string): string {
		const d = daysSince(iso);
		return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`;
	}
</script>

<div class={compact ? 'grid grid-cols-1 gap-3 md:grid-cols-3' : 'space-y-3'}>
	<!-- Package details -->
	<section class="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
		<div class="mb-2 flex items-center gap-2">
			<Package class="h-3.5 w-3.5 text-slate-400" />
			<h2 class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Package details</h2>
		</div>
		<dl class="space-y-1 text-xs">
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
					<dd class="text-right font-medium text-slate-700">{fmtRel(q.travel_date)}</dd>
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
			<div class="flex justify-between gap-2">
				<dt class="text-slate-400">Owner</dt>
				<dd class="text-right font-medium text-slate-700">{q.created_by_staff ?? '—'}</dd>
			</div>
		</dl>

		{#if priced}
			<div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs">
				<div class="flex justify-between"><span class="text-slate-400">Sell</span><span class="font-semibold text-slate-700">{formatAmount(Number(q.selling_price))}</span></div>
				<div class="flex justify-between"><span class="text-slate-400">Cost</span><span class="font-semibold text-slate-700">{formatAmount(Number(q.cost_price))}</span></div>
				<div class="flex justify-between"><span class="text-slate-400">Profit</span><span class="font-semibold text-green-600">{formatAmount(Number(q.profit))}</span></div>
				<div class="flex justify-between"><span class="text-slate-400">Margin</span><span class="font-semibold text-slate-700">{Number(q.profit_margin).toFixed(1)}%</span></div>
			</div>
		{/if}
	</section>

	<!-- Recent updates (activity log) -->
	<section class="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
		<div class="mb-2 flex items-center gap-2">
			<History class="h-3.5 w-3.5 text-slate-400" />
			<h2 class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recent updates</h2>
		</div>
		<ul class="max-h-40 space-y-1.5 overflow-y-auto pr-1">
			{#each updates as u (u.label + u.when)}
				{@const s = styleFor(u.kind)}
				<li class="flex items-start gap-2 text-xs">
					<s.icon class="mt-0.5 h-3.5 w-3.5 shrink-0 {s.tone}" />
					<span class="flex-1 text-slate-600">{u.label}</span>
					<span class="shrink-0 text-[10px] text-slate-400">{fmtRel(u.when)}</span>
				</li>
			{/each}
		</ul>
	</section>

	<!-- Conversation & notes (dated record) -->
	<section class="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
		<div class="mb-2 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<MessagesSquare class="h-3.5 w-3.5 text-slate-400" />
				<h2 class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Conversation &amp; notes</h2>
			</div>
			{#if !adding}
				<button type="button" onclick={() => (adding = true)} class="inline-flex items-center gap-0.5 text-[11px] font-medium text-brand-600 hover:text-brand-700">
					<Plus class="h-3 w-3" /> Add
				</button>
			{/if}
		</div>

		{#if adding}
			<div class="mb-2">
				{#if noteError}
					<p class="mb-1 rounded bg-red-50 px-2 py-1 text-[11px] text-red-600">{noteError}</p>
				{/if}
				<textarea
					bind:value={draft}
					rows="2"
					placeholder="Log a response or note…"
					class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
				></textarea>
				<div class="mt-1 flex justify-end gap-1.5">
					<button type="button" onclick={() => { adding = false; draft = ''; }} class="rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100">Cancel</button>
					<button type="button" onclick={addNote} disabled={!draft.trim() || $addReply.isPending} class="inline-flex items-center gap-1 rounded bg-brand-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-700 disabled:opacity-50">
						<Send class="h-3 w-3" /> Save
					</button>
				</div>
			</div>
		{/if}

		{#if record.length === 0}
			<p class="text-xs text-slate-400">No notes yet — add the client's requirements or what you told them.</p>
		{:else}
			<ul class="max-h-40 space-y-1.5 overflow-y-auto pr-1">
				{#each record as e (e.id)}
					<li class="rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
						<div class="mb-0.5 flex items-center justify-between gap-2">
							<span class="font-semibold {whoTone[e.who]}">{whoLabel[e.who]}</span>
							<span class="text-[10px] text-slate-400">{fmtDateTime(e.when)}</span>
						</div>
						<p class="whitespace-pre-wrap text-slate-700">{e.body}</p>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
