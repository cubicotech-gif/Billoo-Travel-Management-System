<script lang="ts">
	import { page } from '$app/stores';
	import QuoteBuilder from '$features/quotations/QuoteBuilder.svelte';

	const id = $derived($page.params.id ?? '');
</script>

{#key id}
	<QuoteBuilder queryId={id} />
{/key}
