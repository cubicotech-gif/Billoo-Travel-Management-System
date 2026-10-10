<script lang="ts">
	// A number input that commits on blur / Enter instead of on every keystroke,
	// so a mutation isn't fired per digit. Invalid or below-min input reverts.
	interface Props {
		value: number;
		onCommit: (n: number) => void;
		min?: number;
		step?: string;
		label?: string;
		hint?: string;
		disabled?: boolean;
		class?: string;
	}

	let {
		value,
		onCommit,
		min = 0,
		step = 'any',
		label,
		hint,
		disabled = false,
		class: klass = ''
	}: Props = $props();

	let text = $state('');
	let focused = false;

	// Follow the stored value whenever the user isn't mid-edit.
	$effect(() => {
		const v = value;
		if (!focused) text = String(v);
	});

	function commit() {
		focused = false;
		const n = Number(text);
		if (text.trim() === '' || !Number.isFinite(n) || n < min) {
			text = String(value);
			return;
		}
		if (n !== value) onCommit(n);
		else text = String(value);
	}
</script>

<label class="block {klass}">
	{#if label}
		<span class="mb-1 block text-xs font-medium text-slate-600">{label}</span>
	{/if}
	<input
		type="number"
		inputmode="decimal"
		{min}
		{step}
		{disabled}
		value={text}
		oninput={(e) => (text = e.currentTarget.value)}
		onfocus={() => (focused = true)}
		onblur={commit}
		onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
		class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
	/>
	{#if hint}
		<span class="mt-0.5 block text-[11px] text-slate-400">{hint}</span>
	{/if}
</label>
