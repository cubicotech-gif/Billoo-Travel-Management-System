<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { ChevronDown, ChevronRight, CheckCircle2, Circle, Upload, AlertTriangle } from 'lucide-svelte';
	import { Badge, Button } from '$ui';
	import type { DocumentType } from '$features/documents/api';

	// A collapsible card for ONE service in the booking stage: the agreed thing we
	// actually pay a vendor for. Header carries its booked status, a Mark-booked
	// toggle and an (optional) proof upload; the body holds the existing fields.
	// Stays editable after booking — reopen and change, the totals/itinerary follow.
	let {
		title,
		subtitle = '',
		booked = false,
		proof = false,
		busy = false,
		onMarkBooked,
		onUnmark,
		onUploadProof,
		children
	}: {
		title: string;
		subtitle?: string;
		booked?: boolean;
		proof?: boolean;
		busy?: boolean;
		onMarkBooked: () => void;
		onUnmark: () => void;
		onUploadProof: (file: File, docType: DocumentType) => void;
		children: Snippet;
	} = $props();

	// Cleaner look: booked services start collapsed, open ones stay expanded.
	let open = $state(untrack(() => !booked));
	let docType = $state<DocumentType>('voucher');
	let fileInput = $state<HTMLInputElement | null>(null);

	const missingProof = $derived(booked && !proof);

	function onPick(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) onUploadProof(file, docType);
		input.value = '';
	}
</script>

<div class="rounded-xl border bg-white {booked ? 'border-green-200' : 'border-slate-200'}">
	<div class="flex flex-wrap items-center gap-2 px-3 py-2.5">
		<button type="button" onclick={() => (open = !open)} class="flex min-w-0 flex-1 items-center gap-2 text-left">
			{#if open}<ChevronDown class="h-4 w-4 shrink-0 text-slate-400" />{:else}<ChevronRight class="h-4 w-4 shrink-0 text-slate-400" />{/if}
			{#if booked}
				<CheckCircle2 class="h-4 w-4 shrink-0 text-green-600" />
			{:else}
				<Circle class="h-4 w-4 shrink-0 text-slate-300" />
			{/if}
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
			<span class="text-xs text-amber-700">Upload the booking proof / voucher?</span>
			<select bind:value={docType} class="rounded-md border border-amber-200 bg-white px-1.5 py-1 text-xs text-slate-600 focus:outline-none">
				<option value="voucher">Voucher</option>
				<option value="invoice">Invoice</option>
				<option value="ticket">Ticket</option>
				<option value="receipt">Receipt</option>
				<option value="other">Other</option>
			</select>
			<Button size="sm" variant="secondary" onclick={() => fileInput?.click()} disabled={busy}>
				<Upload class="h-3.5 w-3.5" /> Choose file
			</Button>
			<input bind:this={fileInput} type="file" class="hidden" onchange={onPick} />
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
