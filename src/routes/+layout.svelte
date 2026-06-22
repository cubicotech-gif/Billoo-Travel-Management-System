<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import { LayoutDashboard, ClipboardList, Users, Building2, Wallet, Tags, PanelLeftClose, PanelLeftOpen } from 'lucide-svelte';
	import { createQueryClient } from '$lib/query-client';
	import { subscribeQueriesRealtime } from '$features/queries/realtime';

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
		{ href: '/finance', label: 'Finance', icon: Wallet }
	];

	function isActive(href: string): boolean {
		return href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);
	}
</script>

<QueryClientProvider client={queryClient}>
	<div class="flex min-h-screen">
		<aside class="flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 {collapsed ? 'w-16' : 'w-60'}">
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
			<nav class="flex-1 space-y-1 px-3">
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
			<div class="border-t border-slate-100 p-3">
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
		<main class="flex-1 overflow-y-auto">
			<!-- The Queries board + per-query workspace want full width; other pages
			     stay readable-narrow. -->
			<div class="{/^\/queries(\/[^/]+)?$/.test($page.url.pathname) ? 'max-w-none' : 'mx-auto max-w-6xl'} px-8 py-8">
				{@render children()}
			</div>
		</main>
	</div>
</QueryClientProvider>
