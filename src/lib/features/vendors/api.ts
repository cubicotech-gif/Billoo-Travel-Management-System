import { supabase } from '$lib/supabase';
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
