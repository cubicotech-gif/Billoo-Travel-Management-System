import type { Database } from '$lib/database.types';

export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type NewVendor = Database['public']['Tables']['vendors']['Insert'];
export type VendorUpdate = Database['public']['Tables']['vendors']['Update'];

// The supplier categories the agency books from (matches the DB CHECK).
export const VENDOR_TYPES = [
	'Hotel',
	'Transport',
	'Visa Service',
	'Airline',
	'Tour Operator',
	'Insurance',
	'Other'
] as const;
