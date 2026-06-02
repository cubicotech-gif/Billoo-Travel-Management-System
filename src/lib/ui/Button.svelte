<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'lg';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		size?: Size;
		children: Snippet;
	}

	let { variant = 'primary', size = 'md', children, class: klass = '', ...rest }: Props = $props();

	const variants: Record<Variant, string> = {
		primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500',
		secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-brand-500',
		ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-brand-500',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
	};

	const sizes: Record<Size, string> = {
		sm: 'px-2.5 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-5 py-2.5 text-base'
	};
</script>

<button
	class="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 {variants[
		variant
	]} {sizes[size]} {klass}"
	{...rest}
>
	{@render children()}
</button>
