import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
	createObservation,
	createRate,
	deleteObservation,
	deleteRate,
	getLatestRoe,
	listAllObservations,
	listHotelObservations,
	listRates,
	setRoe,
	updateObservation,
	updateRate
} from './api';
import type { RateObservationInsert } from './observations';
import type { NewRateCard, RateCardUpdate } from './types';

const RATES_KEY = ['rates'] as const;
const ROE_KEY = ['exchange-rate'] as const;
const OBS_KEY = ['observations'] as const;

function invalidateObs(client: ReturnType<typeof useQueryClient>) {
	client.invalidateQueries({ queryKey: OBS_KEY });
	client.invalidateQueries({ queryKey: ['hotel-observations'] });
}

export function useAllObservations() {
	return createQuery({ queryKey: OBS_KEY, queryFn: listAllObservations });
}

export function useCreateObservation() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: RateObservationInsert) => createObservation(input),
		onSuccess: () => invalidateObs(client)
	});
}

export function useUpdateObservation() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: Partial<RateObservationInsert> }) =>
			updateObservation(id, patch),
		onSuccess: () => invalidateObs(client)
	});
}

export function useDeleteObservation() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deleteObservation(id),
		onSuccess: () => invalidateObs(client)
	});
}

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
