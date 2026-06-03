<script lang="ts">
	import { untrack } from 'svelte';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { fromISO, toISO } from './dates';

	interface Props {
		start?: string;
		end?: string;
		/** Fired after any change so the parent can re-sync nights. */
		onChange?: () => void;
	}

	let { start = $bindable(''), end = $bindable(''), onChange }: Props = $props();

	// Month currently shown; seeded from the start date or today.
	let view = $state(untrack(() => (start ? fromISO(start) : new Date())));

	const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

	const monthLabel = $derived(
		view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
	);

	// Cells for the visible month: leading blanks + each day's ISO.
	const cells = $derived.by(() => {
		const year = view.getFullYear();
		const month = view.getMonth();
		const first = new Date(year, month, 1).getDay();
		const days = new Date(year, month + 1, 0).getDate();
		const out: (string | null)[] = [];
		for (let i = 0; i < first; i++) out.push(null);
		for (let d = 1; d <= days; d++) out.push(toISO(new Date(year, month, d)));
		return out;
	});

	function pick(iso: string) {
		if (!start || (start && end)) {
			start = iso;
			end = '';
		} else if (iso < start) {
			start = iso;
		} else {
			end = iso;
		}
		onChange?.();
	}

	function shift(months: number) {
		view = new Date(view.getFullYear(), view.getMonth() + months, 1);
	}

	function cls(iso: string): string {
		if (iso === start || iso === end) return 'bg-brand-600 text-white';
		if (start && end && iso > start && iso < end) return 'bg-brand-100 text-brand-700';
		return 'hover:bg-slate-100 text-slate-600';
	}
</script>

<div class="rounded-lg border border-slate-200 p-2">
	<div class="mb-1 flex items-center justify-between px-1">
		<button type="button" onclick={() => shift(-1)} class="rounded p-1 hover:bg-slate-100" aria-label="Previous month">
			<ChevronLeft class="h-4 w-4 text-slate-500" />
		</button>
		<span class="text-sm font-medium text-slate-700">{monthLabel}</span>
		<button type="button" onclick={() => shift(1)} class="rounded p-1 hover:bg-slate-100" aria-label="Next month">
			<ChevronRight class="h-4 w-4 text-slate-500" />
		</button>
	</div>
	<div class="grid grid-cols-7 gap-0.5 text-center">
		{#each WEEKDAYS as w (w)}
			<div class="py-1 text-[10px] font-medium uppercase text-slate-400">{w}</div>
		{/each}
		{#each cells as iso, i (i)}
			{#if iso}
				<button type="button" onclick={() => pick(iso)} class="rounded py-1 text-xs {cls(iso)}">
					{Number(iso.slice(8, 10))}
				</button>
			{:else}
				<div></div>
			{/if}
		{/each}
	</div>
	{#if start}
		<p class="mt-1 px-1 text-[11px] text-slate-400">
			{start}{end ? ` → ${end}` : ' → pick check-out'}
		</p>
	{/if}
</div>
