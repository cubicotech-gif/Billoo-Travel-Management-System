<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { useQueryDetail } from '$features/queries/queries';

	// Picks the Hajj version of a client document for Hajj queries and the
	// regular one for everything else. Mount per query id (inside {#key}).
	let {
		queryId,
		hajj,
		regular
	}: { queryId: string; hajj: Snippet; regular: Snippet } = $props();

	const query = untrack(() => useQueryDetail(queryId));
</script>

{#if $query.isError}
	<p class="text-red-600">Failed to load: {$query.error.message}</p>
{:else if !$query.data}
	<p class="text-slate-400">Loading…</p>
{:else if $query.data.package_type === 'Hajj'}
	{@render hajj()}
{:else}
	{@render regular()}
{/if}
