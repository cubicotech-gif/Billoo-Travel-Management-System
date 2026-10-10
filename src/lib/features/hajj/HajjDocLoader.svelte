<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { usePassengers } from '$features/passengers/queries';
	import { fullName } from '$features/passengers/types';
	import { useQueryDetail } from '$features/queries/queries';
	import { useBookingForQuery } from '$features/bookings/queries';
	import { usePayments } from '$features/payments/queries';
	import { useOrgSettings } from '$features/settings/queries';
	import { listPackageDays } from './api';
	import type { HajjDocContext } from './doc-context';
	import { buildProposal } from './proposal';
	import {
		useHajjAddons,
		useHajjCatalogues,
		useHajjPackages,
		useHajjQuote,
		useHajjTravellers
	} from './queries';
	import type { HajjDay } from './types';
	import { DEFAULT_HAJJ_ROE } from './types';

	// Loads and resolves everything a client-facing Hajj document needs, then
	// hands it to `children`. Shows loading / error / not-Hajj states itself.
	let { queryId, children }: { queryId: string; children: Snippet<[HajjDocContext]> } = $props();

	const query = untrack(() => useQueryDetail(queryId));
	const quote = untrack(() => useHajjQuote(queryId));
	const travellers = untrack(() => useHajjTravellers(queryId));
	const catalogues = untrack(() => useHajjCatalogues());
	const packages = untrack(() => useHajjPackages());
	const addons = untrack(() => useHajjAddons());
	const passengers = untrack(() => usePassengers());
	const settings = untrack(() => useOrgSettings());
	const booking = untrack(() => useBookingForQuery(queryId));
	const payments = untrack(() => usePayments(queryId));

	// Every store is read unconditionally so each stays subscribed.
	const ready = $derived.by(() => {
		const loaded = [
			$query.data,
			$quote.data,
			$travellers.data,
			$catalogues.data,
			$packages.data,
			$addons.data
		];
		return loaded.every((d) => d !== undefined && d !== null);
	});
	const loadError = $derived(
		$query.error ?? $quote.error ?? $travellers.error ?? $catalogues.error ?? $packages.error ?? $addons.error
	);

	const list = $derived($travellers.data ?? []);

	let days = $state<Record<string, HajjDay[]>>({});
	$effect(() => {
		const have = untrack(() => days);
		for (const id of new Set(list.map((t) => t.package_id)))
			if (!(id in have))
				listPackageDays(id)
					.then((rows) => (days = { ...days, [id]: rows }))
					.catch(() => (days = { ...days, [id]: [] }));
	});

	const context = $derived.by((): HajjDocContext | null => {
		const q = $query.data;
		if (!ready || !q || q.package_type !== 'Hajj') return null;
		const byId = new Map(($passengers.data ?? []).map((p) => [p.id, p]));
		const names = Object.fromEntries(
			list.map((t) => {
				const p = byId.get(t.passenger_id);
				return [t.id, p ? fullName(p) : 'Traveller'];
			})
		);
		const roe = Number($quote.data?.roe ?? DEFAULT_HAJJ_ROE);
		return {
			query: q,
			org: $settings.data ?? null,
			proposal: buildProposal({
				roe,
				travellers: list,
				packages: $packages.data ?? [],
				addons: $addons.data ?? [],
				catalogues: $catalogues.data ?? [],
				query: q,
				names,
				days
			}),
			pilgrims: list.map((t) => ({
				id: t.id,
				name: names[t.id] ?? 'Traveller',
				passport: byId.get(t.passenger_id)?.passport_number ?? null,
				isLead: t.is_lead
			})),
			roe,
			usdRate: $quote.data?.usd_rate == null ? null : Number($quote.data.usd_rate),
			discountPkr: Number($booking.data?.discount_pkr ?? 0) || 0,
			payments: ($payments.data ?? []).map((p) => ({
				status: p.status,
				amount: Number(p.amount),
				paid_date: p.paid_date,
				due_date: p.due_date,
				label: p.label,
				method: p.method,
				created_at: p.created_at
			}))
		};
	});
</script>

{#if loadError}
	<p class="text-red-600">Failed to load: {loadError.message}</p>
{:else if !ready}
	<p class="text-slate-400">Loading…</p>
{:else if $query.data && $query.data.package_type !== 'Hajj'}
	<p class="text-slate-500">This query isn’t a Hajj package.</p>
{:else if context && context.proposal.groups.length === 0}
	<p class="text-slate-500">Add at least one traveller in the Hajj builder first.</p>
{:else if context}
	{@render children(context)}
{/if}
