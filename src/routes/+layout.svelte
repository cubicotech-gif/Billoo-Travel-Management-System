<script lang="ts">
	import '../app.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import { LayoutDashboard, ClipboardList, Users, Building2, Wallet, LogOut } from 'lucide-svelte';
	import { createQueryClient } from '$lib/query-client';
	import { auth } from '$lib/stores/auth.svelte';

	let { children }: { children: Snippet } = $props();

	const queryClient = createQueryClient();

	// Boot auth once on mount, then guard routes reactively.
	let ready = $state(false);
	$effect(() => {
		auth.init().then(() => (ready = true));
	});

	$effect(() => {
		if (!ready) return;
		const onLogin = $page.url.pathname === '/login';
		if (!auth.isAuthenticated && !onLogin) goto('/login');
		if (auth.isAuthenticated && onLogin) goto('/');
	});

	const nav = [
		{ href: '/', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/queries', label: 'Queries', icon: ClipboardList },
		{ href: '/passengers', label: 'Passengers', icon: Users },
		{ href: '/vendors', label: 'Vendors', icon: Building2 },
		{ href: '/finance', label: 'Finance', icon: Wallet }
	];

	function isActive(href: string): boolean {
		return href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);
	}
</script>

<QueryClientProvider client={queryClient}>
	{#if !ready}
		<div class="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>
	{:else if !auth.isAuthenticated}
		{@render children()}
	{:else}
		<div class="flex min-h-screen">
			<aside class="flex w-60 flex-col border-r border-slate-200 bg-white">
				<div class="px-5 py-5">
					<div class="text-lg font-bold text-brand-700">Billoo Travel</div>
					<div class="text-xs text-slate-400">Umrah Season Console</div>
				</div>
				<nav class="flex-1 space-y-1 px-3">
					{#each nav as item (item.href)}
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors {isActive(
								item.href
							)
								? 'bg-brand-50 text-brand-700'
								: 'text-slate-600 hover:bg-slate-50'}"
						>
							<item.icon class="h-4 w-4" />
							{item.label}
						</a>
					{/each}
				</nav>
				<div class="border-t border-slate-100 p-3">
					<div class="px-2 pb-2 text-xs text-slate-400">{auth.user?.email}</div>
					<button
						onclick={() => auth.signOut()}
						class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
					>
						<LogOut class="h-4 w-4" />
						Sign out
					</button>
				</div>
			</aside>
			<main class="flex-1 overflow-y-auto">
				<div class="mx-auto max-w-6xl px-8 py-8">
					{@render children()}
				</div>
			</main>
		</div>
	{/if}
</QueryClientProvider>
