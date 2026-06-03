<script lang="ts">
	import { untrack } from 'svelte';
	import { Copy, Check, Pencil, Trash2, Save } from 'lucide-svelte';
	import { Badge, Button, Input, Modal } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useUpdateQuotation, useRemoveQuotation } from './queries';
	import { QUOTATION_STATUS_TONE, type Quotation } from './types';

	let {
		quotation,
		queryId,
		onClose
	}: { quotation: Quotation | null; queryId: string; onClose: () => void } = $props();

	const update = untrack(() => useUpdateQuotation(queryId));
	const remove = untrack(() => useRemoveQuotation(queryId));

	let editing = $state(false);
	let text = $state('');
	let label = $state('');
	let copied = $state(false);

	// Seed editable fields whenever a different quotation opens.
	$effect(() => {
		const q = quotation;
		if (q) untrack(() => {
			text = q.whatsapp_text ?? '';
			label = q.label ?? '';
			editing = false;
		});
	});

	async function copy() {
		await navigator.clipboard.writeText(quotation?.whatsapp_text ?? text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	async function saveEdit() {
		if (!quotation) return;
		await $update.mutateAsync({ id: quotation.id, patch: { whatsapp_text: text, label: label || null } });
		editing = false;
		onClose();
	}

	function del() {
		if (quotation && confirm('Delete this quotation?')) {
			$remove.mutate(quotation);
			onClose();
		}
	}
</script>

<Modal open={quotation !== null} {onClose} title={quotation ? `Quotation v${quotation.version}` : ''}>
	{#if quotation}
		<div class="mb-3 flex flex-wrap items-center gap-3 text-sm">
			{#if quotation.label}<Badge tone="info">{quotation.label}</Badge>{/if}
			<Badge tone={QUOTATION_STATUS_TONE[quotation.status]}>{quotation.status}</Badge>
			<span class="text-slate-700">{formatAmount(Number(quotation.total_sell_pkr), 'PKR')}</span>
			{#if Number(quotation.per_person_pkr) > 0}
				<span class="text-slate-400">{formatAmount(Number(quotation.per_person_pkr), 'PKR')}/pp</span>
			{/if}
		</div>

		{#if editing}
			<div class="mb-3 w-48">
				<Input label="Label (tier)" bind:value={label} />
			</div>
			<textarea
				bind:value={text}
				rows="14"
				class="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
			></textarea>
		{:else}
			<pre class="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{quotation.whatsapp_text ?? '(no message saved)'}</pre>
		{/if}

		<div class="mt-4 flex flex-wrap gap-2">
			{#if editing}
				<Button size="sm" onclick={saveEdit} disabled={$update.isPending}><Save class="h-4 w-4" /> Save</Button>
				<Button size="sm" variant="secondary" onclick={() => (editing = false)}>Cancel</Button>
			{:else}
				<Button size="sm" variant="secondary" onclick={copy}>
					{#if copied}<Check class="h-4 w-4" /> Copied{:else}<Copy class="h-4 w-4" /> Copy{/if}
				</Button>
				<Button size="sm" variant="secondary" onclick={() => (editing = true)}><Pencil class="h-4 w-4" /> Edit</Button>
				<button onclick={del} class="ml-auto rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
					<Trash2 class="h-4 w-4" />
				</button>
			{/if}
		</div>
	{/if}
</Modal>
