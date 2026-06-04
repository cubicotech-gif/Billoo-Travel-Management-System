<script lang="ts">
	import { page } from '$app/stores';
	import QuoteBuilder from '$features/quotations/QuoteBuilder.svelte';

	const id = $derived($page.params.id ?? '');
	const editId = $derived($page.url.searchParams.get('edit') ?? undefined);
</script>

<!-- Key on id + edit target so reopening a different quote remounts cleanly. -->
{#key `${id}:${editId ?? ''}`}
	<QuoteBuilder queryId={id} {editId} />
{/key}
