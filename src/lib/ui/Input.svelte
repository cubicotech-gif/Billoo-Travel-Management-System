<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
		value: string | number;
	}

	let { label, value = $bindable(), class: klass = '', ...rest }: Props = $props();
</script>

<label class="block">
	{#if label}
		<span class="mb-1 block text-sm font-medium text-slate-700">{label}</span>
	{/if}
	<input
		bind:value
		class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 {klass}"
		{...rest}
	/>
</label>
