<script lang="ts">
	import { untrack } from 'svelte';
	import { Upload, FileText, ExternalLink, Trash2, AlertTriangle } from 'lucide-svelte';
	import { Badge, Button, Input, Select } from '$ui';
	import { useDocuments, useUploadDocument, useDeleteDocument } from './queries';
	import {
		DOCUMENT_TYPES,
		EXPIRABLE_TYPES,
		expiryStatus,
		signedUrl,
		type Document,
		type DocumentEntity,
		type DocumentType
	} from './api';

	let {
		entityType,
		entityId,
		title = 'Documents',
		types = DOCUMENT_TYPES
	}: {
		entityType: DocumentEntity;
		entityId: string;
		title?: string;
		types?: DocumentType[];
	} = $props();

	const docs = untrack(() => useDocuments(entityType, entityId));
	const upload = untrack(() => useUploadDocument(entityType, entityId));
	const remove = untrack(() => useDeleteDocument(entityType, entityId));

	let docType = $state<string>(untrack(() => types[0] ?? 'other'));
	let expiry = $state('');
	let fileInput = $state<HTMLInputElement>();

	const showExpiry = $derived(EXPIRABLE_TYPES.includes(docType as DocumentType));

	async function onFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		await $upload.mutateAsync({
			file,
			entityType,
			entityId,
			documentType: docType as DocumentType,
			expiryDate: showExpiry ? expiry || null : null
		});
		if (fileInput) fileInput.value = '';
		expiry = '';
	}

	async function view(doc: Document) {
		window.open(await signedUrl(doc.file_url), '_blank');
	}

	function sizeKb(bytes: number | null): string {
		return bytes ? `${Math.max(1, Math.round(bytes / 1024))} KB` : '';
	}
	const expiryTone = { expired: 'danger', soon: 'warning', ok: 'success' } as const;
</script>

<div class="mb-3 flex flex-wrap items-end justify-between gap-2">
	<h2 class="text-lg font-semibold text-slate-800">{title}</h2>
	<div class="flex items-end gap-2">
		<div class="w-36"><Select bind:value={docType} options={[...types]} /></div>
		{#if showExpiry}
			<div class="w-36"><Input label="Expiry" type="date" bind:value={expiry} /></div>
		{/if}
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
		No documents yet.
	</div>
{:else}
	<div class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
		{#each $docs.data ?? [] as doc (doc.id)}
			{@const status = expiryStatus(doc.expiry_date)}
			<div class="flex items-center gap-3 px-4 py-2.5">
				<FileText class="h-4 w-4 shrink-0 text-slate-400" />
				<div class="min-w-0 flex-1">
					<div class="truncate text-sm font-medium text-slate-700">{doc.file_name}</div>
					<div class="flex items-center gap-2 text-xs text-slate-400">
						{sizeKb(doc.file_size)}
						{#if doc.expiry_date}
							<span class="inline-flex items-center gap-1">
								{#if status && status !== 'ok'}<AlertTriangle class="h-3 w-3 text-amber-500" />{/if}
								exp {doc.expiry_date}
							</span>
						{/if}
					</div>
				</div>
				{#if status && status !== 'ok'}
					<Badge tone={expiryTone[status]}>{status === 'expired' ? 'Expired' : 'Expiring soon'}</Badge>
				{/if}
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
