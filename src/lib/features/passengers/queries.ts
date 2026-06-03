import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
	createPassenger,
	deletePassenger,
	getPassenger,
	listPassengerQueries,
	listPassengers,
	updatePassenger
} from './api';
import type { NewPassenger, PassengerUpdate } from './types';

const PASSENGERS_KEY = ['passengers'] as const;
const passengerKey = (id: string) => ['passengers', id] as const;
const passengerQueriesKey = (id: string) => ['passengers', id, 'queries'] as const;

export function usePassengers() {
	return createQuery({ queryKey: PASSENGERS_KEY, queryFn: listPassengers });
}

export function usePassenger(id: string) {
	return createQuery({ queryKey: passengerKey(id), queryFn: () => getPassenger(id) });
}

export function usePassengerQueries(id: string) {
	return createQuery({ queryKey: passengerQueriesKey(id), queryFn: () => listPassengerQueries(id) });
}

export function useCreatePassenger() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewPassenger) => createPassenger(input),
		onSuccess: () => client.invalidateQueries({ queryKey: PASSENGERS_KEY })
	});
}

export function useUpdatePassenger() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: PassengerUpdate }) =>
			updatePassenger(id, patch),
		onSuccess: (p) => {
			client.invalidateQueries({ queryKey: PASSENGERS_KEY });
			client.invalidateQueries({ queryKey: passengerKey(p.id) });
		}
	});
}

export function useDeletePassenger() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deletePassenger(id),
		onSuccess: () => client.invalidateQueries({ queryKey: PASSENGERS_KEY })
	});
}
