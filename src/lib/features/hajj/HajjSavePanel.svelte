<script lang="ts">
	import { untrack } from 'svelte';
	import { Bookmark, Check } from 'lucide-svelte';
	import { Button, Card } from '$ui';
	import type { Query } from '$features/queries/types';
	import type { QuoteData } from './quote';
	import { useSaveHajjProposal } from './queries';
	import { proposalRow } from './snapshot';

	// Freezes the builder's working copy as a labelled option — the Hajj
	// counterpart of saving an Umrah quotation tier. Save moves a New Query /
	// Working query on to Quoted; "Save & add another" stays here to build the next.
	let {
		query,
		data,
		usdRate
	}: { query: Query; data: QuoteData; usdRate: number | null } = $props();

	const save = untrack(() => useSaveHajjProposal(query.id));

	const inSevenDays = () => {
		const d = new Date();
		d.setDate(d.getDate() + 7);
		return d.toISOString().slice(0, 10);
	};

	let label = $state('');
	let validUntil = $state(inSevenDays());
	let error = $state('');
	let savedNote = $state('');

	const canSave = $derived(data.travellers.length > 0);

	async function submit(addAnother: boolean) {
		error = '';
		savedNote = '';
		try {
			const input = proposalRow(query.id, data, usdRate, {
				label,
				validUntil: validUntil || null
			});
			await $save.mutateAsync({
				input,
				advance: !addAnother,
				currentStatus: query.status
			});
			savedNote = label.trim() ? `Saved “${label.trim()}”` : 'Saved';
			label = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save the proposal';
		}
	}
</script>

<Card title="Save as proposal">
	<div class="space-y-3 text-sm" data-testid="hajj-save-panel">
		<p class="text-xs text-slate-500">
			Freeze this package as an option for the client. Change it and save again to offer
			alternatives (e.g. Economy / Premium).
		</p>
		<label class="block">
			<span class="mb-1 block text-xs font-medium text-slate-600">Option name</span>
			<input
				bind:value={label}
				placeholder="e.g. Economy, Intercon 14 days"
				class="w-full rounded-lg border border-slate-300 px-3 py-1.5"
				data-testid="hajj-save-label"
			/>
		</label>
		<label class="block">
			<span class="mb-1 block text-xs font-medium text-slate-600">Valid until</span>
			<input
				type="date"
				bind:value={validUntil}
				class="w-full rounded-lg border border-slate-300 px-3 py-1.5"
			/>
		</label>
		{#if error}<p class="text-xs text-red-600">{error}</p>{/if}
		{#if savedNote}
			<p class="flex items-center gap-1 text-xs text-green-700"><Check class="h-3.5 w-3.5" /> {savedNote}</p>
		{/if}
		<div class="flex flex-wrap gap-2">
			<Button size="sm" onclick={() => submit(false)} disabled={!canSave || $save.isPending}>
				<Bookmark class="h-4 w-4" /> Save proposal
			</Button>
			<Button
				size="sm"
				variant="secondary"
				onclick={() => submit(true)}
				disabled={!canSave || $save.isPending}
			>
				Save &amp; add another
			</Button>
		</div>
		{#if query.status === 'New Query' || query.status === 'Working'}
			<p class="text-[11px] text-slate-400">
				“Save proposal” moves the query to <b>Quoted</b>; “Save &amp; add another” keeps it in Working.
			</p>
		{/if}
	</div>
</Card>
