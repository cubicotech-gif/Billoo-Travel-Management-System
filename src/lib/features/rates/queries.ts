import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
	createRate,
	deleteRate,
	getLatestRoe,
	listHotelObservations,
	listRates,
	setRoe,
	updateRate
} from './api';
import type { NewRateCard, RateCardUpdate } from './types';

const RATES_KEY = ['rates'] as const;
const ROE_KEY = ['exchange-rate'] as const;

export function useRates() {
	return createQuery({ queryKey: RATES_KEY, queryFn: listRates });
}

export function useCreateRate() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewRateCard) => createRate(input),
		onSuccess: () => client.invalidateQueries({ queryKey: RATES_KEY })
	});
}

export function useUpdateRate() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: RateCardUpdate }) => updateRate(id, patch),
		onSuccess: () => client.invalidateQueries({ queryKey: RATES_KEY })
	});
}

export function useDeleteRate() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deleteRate(id),
		onSuccess: () => client.invalidateQueries({ queryKey: RATES_KEY })
	});
}

export function useHotelObservations(hotelId: string) {
	return createQuery({
		queryKey: ['hotel-observations', hotelId] as const,
		queryFn: () => listHotelObservations(hotelId),
		enabled: !!hotelId
	});
}

export function useLatestRoe() {
	return createQuery({ queryKey: ROE_KEY, queryFn: getLatestRoe });
}

export function useSetRoe() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ value, date }: { value: number; date?: string }) => setRoe(value, date),
		onSuccess: () => client.invalidateQueries({ queryKey: ROE_KEY })
	});
}
