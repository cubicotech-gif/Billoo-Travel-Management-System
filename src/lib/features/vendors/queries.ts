import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { createVendor, deleteVendor, listVendors, updateVendor } from './api';
import {
	createVendorPayment,
	deleteVendorPayment,
	getVendor,
	getVendorLedger,
	listVendorBalances,
	type NewVendorPayment
} from './ledger';
import type { NewVendor, VendorUpdate } from './types';

const VENDORS_KEY = ['vendors'] as const;
const vendorKey = (id: string) => ['vendors', id] as const;
const ledgerKey = (id: string) => ['vendor-ledger', id] as const;
const BALANCES_KEY = ['vendor-balances'] as const;

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

// --- Ledger -------------------------------------------------------------

export function useVendor(id: string) {
	return createQuery({ queryKey: vendorKey(id), queryFn: () => getVendor(id) });
}

export function useVendorLedger(id: string) {
	return createQuery({ queryKey: ledgerKey(id), queryFn: () => getVendorLedger(id) });
}

export function useVendorBalances() {
	return createQuery({ queryKey: BALANCES_KEY, queryFn: listVendorBalances });
}

export function useCreateVendorPayment(vendorId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewVendorPayment) => createVendorPayment(input),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: ledgerKey(vendorId) });
			client.invalidateQueries({ queryKey: BALANCES_KEY });
		}
	});
}

export function useDeleteVendorPayment(vendorId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deleteVendorPayment(id),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: ledgerKey(vendorId) });
			client.invalidateQueries({ queryKey: BALANCES_KEY });
		}
	});
}
