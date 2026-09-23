<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import {
		LayoutDashboard,
		ClipboardList,
		Users,
		Building2,
		Wallet,
		Tags,
		Settings,
		PanelLeftClose,
		PanelLeftOpen,
		Menu,
		X,
		Download,
		Share
	} from 'lucide-svelte';
	import { createQueryClient } from '$lib/query-client';
	import { subscribeQueriesRealtime } from '$features/queries/realtime';
	import { install, initInstall } from '$lib/stores/install.svelte';

	let { children }: { children: Snippet } = $props();

	const queryClient = createQueryClient();

	// Collapsible sidebar — more canvas for the wide booking/board views. Remembers
	// the choice across reloads.
	let collapsed = $state(false);
	onMount(() => {
		collapsed = localStorage.getItem('nav:collapsed') === '1';
	});
	function toggleNav() {
		collapsed = !collapsed;
		localStorage.setItem('nav:collapsed', collapsed ? '1' : '0');
	}

	// Phone drawer — holds the full nav + install button. Closes on navigation.
	let drawerOpen = $state(false);
	$effect(() => {
		void $page.url.pathname;
		drawerOpen = false;
	});

	onMount(initInstall);

	// Keep every open console live as queries move and conversations grow.
	onMount(() => subscribeQueriesRealtime(queryClient));

	// NOTE: Auth is intentionally disabled during the build-out phase so the
	// whole system can be exercised without logging in. Re-enable later by
	// restoring the auth guard + login route (auth store lives in
	// $lib/stores/auth.svelte). The DB must also allow anon access meanwhile —
	// see database/dev-open-access.sql.

	const nav = [
		{ href: '/', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/queries', label: 'Queries', icon: ClipboardList },
		{ href: '/passengers', label: 'Passengers', icon: Users },
		{ href: '/vendors', label: 'Vendors', icon: Building2 },
		{ href: '/rates', label: 'Service Rates', icon: Tags },
		{ href: '/finance', label: 'Finance', icon: Wallet },
		{ href: '/settings', label: 'Branding', icon: Settings }
	];

	// Phone bottom bar: the daily-driver screens; the rest live under "More".
	const tabs = nav.filter((n) => ['/', '/queries', '/passengers', '/finance'].includes(n.href));
	const moreActive = $derived(!tabs.some((t) => isActive(t.href)));

	function isActive(href: string): boolean {
		return href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);
	}
</script>

