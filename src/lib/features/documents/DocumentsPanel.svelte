<script lang="ts">
	import { untrack } from 'svelte';
	import { Upload, FileText, ExternalLink, Trash2 } from 'lucide-svelte';
	import { Badge, Button, Select } from '$ui';
	import { useDocuments, useUploadDocument, useDeleteDocument } from './queries';
	import { DOCUMENT_TYPES, signedUrl, type Document, type DocumentEntity } from './api';

	let {
		entityType,
		entityId,
		title = 'Documents'
	}: { entityType: DocumentEntity; entityId: string; title?: string } = $props();

	const docs = untrack(() => useDocuments(entityType, entityId));
	const upload = untrack(() => useUploadDocument(entityType, entityId));
	const remove = untrack(() => useDeleteDocument(entityType, entityId));

	let docType = $state<string>('passport');
	let fileInput = $state<HTMLInputElement>();

	async function onFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		await $upload.mutateAsync({
			file,
			entityType,
			entityId,
			documentType: docType as Document['document_type']
		});
		if (fileInput) fileInput.value = '';
	}

	async function view(doc: Document) {
		const url = await signedUrl(doc.file_url);
		window.open(url, '_blank');
	}

	function sizeKb(bytes: number | null): string {
		return bytes ? `${Math.max(1, Math.round(bytes / 1024))} KB` : '';
	}
</script>

<div class="mb-3 flex items-center justify-between">
	<h2 class="text-lg font-semibold text-slate-800">{title}</h2>
	<div class="flex items-end gap-2">
		<div class="w-40"><Select bind:value={docType} options={[...DOCUMENT_TYPES]} /></div>
		<input bind:this={fileInput} type="file" onchange={onFile} class="hidden" />
		<Button size="sm" disabled={$upload.isPending} onclick={() => fileInput?.click()}>
			<Upload class="h-4 w-4" /> {$upload.isPending ? 'Uploading…' : 'Upload'}
		</Button>
	</div>
</div>

{#if $docs.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if ($docs.data ?? []).length === 0}
	<div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
		No documents yet. Upload passports, tickets, vouchers, vendor receipts…
	</div>
{:else}
	<div class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
		{#each $docs.data ?? [] as doc (doc.id)}
			<div class="flex items-center gap-3 px-4 py-2.5">
				<FileText class="h-4 w-4 shrink-0 text-slate-400" />
				<div class="min-w-0 flex-1">
					<div class="truncate text-sm font-medium text-slate-700">{doc.file_name}</div>
					<div class="text-xs text-slate-400">{sizeKb(doc.file_size)}</div>
				</div>
				<Badge tone="neutral">{doc.document_type}</Badge>
				<button onclick={() => view(doc)} class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="View">
					<ExternalLink class="h-4 w-4" />
				</button>
				<button
					onclick={() => confirm(`Delete ${doc.file_name}?`) && $remove.mutate(doc)}
					class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
					aria-label="Delete"
				>
					<Trash2 class="h-4 w-4" />
				</button>
			</div>
		{/each}
	</div>
{/if}
