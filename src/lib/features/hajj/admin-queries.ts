import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
	addCommissionReceipt,
	addVendorPayment,
	deleteVendorPayment,
	listAllTravellers,
	listVendorPayments,
	deleteCommissionReceipt,
	listAllTravellerRefs,
	listCommissionReceipts,
	listQueryRefs,
	listSettledPoolLines,
	listTravellerRefs,
	setPackageCommission
} from './api';
import { resyncAllConfirmedHajj, settleAllGmc } from './booking';
import type { NewHajjCommissionReceipt, NewHajjVendorPayment } from './types';

// Hooks for the Hajj admin page: commission set-up and receipts, and the GMC pools.

const receiptsKey = ['hajj', 'commission-receipts'] as const;

/** Every Hajj traveller with the status of their query (who counts as confirmed). */
export function useHajjTravellerRefs() {
	return createQuery({
		queryKey: ['hajj', 'admin', 'traveller-refs'],
		queryFn: async () => {
			const travellers = await listAllTravellerRefs();
			const queries = await listQueryRefs([...new Set(travellers.map((t) => t.query_id))]);
			return { travellers, queries };
		}
	});
}

export function useCommissionReceipts() {
	return createQuery({ queryKey: receiptsKey, queryFn: listCommissionReceipts });
}

export function useAddCommissionReceipt() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewHajjCommissionReceipt) => addCommissionReceipt(input),
		onSuccess: () => client.invalidateQueries({ queryKey: receiptsKey })
	});
}

export function useDeleteCommissionReceipt() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deleteCommissionReceipt(id),
		onSuccess: () => client.invalidateQueries({ queryKey: receiptsKey })
	});
}

/** Set (or clear) a package's per-person commission; confirmed bookings are re-synced. */
export function useSetPackageCommission() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: async ({
			packageId,
			commission
		}: {
			packageId: string;
			commission: number | null;
		}) => {
			await setPackageCommission(packageId, commission);
			await resyncAllConfirmedHajj();
		},
		onSuccess: () => {
			client.invalidateQueries({ queryKey: ['hajj', 'packages'] });
			client.invalidateQueries({ queryKey: ['queries'] });
			client.invalidateQueries({ queryKey: ['booking'] });
		}
	});
}

/** Settled GMC lines, with the travellers and queries they belong to. */
export function useGmcPoolData() {
	return createQuery({
		queryKey: ['hajj', 'admin', 'pools'],
		queryFn: async () => {
			const lines = await listSettledPoolLines();
			const travellers = await listTravellerRefs([...new Set(lines.map((l) => l.traveller_id))]);
			const queries = await listQueryRefs([...new Set(travellers.map((t) => t.query_id))]);
			return { lines, travellers, queries };
		}
	});
}

/** Re-run the cross-client GMC settlement now. */
export function useSettleGmc() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: async () => {
			const affected = await settleAllGmc();
			await resyncAllConfirmedHajj();
			return affected;
		},
		onSuccess: () => {
			client.invalidateQueries({ queryKey: ['hajj'] });
			client.invalidateQueries({ queryKey: ['queries'] });
			client.invalidateQueries({ queryKey: ['booking'] });
		}
	});
}

// --- Vendor payables ----------------------------------------------------------

const vendorPaymentsKey = ['hajj', 'vendor-payments'] as const;

/** Every traveller (with add-ons) and the status of their query — the basis of what we owe. */
export function usePayablesData() {
	return createQuery({
		queryKey: ['hajj', 'admin', 'payables'],
		queryFn: async () => {
			const travellers = await listAllTravellers();
			const queries = await listQueryRefs([...new Set(travellers.map((t) => t.query_id))]);
			return { travellers, queries };
		}
	});
}

export function useVendorPayments() {
	return createQuery({ queryKey: vendorPaymentsKey, queryFn: listVendorPayments });
}

export function useAddVendorPayment() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (input: NewHajjVendorPayment) => addVendorPayment(input),
		onSuccess: () => client.invalidateQueries({ queryKey: vendorPaymentsKey })
	});
}

export function useDeleteVendorPayment() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (id: string) => deleteVendorPayment(id),
		onSuccess: () => client.invalidateQueries({ queryKey: vendorPaymentsKey })
	});
}
