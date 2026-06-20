<script lang="ts">
	import { untrack } from 'svelte';
	import { UploadCloud, Share2, Download, Pencil, Trash2, Check, X, IdCard, Briefcase } from 'lucide-svelte';
	import { Modal, Select, Button } from '$ui';
	import { useDocuments, useUploadDocument, useUpdateDocument, useDeleteDocument } from './queries';
	import DocThumb from './DocThumb.svelte';
	import {
		shareDocuments,
		PROFILE_BOUND_TYPES,
		ALL_DOCUMENT_TYPES,
		type Document,
		type DocumentEntity,
		type DocumentType
	} from './api';

	// Single place for every document on a query: trip docs (tickets, vouchers,
	// invoices…) plus the passenger's profile docs (passport, CNIC…). Uploading a
	// profile-type doc auto-routes it to the passenger so it lands on their vault.
	interface Props {
		queryId: string;
		passengerId?: string | null;
		open: boolean;
		onClose: () => void;
		title?: string;
	}
	let { queryId, passengerId = null, open, onClose, title = 'Documents' }: Props = $props();

	const queryDocs = untrack(() => useDocuments('query', queryId));
	const passengerDocs = untrack(() => useDocuments('passenger', passengerId ?? '__none__'));
	const uploadQ = untrack(() => useUploadDocument('query', queryId));
	const uploadP = untrack(() => useUploadDocument('passenger', passengerId ?? '__none__'));
	const updateDoc = untrack(() => useUpdateDocument('query', queryId));
	const updateDocP = untrack(() => useUpdateDocument('passenger', passengerId ?? '__none__'));
	const removeDoc = untrack(() => useDeleteDocument('query', queryId));
	const removeDocP = untrack(() => useDeleteDocument('passenger', passengerId ?? '__none__'));

	const all = $derived(
		[...($queryDocs.data ?? []), ...(passengerId ? ($passengerDocs.data ?? []) : [])].sort(
			(a, b) => +new Date(b.created_at) - +new Date(a.created_at)
		)
	);

	let docType = $state<DocumentType>('voucher');
	let dragOver = $state(false);
	let uploading = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let flash = $state<string | null>(null);
	let filter = $state<DocumentType | 'all'>('all');
	let selected = $state<Set<string>>(new Set());
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);

	const presentTypes = $derived([...new Set(all.map((d) => d.document_type))]);
	const shown = $derived(filter === 'all' ? all : all.filter((d) => d.document_type === filter));

	// Where a given type lands: profile-bound types go to the passenger (if known).
	function target(type: DocumentType): { entityType: DocumentEntity; entityId: string } {
		if (passengerId && PROFILE_BOUND_TYPES.includes(type)) return { entityType: 'passenger', entityId: passengerId };
		return { entityType: 'query', entityId: queryId };
	}

	async function uploadFiles(files: FileList | File[]) {
		error = null;
		uploading = true;
		try {
			const t = target(docType);
			for (const file of Array.from(files)) {
				const args = { file, entityType: t.entityType, entityId: t.entityId, documentType: docType };
				if (t.entityType === 'passenger') await $uploadP.mutateAsync(args);
				else await $uploadQ.mutateAsync(args);
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

	function toggle(id: string) {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}
	const selectedDocs = $derived(all.filter((d) => selected.has(d.id)));

	async function share(docs: Document[]) {
		if (!docs.length) return;
		error = null;
		busy = true;
		try {
			const how = await shareDocuments(docs);
			flash = how === 'shared' ? 'Shared' : 'Downloaded';
			setTimeout(() => (flash = null), 2000);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not share';
		} finally {
			busy = false;
		}
	}

	function startRename(d: Document) {
		editingId = d.id;
		editName = d.file_name;
	}
	function saveRename(d: Document) {
		if (!editName.trim()) return;
		const patch = { file_name: editName.trim() };
		const done = { onSuccess: () => (editingId = null) };
		if (d.entity_type === 'passenger') $updateDocP.mutate({ id: d.id, patch }, done);
		else $updateDoc.mutate({ id: d.id, patch }, done);
	}
	function del(d: Document) {
		if (d.entity_type === 'passenger') $removeDocP.mutate(d);
		else $removeDoc.mutate(d);
	}

	function fmtSize(bytes: number | null): string {
		if (!bytes) return '';
		return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
	}
</script>

<Modal {open} {onClose} {title} class="max-w-3xl">
	<!-- upload -->
	<div class="mb-3 flex flex-wrap items-center gap-2">
		<span class="text-sm text-slate-500">Upload as</span>
		<div class="w-44"><Select bind:value={docType} options={[...ALL_DOCUMENT_TYPES]} /></div>
		{#if passengerId && PROFILE_BOUND_TYPES.includes(docType)}
			<span class="inline-flex items-center gap-1 text-xs text-brand-600"><IdCard class="h-3.5 w-3.5" /> saves to passenger profile</span>
		{/if}
	</div>

	<div
		role="button"
		tabindex="0"
		ondragover={(e) => { e.preventDefault(); dragOver = true; }}
		ondragleave={() => (dragOver = false)}
		ondrop={onDrop}
		onclick={() => fileInput?.click()}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput?.click()}
		class="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors {dragOver
			? 'border-brand-400 bg-brand-50'
			: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}"
	>
		<UploadCloud class="h-7 w-7 text-slate-300" />
		<p class="text-sm font-medium text-slate-600">{uploading ? 'Uploading…' : 'Drag & drop files, or click to browse'}</p>
		<p class="text-xs text-slate-400">Multiple files supported</p>
		<input bind:this={fileInput} type="file" multiple class="hidden" onchange={onPick} />
	</div>

	{#if error}<p class="mt-2 text-sm text-red-600">{error}</p>{/if}

	<!-- filter chips -->
	{#if presentTypes.length > 1}
		<div class="mt-4 flex flex-wrap gap-1.5">
			<button type="button" onclick={() => (filter = 'all')} class="rounded-full border px-2.5 py-0.5 text-xs font-medium {filter === 'all' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}">All ({all.length})</button>
			{#each presentTypes as t (t)}
				<button type="button" onclick={() => (filter = t)} class="rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize {filter === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}">{t}</button>
			{/each}
		</div>
	{/if}

	<!-- list -->
	<div class="mt-3 max-h-[22rem] space-y-1.5 overflow-y-auto pr-1">
		{#if $queryDocs.isLoading}
			<p class="text-sm text-slate-400">Loading…</p>
		{:else if shown.length === 0}
			<p class="py-4 text-center text-sm text-slate-400">No documents yet.</p>
		{:else}
			{#each shown as d (d.id)}
				<div class="flex items-center gap-3 rounded-lg border border-slate-200 px-2.5 py-2">
					<input type="checkbox" checked={selected.has(d.id)} onchange={() => toggle(d.id)} class="rounded border-slate-300" />
					<DocThumb doc={d} />
					<div class="min-w-0 flex-1">
						{#if editingId === d.id}
							<div class="flex items-center gap-1">
								<input bind:value={editName} onkeydown={(e) => e.key === 'Enter' && saveRename(d)} class="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none" />
								<button type="button" onclick={() => saveRename(d)} class="rounded p-1 text-green-600 hover:bg-green-50" aria-label="Save"><Check class="h-4 w-4" /></button>
								<button type="button" onclick={() => (editingId = null)} class="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Cancel"><X class="h-4 w-4" /></button>
							</div>
						{:else}
							<div class="truncate text-sm font-medium text-slate-700">{d.file_name}</div>
							<div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
								<span class="rounded-full bg-slate-100 px-1.5 capitalize text-slate-500">{d.document_type}</span>
								<span class="inline-flex items-center gap-0.5">
									{#if d.entity_type === 'passenger'}<IdCard class="h-3 w-3" /> Profile{:else}<Briefcase class="h-3 w-3" /> Trip{/if}
								</span>
								{#if d.file_size}<span>· {fmtSize(d.file_size)}</span>{/if}
							</div>
						{/if}
					</div>
					{#if editingId !== d.id}
						<button type="button" onclick={() => share([d])} disabled={busy} class="rounded p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50" aria-label="Share"><Share2 class="h-4 w-4" /></button>
						<button type="button" onclick={() => startRename(d)} class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Rename"><Pencil class="h-4 w-4" /></button>
						<button type="button" onclick={() => del(d)} class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete"><Trash2 class="h-4 w-4" /></button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<!-- footer: bulk share / download -->
	<div class="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
		<div class="flex items-center gap-2">
			{#if selectedDocs.length}
				<Button size="sm" disabled={busy} onclick={() => share(selectedDocs)}><Share2 class="h-4 w-4" /> Share {selectedDocs.length}</Button>
				<span class="text-xs text-slate-400">{flash ?? 'sends to WhatsApp etc. — downloads if unsupported'}</span>
			{:else if flash}
				<span class="inline-flex items-center gap-1 text-xs text-green-600"><Download class="h-3.5 w-3.5" /> {flash}</span>
			{:else}
				<span class="text-xs text-slate-400">Tick documents to share them together.</span>
			{/if}
		</div>
		<Button variant="secondary" onclick={onClose}>Done</Button>
	</div>
</Modal>
