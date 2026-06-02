<script lang="ts">
	import { page } from '$app/stores';
	import QueryDetail from '$features/queries/QueryDetail.svelte';

	const id = $derived($page.params.id ?? '');
</script>

<!-- Key on id so navigating between two queries remounts with fresh hooks. -->
{#key id}
	<QueryDetail {id} />
{/key}
