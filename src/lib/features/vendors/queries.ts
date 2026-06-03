import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { createVendor, deleteVendor, listVendors, updateVendor } from './api';
import type { NewVendor, VendorUpdate } from './types';

const VENDORS_KEY = ['vendors'] as const;

export function useVendors() {
	return createQuery({ queryKey: VENDORS_KEY, queryFn: listVendors });
}

export function useCreateVendor() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewVendor) => createVendor(input),
		onSuccess: () => client.invalidateQueries({ queryKey: VENDORS_KEY })
	});
}

export function useUpdateVendor() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: VendorUpdate }) => updateVendor(id, patch),
		onSuccess: () => client.invalidateQueries({ queryKey: VENDORS_KEY })
	});
}

export function useDeleteVendor() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deleteVendor(id),
		onSuccess: () => client.invalidateQueries({ queryKey: VENDORS_KEY })
	});
}
