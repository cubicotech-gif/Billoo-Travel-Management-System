<script lang="ts">
	import { untrack } from 'svelte';
	import { FileText, FileImage, File as FileIcon } from 'lucide-svelte';
	import { signedUrl, type Document } from './api';

	// A small lazy thumbnail: shows the image itself for picture docs, a typed
	// icon otherwise. Click opens the file (signed URL) in a new tab.
	let { doc, size = 44 }: { doc: Document; size?: number } = $props();

	const isImage = $derived((doc.mime_type ?? '').startsWith('image/'));
	const isPdf = $derived((doc.mime_type ?? '').includes('pdf') || doc.file_name.toLowerCase().endsWith('.pdf'));

	let url = $state<string | null>(null);
	let failed = $state(false);

	// Resolve a signed URL once (used for the image preview and the open action).
	$effect(() => {
		const path = doc.file_url;
		untrack(() => {
			signedUrl(path)
				.then((u) => (url = u))
				.catch(() => (failed = true));
		});
	});

	async function open() {
		try {
			window.open(url ?? (await signedUrl(doc.file_url)), '_blank', 'noopener');
		} catch {
			failed = true;
		}
	}
</script>

<button
	type="button"
	onclick={open}
	title="Open {doc.file_name}"
	class="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:border-brand-300"
	style="width:{size}px;height:{size}px"
>
	{#if isImage && url && !failed}
		<img src={url} alt={doc.file_name} class="h-full w-full object-cover" onerror={() => (failed = true)} />
	{:else if isPdf}
		<FileText class="h-5 w-5 text-red-400" />
	{:else if isImage}
		<FileImage class="h-5 w-5" />
	{:else}
		<FileIcon class="h-5 w-5" />
	{/if}
</button>
