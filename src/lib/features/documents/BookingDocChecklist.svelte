<script lang="ts">
	import { untrack } from 'svelte';
	import { CheckCircle2, Circle } from 'lucide-svelte';
	import { Card, Badge } from '$ui';
	import { useDocuments } from './queries';
	import { documentChecklist, readinessSummary } from './checklist';
	import type { DocumentType } from '$lib/database.types';

	// Pulls from both the query (trip docs) and passenger (identity vault) so the
	// readiness picture is complete.
	let { queryId, passengerId }: { queryId: string; passengerId: string | null } = $props();

	const queryDocs = untrack(() => useDocuments('query', queryId));
	const passengerDocs = $derived(passengerId ? useDocuments('passenger', passengerId) : null);

	const presentTypes = $derived<DocumentType[]>([
		...($queryDocs.data ?? []).map((d) => d.document_type),
		...($passengerDocs ? ($passengerDocs.data ?? []).map((d) => d.document_type) : [])
	]);

	const items = $derived(documentChecklist(presentTypes));
	const summary = $derived(readinessSummary(items));
</script>

<Card title="Booking readiness">
	<div class="mb-3 flex items-center gap-2 text-sm">
		{#if summary.complete}
			<Badge tone="success">All documents collected</Badge>
		{:else}
			<Badge tone="warning">{summary.done}/{summary.total} documents</Badge>
			<span class="text-slate-500">Missing: {summary.missing.join(', ')}</span>
		{/if}
	</div>

	<ul class="grid grid-cols-2 gap-1.5 text-sm sm:grid-cols-4">
		{#each items as item (item.type)}
			<li class="flex items-center gap-2 {item.done ? 'text-slate-700' : 'text-slate-400'}">
				{#if item.done}
					<CheckCircle2 class="h-4 w-4 text-green-600" />
				{:else}
					<Circle class="h-4 w-4" />
				{/if}
				{item.label}
			</li>
		{/each}
	</ul>
</Card>
