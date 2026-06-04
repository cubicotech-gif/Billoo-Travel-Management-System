<script lang="ts">
	import { page } from '$app/stores';
	import VendorProfile from '$features/vendors/VendorProfile.svelte';

	const id = $derived($page.params.id ?? '');
</script>

{#key id}
	<VendorProfile {id} />
{/key}
