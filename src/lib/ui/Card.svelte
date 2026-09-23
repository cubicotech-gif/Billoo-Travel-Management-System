<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		class?: string;
		children: Snippet;
	}

	let { title, class: klass = '', children }: Props = $props();
</script>

<div class="rounded-xl border border-slate-200 bg-white shadow-sm {klass}">
	{#if title}
		<div class="border-b border-slate-100 px-4 py-3 sm:px-5">
			<h3 class="text-sm font-semibold text-slate-700">{title}</h3>
		</div>
	{/if}
	<div class="p-4 sm:p-5">
		{@render children()}
	</div>
</div>
