<script lang="ts">
	import { page } from '$app/stores';
	import PrintDoc from '$features/documents/PrintDoc.svelte';
	import DocByPackage from '$features/hajj/DocByPackage.svelte';
	import HajjBookingDoc from '$features/hajj/HajjBookingDoc.svelte';

	const id = $derived($page.params.id ?? '');
</script>

{#key id}
	<DocByPackage queryId={id}>
		{#snippet hajj()}<HajjBookingDoc queryId={id} kind="voucher" />{/snippet}
		{#snippet regular()}<PrintDoc queryId={id} kind="voucher" />{/snippet}
	</DocByPackage>
{/key}
