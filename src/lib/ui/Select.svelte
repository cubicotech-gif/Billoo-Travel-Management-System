<script lang="ts">
	interface Props {
		label?: string;
		value: string;
		options: readonly string[] | { value: string; label: string }[];
		class?: string;
	}

	let { label, value = $bindable(), options, class: klass = '' }: Props = $props();

	const normalized = $derived(
		options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
	);
</script>

<label class="block">
	{#if label}
		<span class="mb-1 block text-sm font-medium text-slate-700">{label}</span>
	{/if}
	<select
		bind:value
		class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 {klass}"
	>
		{#each normalized as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
</label>
