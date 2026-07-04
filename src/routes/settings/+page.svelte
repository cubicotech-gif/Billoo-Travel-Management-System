<script lang="ts">
	import { untrack } from 'svelte';
	import { UploadCloud, Check, Trash2 } from 'lucide-svelte';
	import { Button, Card, Input } from '$ui';
	import { useOrgSettings, useUpdateOrgSettings } from '$features/settings/queries';
	import { fileToDataUrl } from '$features/settings/api';

	const settings = untrack(() => useOrgSettings());
	const save = untrack(() => useUpdateOrgSettings());

	// Local editable copy, seeded once the row loads.
	let form = $state({
		company_name: '',
		tagline: '',
		logo_url: '' as string | null,
		logo_height: 80,
		address: '',
		phone: '',
		email: '',
		website: ''
	});
	let init = false;
	$effect(() => {
		const s = $settings.data;
		if (s && !init) {
			init = true;
			form = {
				company_name: s.company_name ?? '',
				tagline: s.tagline ?? '',
				logo_url: s.logo_url,
				logo_height: s.logo_height ?? 80,
				address: s.address ?? '',
				phone: s.phone ?? '',
				email: s.email ?? '',
				website: s.website ?? ''
			};
		}
	});

	let fileInput = $state<HTMLInputElement | null>(null);
	let error = $state<string | null>(null);
	let saved = $state(false);

	async function onPick(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		error = null;
		if (!file.type.startsWith('image/')) {
			error = 'Please choose an image file (PNG, JPG or SVG).';
			return;
		}
		if (file.size > 2_000_000) {
			error = 'Logo is larger than 2 MB — use a smaller/optimised image.';
			return;
		}
		form.logo_url = await fileToDataUrl(file);
	}

	function removeLogo() {
		form.logo_url = null;
	}

	function submit() {
		error = null;
		$save.mutate(
			{
				company_name: form.company_name.trim() || 'Billoo Travels',
				tagline: form.tagline.trim() || null,
				logo_url: form.logo_url,
				logo_height: Number(form.logo_height) || 80,
				address: form.address.trim() || null,
				phone: form.phone.trim() || null,
				email: form.email.trim() || null,
				website: form.website.trim() || null
			},
			{
				onSuccess: () => {
					saved = true;
					setTimeout(() => (saved = false), 2500);
				},
				onError: (e) => (error = e instanceof Error ? e.message : 'Save failed')
			}
		);
	}
</script>

<div class="mx-auto max-w-3xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-slate-800">Branding</h1>
		<p class="text-sm text-slate-500">Your logo and company details — used on every voucher and invoice.</p>
	</div>

	{#if $settings.isLoading}
		<p class="text-slate-400">Loading…</p>
	{:else if $settings.isError}
		<p class="text-red-600">Failed to load settings: {$settings.error.message}. Did you run the org_settings migration?</p>
	{:else}
		<!-- Logo -->
		<Card title="Company logo">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
				<!-- Live preview at the exact print size -->
				<div class="flex min-h-[8rem] flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
					{#if form.logo_url}
						<img src={form.logo_url} alt="Logo preview" style="height: {form.logo_height}px" class="w-auto max-w-full object-contain" />
					{:else}
						<span class="text-sm text-slate-400">No logo yet — the documents show your company name as text.</span>
					{/if}
				</div>
				<div class="sm:w-56">
					<Button size="sm" onclick={() => fileInput?.click()}><UploadCloud class="h-4 w-4" /> Upload logo</Button>
					{#if form.logo_url}
						<button type="button" onclick={removeLogo} class="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600"><Trash2 class="h-3.5 w-3.5" /> Remove</button>
					{/if}
					<input bind:this={fileInput} type="file" accept="image/*" class="hidden" onchange={onPick} />
					<p class="mt-2 text-xs text-slate-400">PNG, JPG or SVG. A transparent PNG looks best. Max 2 MB.</p>
				</div>
			</div>

			<!-- Size control — make it as large and clear as you like -->
			<div class="mt-4">
				<div class="mb-1 flex items-center justify-between text-sm">
					<span class="font-medium text-slate-600">Logo size on documents</span>
					<span class="text-slate-500">{form.logo_height}px tall</span>
				</div>
				<input type="range" min="40" max="200" step="4" bind:value={form.logo_height} class="w-full accent-brand-600" />
				<p class="mt-1 text-xs text-slate-400">Drag right for a bigger, bolder logo. The preview above is the real print size.</p>
			</div>
		</Card>

		<!-- Company details -->
		<div class="mt-6">
			<Card title="Company details">
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Input label="Company name" bind:value={form.company_name} />
					<Input label="Tagline" bind:value={form.tagline} placeholder="e.g. Since 1969 · Umrah & Travel" />
					<div class="sm:col-span-2"><Input label="Address" bind:value={form.address} /></div>
					<Input label="Phone" bind:value={form.phone} />
					<Input label="Email" bind:value={form.email} />
					<Input label="Website" bind:value={form.website} />
				</div>
			</Card>
		</div>

		<div class="mt-4 flex items-center gap-3">
			<Button onclick={submit} disabled={$save.isPending}><Check class="h-4 w-4" /> {$save.isPending ? 'Saving…' : 'Save branding'}</Button>
			{#if saved}<span class="text-sm font-medium text-green-600">Saved — documents updated.</span>{/if}
			{#if error}<span class="text-sm text-red-600">{error}</span>{/if}
		</div>
	{/if}
</div>
