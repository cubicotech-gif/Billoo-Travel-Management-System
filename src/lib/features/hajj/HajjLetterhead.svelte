<script lang="ts">
	import type { OrgSettings } from '$features/settings/api';

	// Our letterhead: uploaded logo (or wordmark) left, Hajj emblem right.
	let { org }: { org: OrgSettings | null } = $props();
</script>

<div class="doc-section mb-4 flex items-center justify-between gap-4 border-b-2 border-brand-600 pb-4">
	{#if org?.logo_url}
		<img
			src={org.logo_url}
			alt={org.company_name}
			style="height: {org.logo_height}px"
			class="max-h-56 w-auto max-w-[60%] object-contain"
		/>
	{:else}
		<div>
			<div class="text-2xl font-extrabold tracking-tight text-brand-700">{org?.company_name ?? 'Billoo Travels'}</div>
			{#if org?.tagline}<div class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{org.tagline}</div>{/if}
		</div>
	{/if}
	{#if org?.kaaba_url}
		<img src={org.kaaba_url} alt="Hajj emblem" style="height: {org.kaaba_height}px" class="max-h-56 w-auto max-w-[55%] object-contain" />
	{:else}
		<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" class="h-14 w-14 text-emerald-700" aria-hidden="true">
			<rect x="16" y="20" width="28" height="34" rx="1" />
			<path d="M16 20 L24 14 L52 14 L44 20 Z" />
			<path d="M44 20 L52 14 L52 48 L44 54 Z" />
			<path d="M16 29 L44 29 M44 29 L52 23" />
			<path d="M28 54 L28 41 Q32 38 36 41 L36 54" />
		</svg>
	{/if}
</div>
