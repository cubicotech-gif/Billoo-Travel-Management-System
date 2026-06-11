import { supabase } from '$lib/supabase';
import { bestMatch } from '$features/quotations/fuzzy';
import { primaryType, vendorHasService, type VendorService } from './types';
import type { NewVendor, Vendor, VendorUpdate } from './types';

// Typed Supabase calls for vendors. Soft-delete only (history integrity).

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export async function listVendors(): Promise<Vendor[]> {
	return unwrap(
		await supabase
			.from('vendors')
			.select('*')
			.eq('is_deleted', false)
			.order('name', { ascending: true })
	);
}

export async function createVendor(input: NewVendor): Promise<Vendor> {
	return unwrap<Vendor>(await supabase.from('vendors').insert(input).select().single());
}

/**
 * Find-or-create a vendor by (fuzzy) name for a given service. Used by the
 * Package Builder's smart auto-save so a manually-typed vendor is persisted
 * once and reused next time. Returns the resolved vendor (existing or new).
 */
export async function ensureVendor(name: string, service: VendorService): Promise<Vendor> {
	const trimmed = name.trim();
	if (!trimmed) throw new Error('Vendor name required');
	const existing = await listVendors();
	const candidates = existing.filter((v) => vendorHasService(v, service));
	const match =
		bestMatch(trimmed, candidates, (v) => v.name) ?? bestMatch(trimmed, existing, (v) => v.name);
	if (match) {
		// Ensure the matched vendor advertises this service for next time.
		if (!vendorHasService(match, service)) {
			const service_types = [...new Set([...(match.service_types ?? []), service])];
			return updateVendor(match.id, { service_types });
		}
		return match;
	}
	return createVendor({ name: trimmed, type: primaryType([service]), service_types: [service] });
}

/** Insert many vendors at once (bulk import). Returns the count inserted. */
export async function bulkCreateVendors(rows: NewVendor[]): Promise<number> {
	if (rows.length === 0) return 0;
	const { error, data } = await supabase.from('vendors').insert(rows).select('id');
	if (error) throw new Error(error.message);
	return data?.length ?? 0;
}

export async function updateVendor(id: string, patch: VendorUpdate): Promise<Vendor> {
	return unwrap<Vendor>(await supabase.from('vendors').update(patch).eq('id', id).select().single());
}

/** Soft-delete: keep the row so historical bookings still resolve the vendor. */
export async function deleteVendor(id: string): Promise<void> {
	const { error } = await supabase
		.from('vendors')
		.update({ is_deleted: true, is_active: false })
		.eq('id', id);
	if (error) throw new Error(error.message);
}
