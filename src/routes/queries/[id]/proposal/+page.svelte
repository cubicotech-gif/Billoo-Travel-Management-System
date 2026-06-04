<script lang="ts">
	import { page } from '$app/stores';
	import ProposalDoc from '$features/quotations/ProposalDoc.svelte';

	const id = $derived($page.params.id ?? '');
</script>

{#key id}
	<ProposalDoc queryId={id} />
{/key}
