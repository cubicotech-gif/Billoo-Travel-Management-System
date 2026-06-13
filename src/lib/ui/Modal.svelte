<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from 'lucide-svelte';

	interface Props {
		open: boolean;
		title: string;
		onClose: () => void;
		/** Width class for the panel (default max-w-lg). */
		class?: string;
		children: Snippet;
	}

	let { open, title, onClose, class: klass = 'max-w-lg', children }: Props = $props();

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			class="absolute inset-0 bg-slate-900/40"
			aria-label="Close"
			onclick={onClose}
			tabindex="-1"
		></button>
		<div class="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white shadow-xl {klass}">
			<div class="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
				<h2 class="text-sm font-semibold text-slate-700">{title}</h2>
				<button onclick={onClose} class="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
					<X class="h-4 w-4" />
				</button>
			</div>
			<div class="p-5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
