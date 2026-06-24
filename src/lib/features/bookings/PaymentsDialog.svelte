<script lang="ts">
	import { Modal } from '$ui';
	import BookingLifecyclePanel from './BookingLifecyclePanel.svelte';

	// Payments live behind a button (like Documents): a popup to record payments,
	// set a discount, and see/override the booking's payment + check-in status.
	let {
		queryId,
		open,
		onClose,
		title = 'Payments'
	}: { queryId: string; open: boolean; onClose: () => void; title?: string } = $props();
</script>

<Modal {open} {onClose} {title} class="max-w-2xl">
	<BookingLifecyclePanel {queryId} embedded />
</Modal>
