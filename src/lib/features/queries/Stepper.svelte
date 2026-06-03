<script lang="ts">
	import { Check } from 'lucide-svelte';
	import type { QueryStatus } from '$lib/database.types';
	import { MAIN_STAGES, isCancelled } from './workflow';

	let { status }: { status: QueryStatus } = $props();

	const currentIndex = $derived(MAIN_STAGES.findIndex((s) => s.status === status));
</script>

{#if isCancelled(status)}
	<div
		class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
	>
		This query is cancelled.
	</div>
{:else}
	<div class="mb-6 flex items-center">
		{#each MAIN_STAGES as stage, i (stage.status)}
			{@const done = i < currentIndex}
			{@const active = i === currentIndex}
			<div class="flex items-center {i < MAIN_STAGES.length - 1 ? 'flex-1' : ''}">
				<div class="flex flex-col items-center">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold {active
							? 'bg-brand-600 text-white ring-4 ring-brand-100'
							: done
								? 'bg-brand-600 text-white'
								: 'bg-slate-200 text-slate-500'}"
					>
						{#if done}<Check class="h-4 w-4" />{:else}{i + 1}{/if}
					</div>
					<span
						class="mt-1 text-[11px] font-medium {active ? 'text-brand-700' : 'text-slate-400'}"
					>
						{stage.label}
					</span>
				</div>
				{#if i < MAIN_STAGES.length - 1}
					<div class="mx-1 mb-5 h-0.5 flex-1 {done ? 'bg-brand-500' : 'bg-slate-200'}"></div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
