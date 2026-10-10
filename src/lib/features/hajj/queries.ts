import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { afterHajjEdit } from './booking';
import {
	createTraveller,
	deleteTraveller,
	deleteTravellerAddon,
	getOrCreateQuote,
	listAddons,
	listCatalogues,
	listPackageDays,
	listPackages,
	listTravellers,
	updateQuote,
	updateTraveller,
	updateTravellerAddon,
	upsertTravellerAddon
} from './api';
import type {
	HajjQuoteUpdate,
	HajjTraveller,
	HajjTravellerAddonUpdate,
	HajjTravellerUpdate,
	NewHajjTraveller,
	NewHajjTravellerAddon
} from './types';

// The catalogue changes rarely (a new vendor price list per season), so cache it.
const CATALOGUE_STALE = 5 * 60 * 1000;

const quoteKey = (queryId: string) => ['hajj', 'quote', queryId] as const;
const travellersKey = (queryId: string) => ['hajj', 'travellers', queryId] as const;

export function useHajjCatalogues() {
	return createQuery({
		queryKey: ['hajj', 'catalogues'],
		queryFn: listCatalogues,
		staleTime: CATALOGUE_STALE
	});
}

export function useHajjPackages() {
	return createQuery({
		queryKey: ['hajj', 'packages'],
		queryFn: listPackages,
		staleTime: CATALOGUE_STALE
	});
}

export function useHajjAddons() {
	return createQuery({
		queryKey: ['hajj', 'addons'],
		queryFn: listAddons,
		staleTime: CATALOGUE_STALE
	});
}

/**
 * Itinerary rows for one package. `packageId` is fixed for the component
 * instance (mount it per package, e.g. inside a keyed block).
 */
export function useHajjPackageDays(packageId: string) {
	return createQuery({
		queryKey: ['hajj', 'days', packageId] as const,
		queryFn: () => listPackageDays(packageId),
		staleTime: CATALOGUE_STALE
	});
}

export function useHajjQuote(queryId: string) {
	return createQuery({ queryKey: quoteKey(queryId), queryFn: () => getOrCreateQuote(queryId) });
}

export function useUpdateHajjQuote(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: HajjQuoteUpdate }) => updateQuote(id, patch),
		onSuccess: async () => {
			await client.invalidateQueries({ queryKey: quoteKey(queryId) });
			void refresh(client, queryId);
		}
	});
}

export function useHajjTravellers(queryId: string) {
	return createQuery({ queryKey: travellersKey(queryId), queryFn: () => listTravellers(queryId) });
}

// Every quote change refreshes the list, then (in the background) brings the
// query's PKR figures, the booking row and the GMC settlement up to date.
async function refresh(client: ReturnType<typeof useQueryClient>, queryId: string) {
	await client.invalidateQueries({ queryKey: travellersKey(queryId) });
	void afterHajjEdit(queryId)
		.catch((e) => console.warn('[hajj] finance sync failed', e))
		.finally(() => {
			client.invalidateQueries({ queryKey: ['queries', queryId] });
			client.invalidateQueries({ queryKey: ['payments', queryId] });
			client.invalidateQueries({ queryKey: ['booking', queryId] });
			client.invalidateQueries({ queryKey: ['hajj', 'travellers'] });
		});
}

export function useAddHajjTraveller(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewHajjTraveller) => createTraveller(input),
		onSuccess: () => refresh(client, queryId)
	});
}

export function useUpdateHajjTraveller(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: HajjTravellerUpdate }) =>
			updateTraveller(id, patch),
		// Optimistic: show the edit at once, so a quick follow-up change (e.g. picking
		// a package and then its hotel option) builds on it, not on the old row.
		onMutate: async ({ id, patch }) => {
			await client.cancelQueries({ queryKey: travellersKey(queryId) });
			const previous = client.getQueryData<HajjTraveller[]>(travellersKey(queryId));
			client.setQueryData<HajjTraveller[]>(travellersKey(queryId), (old) =>
				old?.map((t) => (t.id === id ? ({ ...t, ...patch } as HajjTraveller) : t))
			);
			return { previous };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.previous) client.setQueryData(travellersKey(queryId), ctx.previous);
		},
		onSettled: () => refresh(client, queryId)
	});
}

export function useRemoveHajjTraveller(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deleteTraveller(id),
		onSuccess: () => refresh(client, queryId)
	});
}

export function useSetTravellerAddon(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewHajjTravellerAddon) => upsertTravellerAddon(input),
		onSuccess: () => refresh(client, queryId)
	});
}

export function useUpdateTravellerAddon(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: HajjTravellerAddonUpdate }) =>
			updateTravellerAddon(id, patch),
		onSuccess: () => refresh(client, queryId)
	});
}

export function useRemoveTravellerAddon(queryId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deleteTravellerAddon(id),
		onSuccess: () => refresh(client, queryId)
	});
}
