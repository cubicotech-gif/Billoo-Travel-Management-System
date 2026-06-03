import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { createStaff, listStaff, removeStaff } from './api';

const STAFF_KEY = ['staff'] as const;

export function useStaff() {
	return createQuery({ queryKey: STAFF_KEY, queryFn: listStaff });
}

export function useCreateStaff() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (name: string) => createStaff(name),
		onSuccess: () => client.invalidateQueries({ queryKey: STAFF_KEY })
	});
}

export function useRemoveStaff() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => removeStaff(id),
		onSuccess: () => client.invalidateQueries({ queryKey: STAFF_KEY })
	});
}