<QueryClientProvider client={queryClient}>
	<div class="flex min-h-screen">
		<!-- Desktop / tablet sidebar -->
		<aside
			class="no-print sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 md:flex {collapsed
				? 'w-16'
				: 'w-60'}"
		>
			<div class="flex items-center justify-between gap-2 px-3 py-5">
				{#if !collapsed}
					<div class="min-w-0 pl-2">
						<div class="truncate text-lg font-bold text-brand-700">Billoo Travel</div>
						<div class="truncate text-xs text-slate-400">Umrah Season Console</div>
					</div>
				{/if}
				<button
					type="button"
					onclick={toggleNav}
					class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
					aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					title={collapsed ? 'Expand' : 'Collapse'}
				>
					{#if collapsed}<PanelLeftOpen class="h-5 w-5" />{:else}<PanelLeftClose class="h-5 w-5" />{/if}
				</button>
			</div>
			<nav class="flex-1 space-y-1 overflow-y-auto px-3">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						title={item.label}
						class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors {collapsed ? 'justify-center' : ''} {isActive(
							item.href
						)
							? 'bg-brand-50 text-brand-700'
							: 'text-slate-600 hover:bg-slate-50'}"
					>
						<item.icon class="h-4 w-4 shrink-0" />
						{#if !collapsed}{item.label}{/if}
					</a>
				{/each}
			</nav>
			<div class="space-y-2 border-t border-slate-100 p-3">
				{#if install.canPrompt}
					<button
						type="button"
						onclick={() => install.prompt()}
						title="Install app"
						class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 {collapsed
							? 'justify-center'
							: ''}"
					>
						<Download class="h-4 w-4 shrink-0" />
						{#if !collapsed}Install app{/if}
					</button>
				{/if}
				{#if collapsed}
					<span class="flex justify-center" title="Dev mode · no auth">
						<span class="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
					</span>
				{:else}
					<span class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
						Dev mode · no auth
					</span>
				{/if}
			</div>
		</aside>

		<div class="flex min-w-0 flex-1 flex-col">
			<!-- Phone top bar -->
			<header
				class="no-print sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] backdrop-blur md:hidden"
			>
				<a href="/" class="min-w-0">
					<div class="truncate text-base font-bold leading-tight text-brand-700">Billoo Travel</div>
					<div class="truncate text-[11px] leading-tight text-slate-400">Umrah Season Console</div>
				</a>
				<button
					type="button"
					onclick={() => (drawerOpen = true)}
					class="-mr-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
					aria-label="Open menu"
				>
					<Menu class="h-6 w-6" />
				</button>
			</header>

			<main class="min-w-0 flex-1">
				<!-- The Queries board + per-query workspace want full width; other pages
				     stay readable-narrow. Bottom padding clears the phone tab bar. -->
				<div
					class="{/^\/queries(\/[^/]+)?$/.test($page.url.pathname)
						? 'max-w-none'
						: 'mx-auto max-w-6xl'} px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-4 sm:px-6 md:px-8 md:py-8"
				>
					{@render children()}
				</div>
			</main>
		</div>
	</div>

	<!-- Phone bottom tab bar -->
	<nav
		class="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
		aria-label="Primary"
	>
		{#each tabs as item (item.href)}
			<a
				href={item.href}
				class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium {isActive(item.href)
					? 'text-brand-700'
					: 'text-slate-500'}"
			>
				<item.icon class="h-5 w-5" />
				{item.label === 'Dashboard' ? 'Home' : item.label}
			</a>
		{/each}
		<button
			type="button"
			onclick={() => (drawerOpen = true)}
			class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium {moreActive
				? 'text-brand-700'
				: 'text-slate-500'}"
		>
			<Menu class="h-5 w-5" />
			More
		</button>
	</nav>

	<!-- Phone drawer -->
	{#if drawerOpen}
		<div class="no-print fixed inset-0 z-50 md:hidden">
			<button
				type="button"
				class="absolute inset-0 bg-slate-900/40"
				aria-label="Close menu"
				tabindex="-1"
				onclick={() => (drawerOpen = false)}
			></button>
			<div
				class="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-white pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-xl"
			>
				<div class="flex items-center justify-between px-5 py-4">
					<div>
						<div class="text-lg font-bold text-brand-700">Billoo Travel</div>
						<div class="text-xs text-slate-400">Umrah Season Console</div>
					</div>
					<button
						type="button"
						onclick={() => (drawerOpen = false)}
						class="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
						aria-label="Close menu"
					>
						<X class="h-5 w-5" />
					</button>
				</div>
				<nav class="flex-1 space-y-1 overflow-y-auto px-3">
					{#each nav as item (item.href)}
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium {isActive(item.href)
								? 'bg-brand-50 text-brand-700'
								: 'text-slate-600 active:bg-slate-50'}"
						>
							<item.icon class="h-5 w-5 shrink-0" />
							{item.label}
						</a>
					{/each}
				</nav>
				<div class="space-y-3 border-t border-slate-100 p-4">
					{#if install.canPrompt}
						<button
							type="button"
							onclick={() => install.prompt()}
							class="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"
						>
							<Download class="h-4 w-4" /> Install app
						</button>
					{:else if install.iosHint}
						<p class="flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
							<Share class="mt-0.5 h-4 w-4 shrink-0" />
							<span>To install: tap <b>Share</b> in Safari, then <b>Add to Home Screen</b>.</span>
						</p>
					{/if}
					<span class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
						Dev mode · no auth
					</span>
				</div>
			</div>
		</div>
	{/if}
</QueryClientProvider>
