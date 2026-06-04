<script lang="ts">
	import { Upload } from 'lucide-svelte';
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import { parseTable, looksLikeHeader } from '$lib/bulk';

	interface Props {
		open: boolean;
		onClose: () => void;
		title: string;
		columns: string[];
		example?: string;
		/** Import the parsed rows (each row is a string[] in column order). */
		onImport: (rows: string[][]) => Promise<number>;
	}

	let { open, onClose, title, columns, example, onImport }: Props = $props();

	let raw = $state('');
	let skipHeader = $state(false);
	let importing = $state(false);
	let error = $state<string | null>(null);
	let done = $state<number | null>(null);

	const allRows = $derived(parseTable(raw));
	const headerDetected = $derived(looksLikeHeader(allRows[0], columns[0] ?? ''));
	const rows = $derived(skipHeader || headerDetected ? allRows.slice(1) : allRows);

	async function run() {
		importing = true;
		error = null;
		done = null;
		try {
			const n = await onImport(rows);
			done = n;
			raw = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Import failed';
		}
		importing = false;
	}
</script>

<Modal {open} {onClose} {title}>
	<p class="mb-2 text-sm text-slate-500">
		Paste rows from Excel/Sheets (tab or comma separated). Columns, in order:
	</p>
	<div class="mb-2 flex flex-wrap gap-1">
		{#each columns as c, i (i)}
			<span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{i + 1}. {c}</span>
		{/each}
	</div>
	{#if example}<pre class="mb-2 overflow-x-auto rounded bg-slate-50 p-2 text-[11px] text-slate-500">{example}</pre>{/if}

	<textarea
		bind:value={raw}
		rows="8"
		placeholder="Paste here…"
		class="w-full rounded-lg border border-slate-300 p-2 font-mono text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
	></textarea>

	<label class="mt-2 flex items-center gap-2 text-xs text-slate-500">
		<input type="checkbox" bind:checked={skipHeader} class="rounded border-slate-300" /> First row is a header
	</label>

	{#if rows.length}
		<div class="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-200">
			<table class="w-full text-xs">
				<thead class="bg-slate-50 text-left text-slate-400">
					<tr>{#each columns as c, i (i)}<th class="px-2 py-1 font-medium">{c}</th>{/each}</tr>
				</thead>
				<tbody class="divide-y divide-slate-50">
					{#each rows.slice(0, 20) as r, i (i)}
						<tr>{#each columns as _c, ci (ci)}<td class="px-2 py-1 text-slate-600">{r[ci] ?? ''}</td>{/each}</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="mt-1 text-xs text-slate-400">{rows.length} row(s){rows.length > 20 ? ' (showing 20)' : ''}</p>
	{/if}

	{#if error}<p class="mt-2 text-sm text-red-600">{error}</p>{/if}
	{#if done !== null}<p class="mt-2 text-sm text-green-600">Imported {done} row(s).</p>{/if}

	<div class="mt-4 flex justify-end gap-2">
		<Button variant="secondary" onclick={onClose}>Close</Button>
		<Button onclick={run} disabled={importing || rows.length === 0}>
			<Upload class="h-4 w-4" /> {importing ? 'Importing…' : `Import ${rows.length}`}
		</Button>
	</div>
</Modal>
