<script lang="ts">
	import { page } from '$app/stores';
	import HajjProposalDoc from '$features/hajj/HajjProposalDoc.svelte';

	const id = $derived($page.params.id ?? '');
</script>

{#key id}
	<HajjProposalDoc queryId={id} />
{/key}
