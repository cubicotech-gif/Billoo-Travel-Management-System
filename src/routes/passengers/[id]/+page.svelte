<script lang="ts">
	import { page } from '$app/stores';
	import PassengerProfile from '$features/passengers/PassengerProfile.svelte';

	const id = $derived($page.params.id ?? '');
</script>

{#key id}
	<PassengerProfile {id} />
{/key}
