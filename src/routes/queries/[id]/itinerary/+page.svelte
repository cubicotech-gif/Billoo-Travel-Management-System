<script lang="ts">
	import { page } from '$app/stores';
	import PrintDoc from '$features/documents/PrintDoc.svelte';

	const id = $derived($page.params.id ?? '');
</script>

{#key id}
	<PrintDoc queryId={id} kind="itinerary" />
{/key}
