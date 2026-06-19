<script lang="ts">
	import { untrack } from 'svelte';
	import { UploadCloud, Link2, Pencil, Trash2, Check, X, FileText } from 'lucide-svelte';
	import { Modal, Select, Button } from '$ui';
	import { useDocuments, useUploadDocument, useUpdateDocument, useDeleteDocument } from './queries';
	import { signedUrl, QUERY_DOCUMENT_TYPES, type Document, type DocumentEntity, type DocumentType } from './api';

	interface Props {
		entityType: DocumentEntity;
		entityId: string;
		open: boolean;
		onClose: () => void;
		title?: string;
		types?: DocumentType[];
	}
	let { entityType, entityId, open, onClose, title = 'Documents', types = QUERY_DOCUMENT_TYPES }: Props =
		$props();

	const docs = untrack(() => useDocuments(entityType, entityId));
	const upload = untrack(() => useUploadDocument(entityType, entityId));
	const updateDoc = untrack(() => useUpdateDocument(entityType, entityId));
	const removeDoc = untrack(() => useDeleteDocument(entityType, entityId));

	let docType = $state<DocumentType>(untrack(() => types[0] ?? 'other'));
	let dragOver = $state(false);
	let uploading = $state(false);
	let error = $state<string | null>(null);
	let shared = $state<string | null>(null);

	// inline rename
	let editingId = $state<string | null>(null);
	let editName = $state('');

	let fileInput = $state<HTMLInputElement | null>(null);

	async function uploadFiles(files: FileList | File[]) {
		error = null;
		uploading = true;
		try {
			for (const file of Array.from(files)) {
				await $upload.mutateAsync({ file, entityType, entityId, documentType: docType });
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files);
	}
	function onPick(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.length) uploadFiles(input.files);
		input.value = '';
	}

	function startRename(d: Document) {
		editingId = d.id;
		editName = d.file_name;
	}
	function saveRename() {
		const id = editingId;
		if (!id || !editName.trim()) return;
		$updateDoc.mutate({ id, patch: { file_name: editName.trim() } }, { onSuccess: () => (editingId = null) });
	}

	async function share(d: Document) {
		error = null;
		try {
			const url = await signedUrl(d.file_url);
			await navigator.clipboard.writeText(url);
			shared = d.id;
			setTimeout(() => (shared = shared === d.id ? null : shared), 2500);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not create share link';
		}
	}

	function fmtSize(bytes: number | null): string {
		if (!bytes) return '';
		return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
	}
</script>

<Modal {open} {onClose} {title} class="max-w-2xl">
	<!-- drag-and-drop, multi-file -->
	<div class="mb-4 flex items-center gap-2">
		<span class="text-sm text-slate-500">Upload as</span>
		<div class="w-40"><Select bind:value={docType} options={[...types]} /></div>
	</div>

	<div
		role="button"
		tabindex="0"
		ondragover={(e) => {
			e.preventDefault();
			dragOver = true;
		}}
		ondragleave={() => (dragOver = false)}
		ondrop={onDrop}
		onclick={() => fileInput?.click()}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput?.click()}
		class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors {dragOver
			? 'border-brand-400 bg-brand-50'
			: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}"
	>
		<UploadCloud class="h-8 w-8 text-slate-300" />
		<p class="text-sm font-medium text-slate-600">
			{uploading ? 'Uploading…' : 'Drag & drop files here, or click to browse'}
		</p>
		<p class="text-xs text-slate-400">Multiple files supported</p>
		<input bind:this={fileInput} type="file" multiple class="hidden" onchange={onPick} />
	</div>

	{#if error}<p class="mt-2 text-sm text-red-600">{error}</p>{/if}

	<!-- existing documents: rename / share / delete -->
	<div class="mt-5 space-y-1.5">
		{#if $docs.isLoading}
			<p class="text-sm text-slate-400">Loading…</p>
		{:else if ($docs.data ?? []).length === 0}
			<p class="text-sm text-slate-400">No documents yet.</p>
		{:else}
			{#each $docs.data ?? [] as d (d.id)}
				<div class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
					<FileText class="h-4 w-4 shrink-0 text-slate-400" />
					{#if editingId === d.id}
						<input
							bind:value={editName}
							onkeydown={(e) => e.key === 'Enter' && saveRename()}
							class="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
						/>
						<button type="button" onclick={saveRename} class="rounded p-1 text-green-600 hover:bg-green-50" aria-label="Save name">
							<Check class="h-4 w-4" />
						</button>
						<button type="button" onclick={() => (editingId = null)} class="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Cancel">
							<X class="h-4 w-4" />
						</button>
					{:else}
						<div class="min-w-0 flex-1">
							<div class="truncate text-sm font-medium text-slate-700">{d.file_name}</div>
							<div class="text-[11px] text-slate-400">{d.document_type}{d.file_size ? ` · ${fmtSize(d.file_size)}` : ''}</div>
						</div>
						<button type="button" onclick={() => share(d)} class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50" aria-label="Share">
							<Link2 class="h-3.5 w-3.5" /> {shared === d.id ? 'Copied!' : 'Share'}
						</button>
						<button type="button" onclick={() => startRename(d)} class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Rename">
							<Pencil class="h-3.5 w-3.5" />
						</button>
						<button type="button" onclick={() => $removeDoc.mutate(d)} class="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
							<Trash2 class="h-3.5 w-3.5" />
						</button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<div class="mt-5 flex justify-end border-t border-slate-100 pt-3">
		<Button variant="secondary" onclick={onClose}>Done</Button>
	</div>
</Modal>
