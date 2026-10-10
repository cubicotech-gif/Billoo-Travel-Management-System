<script lang="ts">
	import { page } from '$app/stores';
	import InvoiceDoc from '$features/documents/InvoiceDoc.svelte';
	import DocByPackage from '$features/hajj/DocByPackage.svelte';
	import HajjInvoiceDoc from '$features/hajj/HajjInvoiceDoc.svelte';

	const id = $derived($page.params.id ?? '');
</script>

{#key id}
	<DocByPackage queryId={id}>
		{#snippet hajj()}<HajjInvoiceDoc queryId={id} />{/snippet}
		{#snippet regular()}<InvoiceDoc queryId={id} />{/snippet}
	</DocByPackage>
{/key}
