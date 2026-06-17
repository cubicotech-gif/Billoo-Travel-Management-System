<script lang="ts">
	import { untrack } from 'svelte';
	import { Upload, FileText, ExternalLink, Trash2, AlertTriangle, Pencil, Check, X } from 'lucide-svelte';
	import { Badge } from '$ui';
	import {
		useDocuments,
		useUploadDocument,
		useUpdateDocument,
		useDeleteDocument
	} from './queries';
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
	const update = untrack(() => useUpdateDocument(entityType, entityId));
	const remove = untrack(() => useDeleteDocument(entityType, entityId));

	// One hidden file input per type, keyed so a box can open its own picker.
	let inputs = $state<Record<string, HTMLInputElement | undefined>>({});
	let dragType = $state<string | null>(null);
	let uploadingType = $state<string | null>(null);

	// Inline rename / expiry edit.
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editExpiry = $state('');

	const countByType = $derived.by(() => {
		const m: Record<string, number> = {};
		for (const d of $docs.data ?? []) m[d.document_type] = (m[d.document_type] ?? 0) + 1;
		return m;
	});

	async function doUpload(type: DocumentType, file: File | undefined) {
		if (!file) return;
		uploadingType = type;
		try {
			await $upload.mutateAsync({ file, entityType, entityId, documentType: type });
		} finally {
			uploadingType = null;
			const el = inputs[type];
			if (el) el.value = '';
		}
	}

	function onDrop(e: DragEvent, type: DocumentType) {
		e.preventDefault();
		dragType = null;
		doUpload(type, e.dataTransfer?.files?.[0]);
	}

	async function view(doc: Document) {
		window.open(await signedUrl(doc.file_url), '_blank');
	}

	function startEdit(doc: Document) {
		editingId = doc.id;
		editName = doc.file_name;
		editExpiry = doc.expiry_date ?? '';
	}
	function cancelEdit() {
		editingId = null;
	}
	function saveEdit(doc: Document) {
		const patch: { file_name?: string; expiry_date?: string | null } = {};
		if (editName.trim() && editName.trim() !== doc.file_name) patch.file_name = editName.trim();
		if (EXPIRABLE_TYPES.includes(doc.document_type)) patch.expiry_date = editExpiry || null;
		if (Object.keys(patch).length) $update.mutate({ id: doc.id, patch });
		editingId = null;
	}

	function sizeKb(bytes: number | null): string {
		return bytes ? `${Math.max(1, Math.round(bytes / 1024))} KB` : '';
	}
	function labelFor(t: string): string {
		return t.charAt(0).toUpperCase() + t.slice(1);
	}
	const expiryTone = { expired: 'danger', soon: 'warning', ok: 'success' } as const;
</script>

<div class="mb-3 flex items-center justify-between">
	<h2 class="text-lg font-semibold text-slate-800">{title}</h2>
	{#if $upload.isPending}<span class="text-xs text-slate-400">Uploading…</span>{/if}
</div>

<!-- A drop-box per document type: drag a file onto it, or click to browse. -->
<div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
	{#each types as t (t)}
		<button
			type="button"
			onclick={() => inputs[t]?.click()}
			ondragover={(e) => {
				e.preventDefault();
				dragType = t;
			}}
			ondragleave={() => {
				if (dragType === t) dragType = null;
			}}
			ondrop={(e) => onDrop(e, t)}
			class="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-3 py-4 text-center transition-colors {dragType ===
			t
				? 'border-brand-400 bg-brand-50'
				: 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'}"
		>
			<Upload class="h-4 w-4 {uploadingType === t ? 'animate-pulse text-brand-500' : 'text-slate-400'}" />
			<span class="text-xs font-semibold text-slate-600">{labelFor(t)}</span>
			<span class="text-[10px] text-slate-400">
				{uploadingType === t ? 'Uploading…' : countByType[t] ? `${countByType[t]} file${countByType[t] > 1 ? 's' : ''}` : 'Drag or click'}
			</span>
			<input
				bind:this={inputs[t]}
				type="file"
				class="hidden"
				onchange={(e) => doUpload(t, (e.target as HTMLInputElement).files?.[0])}
			/>
		</button>
	{/each}
</div>

{#if $docs.isLoading}
	<p class="text-slate-400">Loading…</p>
{:else if ($docs.data ?? []).length === 0}
	<div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
		No documents yet — drop files into the boxes above.
	</div>
{:else}
	<div class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
		{#each $docs.data ?? [] as doc (doc.id)}
			{@const status = expiryStatus(doc.expiry_date)}
			<div class="flex items-center gap-3 px-4 py-2.5">
				<FileText class="h-4 w-4 shrink-0 text-slate-400" />
				<div class="min-w-0 flex-1">
					{#if editingId === doc.id}
						<div class="flex flex-wrap items-center gap-2">
							<input
								bind:value={editName}
								class="w-48 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
								placeholder="File name"
							/>
							{#if EXPIRABLE_TYPES.includes(doc.document_type)}
								<input type="date" bind:value={editExpiry} class="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none" />
							{/if}
						</div>
					{:else}
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
					{/if}
				</div>
				{#if status && status !== 'ok'}
					<Badge tone={expiryTone[status]}>{status === 'expired' ? 'Expired' : 'Expiring soon'}</Badge>
				{/if}
				<Badge tone="neutral">{doc.document_type}</Badge>
				{#if editingId === doc.id}
					<button onclick={() => saveEdit(doc)} class="rounded p-1.5 text-green-600 hover:bg-green-50" aria-label="Save name">
						<Check class="h-4 w-4" />
					</button>
					<button onclick={cancelEdit} class="rounded p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cancel">
						<X class="h-4 w-4" />
					</button>
				{:else}
					<button onclick={() => startEdit(doc)} class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600" aria-label="Rename">
						<Pencil class="h-4 w-4" />
					</button>
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
				{/if}
			</div>
		{/each}
	</div>
{/if}
