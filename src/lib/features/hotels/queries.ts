import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { createHotel, listHotels } from './api';
import type { NewHotel } from './types';

const HOTELS_KEY = ['hotels'] as const;

export function useHotels() {
	return createQuery({ queryKey: HOTELS_KEY, queryFn: listHotels });
}

export function useCreateHotel() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewHotel) => createHotel(input),
		onSuccess: () => client.invalidateQueries({ queryKey: HOTELS_KEY })
	});
}
