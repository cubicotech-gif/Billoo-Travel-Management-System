<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronDown, ChevronRight, CheckCircle2, Upload, AlertTriangle } from 'lucide-svelte';
	import { Badge, Button } from '$ui';
	import type { DocumentType } from '$features/documents/api';

	// A collapsible card for ONE service in the booking stage: the agreed thing we
	// actually pay a vendor for. Colour-coded by service type so the four core
	// services read apart at a glance; header carries booked status, a Mark-booked
	// toggle and an (optional) proof upload; the body holds the existing fields.
	// Stays editable after booking — reopen and change, the totals/itinerary follow.
	type Accent = 'hotel' | 'transfer' | 'visa' | 'ticket' | 'other';
	let {
		title,
		subtitle = '',
		accent = 'other',
		booked = false,
		proof = false,
		busy = false,
		existingDocs = [],
		onMarkBooked,
		onUnmark,
		onUploadProof,
		onLinkProof,
		children
	}: {
		title: string;
		subtitle?: string;
		accent?: Accent;
		booked?: boolean;
		proof?: boolean;
		busy?: boolean;
		/** Already-filed documents that can be linked as proof instead of uploading. */
		existingDocs?: { id: string; label: string }[];
		onMarkBooked: () => void;
		onUnmark: () => void;
		onUploadProof: (file: File, docType: DocumentType) => void;
		onLinkProof?: (docId: string) => void;
		children: Snippet;
	} = $props();

	// Static class strings (so Tailwind keeps them) per service colour.
	const ACCENTS: Record<Accent, { ring: string; bar: string; head: string; dot: string; chip: string }> = {
		hotel: { ring: 'border-indigo-200', bar: 'border-l-indigo-400', head: 'bg-indigo-50/70', dot: 'bg-indigo-400', chip: 'bg-indigo-100 text-indigo-700' },
		transfer: { ring: 'border-amber-200', bar: 'border-l-amber-400', head: 'bg-amber-50/70', dot: 'bg-amber-400', chip: 'bg-amber-100 text-amber-700' },
		visa: { ring: 'border-emerald-200', bar: 'border-l-emerald-400', head: 'bg-emerald-50/70', dot: 'bg-emerald-400', chip: 'bg-emerald-100 text-emerald-700' },
		ticket: { ring: 'border-sky-200', bar: 'border-l-sky-400', head: 'bg-sky-50/70', dot: 'bg-sky-400', chip: 'bg-sky-100 text-sky-700' },
		other: { ring: 'border-violet-200', bar: 'border-l-violet-400', head: 'bg-violet-50/70', dot: 'bg-violet-400', chip: 'bg-violet-100 text-violet-700' }
	};
	const c = $derived(ACCENTS[accent]);
	const kindLabel = $derived(
		accent === 'hotel' ? 'Hotel' : accent === 'transfer' ? 'Transfer' : accent === 'visa' ? 'Visa' : accent === 'ticket' ? 'Tickets' : 'Service'
	);

	// Always collapsed when the booking page opens — expand on demand.
	let open = $state(false);
	let docType = $state<DocumentType>('voucher');
	let fileInput = $state<HTMLInputElement | null>(null);
	let linkPick = $state('');

	const missingProof = $derived(booked && !proof);

	function onPick(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) onUploadProof(file, docType);
		input.value = '';
	}
	function onLinkPick(e: Event) {
		const id = (e.target as HTMLSelectElement).value;
		if (id) onLinkProof?.(id);
		linkPick = '';
	}
</script>

<div class="overflow-hidden rounded-xl border border-l-4 bg-white {c.ring} {c.bar}">
	<div class="flex flex-wrap items-center gap-2 px-3 py-2.5 {c.head}">
		<button type="button" onclick={() => (open = !open)} class="flex min-w-0 flex-1 items-center gap-2 text-left">
			{#if open}<ChevronDown class="h-4 w-4 shrink-0 text-slate-400" />{:else}<ChevronRight class="h-4 w-4 shrink-0 text-slate-400" />{/if}
			<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {c.chip}">{kindLabel}</span>
			<span class="truncate text-sm font-semibold text-slate-700">{title}</span>
			{#if subtitle}<span class="truncate text-xs text-slate-400">{subtitle}</span>{/if}
		</button>

		<div class="flex shrink-0 items-center gap-1.5">
			{#if booked}
				<Badge tone="success">Booked</Badge>
				{#if missingProof}
					<span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700" title="No proof/voucher filed yet">
						<AlertTriangle class="h-3 w-3" /> no proof
					</span>
				{/if}
				<button type="button" onclick={onUnmark} class="text-xs text-slate-400 hover:text-slate-600">Unmark</button>
			{:else}
				<Button size="sm" onclick={onMarkBooked} disabled={busy}>
					{busy ? 'Saving…' : 'Mark booked'}
				</Button>
			{/if}
		</div>
	</div>

	{#if booked && missingProof}
		<!-- Optional proof: never blocks "booked", just nudges until a doc is filed. -->
		<div class="flex flex-wrap items-center gap-2 border-t border-amber-100 bg-amber-50/60 px-3 py-2">
			<span class="text-xs text-amber-700">File the booking proof / voucher?</span>
			<select bind:value={docType} class="rounded-md border border-amber-200 bg-white px-1.5 py-1 text-xs text-slate-600 focus:outline-none">
				<option value="voucher">Voucher</option>
				<option value="invoice">Invoice</option>
				<option value="ticket">Ticket</option>
				<option value="receipt">Receipt</option>
				<option value="other">Other</option>
			</select>
			<Button size="sm" variant="secondary" onclick={() => fileInput?.click()} disabled={busy}>
				<Upload class="h-3.5 w-3.5" /> Upload
			</Button>
			<input bind:this={fileInput} type="file" class="hidden" onchange={onPick} />
			{#if onLinkProof && existingDocs.length}
				<span class="text-xs text-amber-600">or</span>
				<select
					value={linkPick}
					onchange={onLinkPick}
					disabled={busy}
					class="max-w-[16rem] rounded-md border border-amber-200 bg-white px-1.5 py-1 text-xs text-slate-600 focus:outline-none"
					title="Mark as uploaded — link a document already on file"
				>
					<option value="">Link existing doc…</option>
					{#each existingDocs as d (d.id)}
						<option value={d.id}>{d.label}</option>
					{/each}
				</select>
			{/if}
		</div>
	{:else if booked && proof}
		<div class="flex items-center gap-2 border-t border-green-100 bg-green-50/50 px-3 py-1.5">
			<span class="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle2 class="h-3.5 w-3.5" /> Proof filed</span>
			<button type="button" onclick={() => fileInput?.click()} class="text-xs text-slate-400 hover:text-slate-600">add another</button>
			<input bind:this={fileInput} type="file" class="hidden" onchange={onPick} />
		</div>
	{/if}

	{#if open}
		<div class="border-t border-slate-100 p-3">
			{@render children()}
		</div>
	{/if}
</div>
