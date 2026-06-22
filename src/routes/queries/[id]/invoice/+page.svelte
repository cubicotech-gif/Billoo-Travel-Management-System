<script lang="ts">
	import { page } from '$app/stores';
	import InvoiceDoc from '$features/documents/InvoiceDoc.svelte';

	const id = $derived($page.params.id ?? '');
</script>

{#key id}
	<InvoiceDoc queryId={id} />
{/key}
