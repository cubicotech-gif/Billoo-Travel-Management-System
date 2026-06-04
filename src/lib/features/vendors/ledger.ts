import { supabase } from '$lib/supabase';
import type { Currency, Database } from '$lib/database.types';
import { toNumber } from '$lib/money';
import { toPkr } from '$features/bookings/totals';
import type { Vendor } from './types';

export type VendorPayment = Database['public']['Tables']['vendor_payments']['Row'];
export type NewVendorPayment = Database['public']['Tables']['vendor_payments']['Insert'];

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export async function getVendor(id: string): Promise<Vendor> {
	return unwrap(await supabase.from('vendors').select('*').eq('id', id).single());
}

// --- Charges (what we owe), derived from booking actuals -----------------

export interface VendorCharge {
	itemId: string;
	label: string;
	currency: Currency;
	actualCost: number;
	owedPkr: number;
	queryId: string | null;
	queryNumber: string | null;
	clientName: string | null;
}

interface ItemRow {
	id: string;
	label: string;
	currency: Currency;
	actual_cost: number;
	booking_id: string;
}

/** Detailed charges for one vendor (per booking line), with query context. */
export async function listVendorCharges(vendorId: string): Promise<VendorCharge[]> {
	const items = unwrap<ItemRow[]>(
		await supabase
			.from('booking_items')
			.select('id, label, currency, actual_cost, booking_id')
			.eq('vendor_id', vendorId)
	);
	if (items.length === 0) return [];

	const bookingIds = [...new Set(items.map((i) => i.booking_id))];
	const bookings = unwrap<{ id: string; roe: number; query_id: string | null }[]>(
		await supabase.from('bookings').select('id, roe, query_id').in('id', bookingIds)
	);
	const bookingById = new Map(bookings.map((b) => [b.id, b]));

	const queryIds = [...new Set(bookings.map((b) => b.query_id).filter((x): x is string => !!x))];
	const queries = queryIds.length
		? unwrap<{ id: string; query_number: string; client_name: string }[]>(
				await supabase.from('queries').select('id, query_number, client_name').in('id', queryIds)
			)
		: [];
	const queryById = new Map(queries.map((q) => [q.id, q]));

	return items.map((i) => {
		const b = bookingById.get(i.booking_id);
		const roe = Number(b?.roe ?? 1);
		const q = b?.query_id ? queryById.get(b.query_id) : null;
		return {
			itemId: i.id,
			label: i.label,
			currency: i.currency,
			actualCost: Number(i.actual_cost),
			owedPkr: toNumber(toPkr(Number(i.actual_cost), i.currency, roe)),
			queryId: b?.query_id ?? null,
			queryNumber: q?.query_number ?? null,
			clientName: q?.client_name ?? null
		};
	});
}

// --- Payments (what we paid) ---------------------------------------------

export async function listVendorPayments(vendorId: string): Promise<VendorPayment[]> {
	return unwrap(
		await supabase
			.from('vendor_payments')
			.select('*')
			.eq('vendor_id', vendorId)
			.order('payment_date', { ascending: false })
	);
}

export async function createVendorPayment(input: NewVendorPayment): Promise<VendorPayment> {
	return unwrap<VendorPayment>(
		await supabase.from('vendor_payments').insert(input).select().single()
	);
}

export async function deleteVendorPayment(id: string): Promise<void> {
	const { error } = await supabase.from('vendor_payments').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

export interface VendorLedger {
	charges: VendorCharge[];
	payments: VendorPayment[];
	owed: number;
	paid: number;
	balance: number;
}

export async function getVendorLedger(vendorId: string): Promise<VendorLedger> {
	const [charges, payments] = await Promise.all([
		listVendorCharges(vendorId),
		listVendorPayments(vendorId)
	]);
	const owed = charges.reduce((a, c) => a + c.owedPkr, 0);
	const paid = payments.reduce((a, p) => a + Number(p.amount), 0);
	return { charges, payments, owed, paid, balance: owed - paid };
}

// --- Aggregate balances for the Finance overview -------------------------

export interface VendorBalance {
	vendor: Vendor;
	owed: number;
	paid: number;
	balance: number;
}

export async function listVendorBalances(): Promise<VendorBalance[]> {
	const vendors = unwrap<Vendor[]>(
		await supabase.from('vendors').select('*').eq('is_deleted', false)
	);
	const items = unwrap<{ vendor_id: string | null; currency: Currency; actual_cost: number; booking_id: string }[]>(
		await supabase.from('booking_items').select('vendor_id, currency, actual_cost, booking_id').not('vendor_id', 'is', null)
	);
	const bookings = unwrap<{ id: string; roe: number }[]>(await supabase.from('bookings').select('id, roe'));
	const roeById = new Map(bookings.map((b) => [b.id, Number(b.roe)]));
	const payments = unwrap<{ vendor_id: string; amount: number }[]>(
		await supabase.from('vendor_payments').select('vendor_id, amount')
	);

	const owedByVendor = new Map<string, number>();
	for (const i of items) {
		if (!i.vendor_id) continue;
		const roe = roeById.get(i.booking_id) ?? 1;
		const pkr = toNumber(toPkr(Number(i.actual_cost), i.currency, roe));
		owedByVendor.set(i.vendor_id, (owedByVendor.get(i.vendor_id) ?? 0) + pkr);
	}
	const paidByVendor = new Map<string, number>();
	for (const p of payments) {
		paidByVendor.set(p.vendor_id, (paidByVendor.get(p.vendor_id) ?? 0) + Number(p.amount));
	}

	return vendors
		.map((vendor) => {
			const owed = owedByVendor.get(vendor.id) ?? 0;
			const paid = paidByVendor.get(vendor.id) ?? 0;
			return { vendor, owed, paid, balance: owed - paid };
		})
		.filter((b) => b.owed > 0 || b.paid > 0)
		.sort((a, b) => b.balance - a.balance);
}
