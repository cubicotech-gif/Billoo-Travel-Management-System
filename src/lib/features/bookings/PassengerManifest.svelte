<script lang="ts">
	import { untrack } from 'svelte';
	import { Users, Check } from 'lucide-svelte';
	import { Button } from '$ui';
	import { useQueryDetail, useUpdateQuery } from '$features/queries/queries';
	import type { PassengerName } from '$lib/database.types';

	let { queryId }: { queryId: string } = $props();

	const query = untrack(() => useQueryDetail(queryId));
	const update = untrack(() => useUpdateQuery());

	// Manifest is edited as plain text — one traveller per line, e.g.
	//   Ahmed Ali
	//   Fatima Khan, AB1234567
	// The optional bit after the comma is the passport number.
	let text = $state('');
	let seeded = false;
	$effect(() => {
		const q = $query.data;
		if (q && !seeded) {
			seeded = true;
			text = manifestToText(q.passenger_manifest ?? []);
		}
	});

	function manifestToText(rows: PassengerName[]): string {
		return rows.map((r) => (r.passport ? `${r.name}, ${r.passport}` : r.name)).join('\n');
	}

	// Each non-empty line → { name, passport }. A trailing "..., PASSPORT" splits
	// on the last comma so names with commas still read sensibly.
	function parse(raw: string): PassengerName[] {
		return raw
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean)
			.map((line) => {
				const i = line.lastIndexOf(',');
				if (i === -1) return { name: line, passport: null };
				const name = line.slice(0, i).trim();
				const passport = line.slice(i + 1).trim();
				return { name: name || line, passport: passport || null };
			});
	}

	const parsed = $derived(parse(text));
	const expected = $derived(
		($query.data?.adults ?? 0) + ($query.data?.children ?? 0) + ($query.data?.infants ?? 0)
	);

	let savedAt = $state(0);
	$effect(() => {
		if (!savedAt) return;
		const t = setTimeout(() => (savedAt = 0), 2500);
		return () => clearTimeout(t);
	});

	function save() {
		$update.mutate(
			{ id: queryId, patch: { passenger_manifest: parse(text) } },
			{ onSuccess: () => (savedAt = Date.now()) }
		);
	}
</script>

<div class="rounded-xl border border-slate-200 bg-white p-4">
	<div class="mb-2 flex items-center gap-2">
		<Users class="h-4 w-4 text-brand-500" />
		<h3 class="text-sm font-semibold text-slate-700">Passenger names</h3>
		<span
			class="ml-auto text-xs {expected && parsed.length !== expected
				? 'text-amber-600'
				: 'text-slate-400'}"
		>
			{parsed.length}{expected ? ` / ${expected}` : ''} entered
		</span>
	</div>
	<p class="mb-2 text-xs text-slate-400">
		One passenger per line. Add the passport after a comma if you have it — e.g.
		<span class="font-mono text-slate-500">Fatima Khan, AB1234567</span>. These names print on the
		itinerary.
	</p>
	<textarea
		bind:value={text}
		rows={Math.max(4, parsed.length + 1)}
		placeholder={'Ahmed Ali\nFatima Khan, AB1234567'}
		class="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 font-mono text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
	></textarea>
	<div class="mt-2 flex items-center gap-3">
		<Button size="sm" disabled={$update.isPending} onclick={save}>
			<Check class="h-4 w-4" />
			{$update.isPending ? 'Saving…' : 'Save names'}
		</Button>
		{#if savedAt}<span class="text-xs font-medium text-green-600">Saved</span>{/if}
		{#if expected && parsed.length !== expected}
			<span class="text-xs text-amber-600">
				Heads up: {expected} traveller{expected === 1 ? '' : 's'} on this query.
			</span>
		{/if}
	</div>
</div>
