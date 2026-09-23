<script lang="ts">
	import { useOrgSettings } from './queries';

	interface Props {
		/** Logo height class for this spot (sidebar / phone header / drawer). */
		size?: 'sm' | 'md';
	}

	let { size = 'md' }: Props = $props();

	// The same logo uploaded on the Branding page for vouchers/invoices.
	const settings = useOrgSettings();
	const logo = $derived($settings.data?.logo_url ?? null);
	const name = $derived($settings.data?.company_name || 'Billoo Travel');
</script>

{#if logo}
	<img
		src={logo}
		alt={name}
		class="block w-auto object-contain object-left {size === 'sm' ? 'h-9 max-w-[11rem]' : 'h-11 max-w-[10rem]'}"
	/>
{:else}
	<div class="min-w-0">
		<div class="truncate font-bold leading-tight text-brand-700 {size === 'sm' ? 'text-base' : 'text-lg'}">{name}</div>
		<div class="truncate leading-tight text-slate-400 {size === 'sm' ? 'text-[11px]' : 'text-xs'}">Umrah Season Console</div>
	</div>
{/if}
