<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from 'lucide-svelte';

	interface Props {
		open: boolean;
		title: string;
		onClose: () => void;
		/** Width class for the panel (default max-w-lg). Ignored when fullScreen. */
		class?: string;
		/** Edge-to-edge panel — room for dense content like the quote builder. */
		fullScreen?: boolean;
		children: Snippet;
	}

	let {
		open,
		title,
		onClose,
		class: klass = 'max-w-lg',
		fullScreen = false,
		children
	}: Props = $props();

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
	<!-- Phones: a bottom sheet; sm+: a centred dialog. -->
	<div class="fixed inset-0 z-50 flex {fullScreen ? 'items-center justify-center p-0' : 'items-end justify-center sm:items-center sm:p-4'}">
		<button
			class="absolute inset-0 bg-slate-900/40"
			aria-label="Close"
			onclick={onClose}
			tabindex="-1"
		></button>
		<div
			class="relative z-10 w-full overflow-y-auto overscroll-contain bg-white shadow-xl {fullScreen
				? 'h-[100dvh] max-w-none rounded-none'
				: `max-h-[92dvh] rounded-t-2xl sm:max-h-[90vh] sm:rounded-xl ${klass}`}"
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-5 {fullScreen
					? 'pt-[calc(env(safe-area-inset-top)+0.75rem)]'
					: ''}"
			>
				<h2 class="min-w-0 truncate text-sm font-semibold text-slate-700">{title}</h2>
				<button onclick={onClose} class="-mr-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 sm:p-1" aria-label="Close">
					<X class="h-5 w-5 sm:h-4 sm:w-4" />
				</button>
			</div>
			<div class="p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:p-5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
