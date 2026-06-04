<script lang="ts">
	import { untrack } from 'svelte';
	import { Copy, Check, Pencil, Trash2 } from 'lucide-svelte';
	import { Badge, Button, Modal } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useRemoveQuotation } from './queries';
	import { QUOTATION_STATUS_TONE, type Quotation } from './types';

	let {
		quotation,
		queryId,
		onClose
	}: { quotation: Quotation | null; queryId: string; onClose: () => void } = $props();

	const remove = untrack(() => useRemoveQuotation(queryId));

	let copied = $state(false);
	async function copy() {
		await navigator.clipboard.writeText(quotation?.whatsapp_text ?? '');
		copied = true;
		setTimeout(() => (copied = false), 1500);
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

		<pre class="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{quotation.whatsapp_text ?? '(no message saved)'}</pre>

		<div class="mt-4 flex flex-wrap gap-2">
			<Button size="sm" variant="secondary" onclick={copy}>
				{#if copied}<Check class="h-4 w-4" /> Copied{:else}<Copy class="h-4 w-4" /> Copy{/if}
			</Button>
			<!-- Edit reopens the full priced quote in the builder; saving there
			     creates a new version (history preserved). -->
			<Button size="sm" variant="secondary" href="/queries/{queryId}/quote?edit={quotation.id}">
				<Pencil class="h-4 w-4" /> Edit
			</Button>
			<button onclick={del} class="ml-auto rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
				<Trash2 class="h-4 w-4" />
			</button>
		</div>
	{/if}
</Modal>
