<script lang="ts">
	import { MessageCircle } from 'lucide-svelte';
	import { waLink } from '$lib/whatsapp';

	interface Props {
		number: string | null | undefined;
		/** Optional pre-filled message. */
		text?: string;
		/** Override the visible label (defaults to the number). */
		label?: string;
		class?: string;
	}

	let { number, text, label, class: klass = '' }: Props = $props();

	const href = $derived(waLink(number ?? '', text));
</script>

{#if href}
	<a
		{href}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline {klass}"
		title="Chat on WhatsApp"
	>
		<MessageCircle class="h-4 w-4" />
		{label ?? number}
	</a>
{:else}
	<span class="text-slate-400 {klass}">{label ?? number ?? '—'}</span>
{/if}
