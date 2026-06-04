<script lang="ts">
	import { untrack } from 'svelte';
	import { AlertTriangle } from 'lucide-svelte';
	import { useDocuments } from './queries';
	import { EXPIRABLE_TYPES, expiryStatus } from './api';

	// Prominent eligibility warning: passport/visa expired or within 6 months.
	let { passengerId }: { passengerId: string } = $props();

	const docs = untrack(() => useDocuments('passenger', passengerId));

	const alerts = $derived(
		($docs.data ?? [])
			.filter((d) => EXPIRABLE_TYPES.includes(d.document_type))
			.map((d) => ({ doc: d, status: expiryStatus(d.expiry_date) }))
			.filter((a) => a.status === 'expired' || a.status === 'soon')
	);
</script>

{#if alerts.length}
	<div class="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3">
		<div class="flex items-center gap-2 text-sm font-semibold text-amber-800">
			<AlertTriangle class="h-4 w-4" /> Document attention needed
		</div>
		<ul class="mt-1 space-y-0.5 text-sm text-amber-700">
			{#each alerts as a (a.doc.id)}
				<li>
					{a.doc.document_type}
					{a.status === 'expired' ? 'has expired' : 'expires soon'}
					({a.doc.expiry_date}) — required for Hajj/Umrah eligibility.
				</li>
			{/each}
		</ul>
	</div>
{/if}
