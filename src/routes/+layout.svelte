<script lang="ts">
	import '../app.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import { LayoutDashboard, ClipboardList, Users, Building2, Wallet, Tags, BedDouble } from 'lucide-svelte';
	import { createQueryClient } from '$lib/query-client';

	let { children }: { children: Snippet } = $props();

	const queryClient = createQueryClient();

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
		{ href: '/rates', label: 'Daily Rates', icon: Tags },
		{ href: '/hotel-rates', label: 'Hotel Rates', icon: BedDouble },
		{ href: '/finance', label: 'Finance', icon: Wallet }
	];

	function isActive(href: string): boolean {
		return href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);
	}
</script>

<QueryClientProvider client={queryClient}>
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
				<span
					class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
				>
					Dev mode · no auth
				</span>
			</div>
		</aside>
		<main class="flex-1 overflow-y-auto">
			<div class="mx-auto max-w-6xl px-8 py-8">
				{@render children()}
			</div>
		</main>
	</div>
</QueryClientProvider>
