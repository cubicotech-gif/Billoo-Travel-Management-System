import type { Database } from '$lib/database.types';

export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type NewVendor = Database['public']['Tables']['vendors']['Insert'];
export type VendorUpdate = Database['public']['Tables']['vendors']['Update'];

// A vendor can provide several service types. Flights are NOT vendor-based
// (Billoo issues tickets in-house on its own IATA), so 'Airline' is absent.
export const VENDOR_SERVICES = ['Hotel', 'Transfer', 'Visa', 'Ground Handling', 'Ziyarat/Tours'] as const;
export type VendorService = (typeof VENDOR_SERVICES)[number];

// The base `type` column is NOT NULL with a legacy CHECK — keep it in sync with
// the primary selected service.
const SERVICE_TO_TYPE: Record<VendorService, string> = {
	Hotel: 'Hotel',
	Transfer: 'Transport',
	Visa: 'Visa Service',
	'Ground Handling': 'Other',
	'Ziyarat/Tours': 'Tour Operator'
};
const TYPE_TO_SERVICE: Record<string, VendorService> = {
	Hotel: 'Hotel',
	Transport: 'Transfer',
	'Visa Service': 'Visa',
	'Tour Operator': 'Ziyarat/Tours'
};

export function primaryType(services: string[]): string {
	const first = services[0] as VendorService | undefined;
	return first ? (SERVICE_TO_TYPE[first] ?? 'Other') : 'Other';
}

/** Does this vendor offer the given service? Falls back to the legacy `type`. */
export function vendorHasService(v: Vendor, service: VendorService): boolean {
	if (v.service_types?.length) return v.service_types.includes(service);
	return TYPE_TO_SERVICE[v.type] === service;
}
