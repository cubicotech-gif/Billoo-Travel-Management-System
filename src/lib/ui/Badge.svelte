<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

	interface Props {
		tone?: Tone;
		children: Snippet;
	}

	let { tone = 'neutral', children }: Props = $props();

	const tones: Record<Tone, string> = {
		neutral: 'bg-slate-100 text-slate-700',
		info: 'bg-brand-100 text-brand-700',
		success: 'bg-green-100 text-green-700',
		warning: 'bg-amber-100 text-amber-700',
		danger: 'bg-red-100 text-red-700'
	};
</script>

<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {tones[tone]}">
	{@render children()}
</span>
