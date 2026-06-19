<script lang="ts">
	import { Modal } from '$ui';
	import QueryEditForm from './QueryEditForm.svelte';
	import type { Query } from './types';

	interface Props {
		query: Query | null;
		open: boolean;
		onClose: () => void;
	}
	let { query, open, onClose }: Props = $props();
</script>

<Modal {open} {onClose} title="Edit query" class="max-w-2xl">
	{#if query}
		<QueryEditForm {query} onSaved={onClose} onCancel={onClose} />
	{/if}
</Modal>
