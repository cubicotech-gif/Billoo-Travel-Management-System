<script lang="ts">
	import { page } from '$app/stores';
	import ReceiptDoc from '$features/payments/ReceiptDoc.svelte';

	const id = $derived($page.params.id ?? '');
	const pid = $derived($page.params.pid ?? '');
</script>

{#key `${id}:${pid}`}
	<ReceiptDoc queryId={id} paymentId={pid} />
{/key}
