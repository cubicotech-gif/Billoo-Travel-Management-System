import type {
	Database,
	HajjCurrency,
	HajjOptionCode,
	HajjProposalSnapshot,
	HajjProposalStatus,
	HajjRoomType,
	HajjSnapshotTraveller
} from '$lib/database.types';

export type {
	HajjCurrency,
	HajjOptionCode,
	HajjProposalSnapshot,
	HajjProposalStatus,
	HajjRoomType,
	HajjSnapshotTraveller
};

type Tables = Database['public']['Tables'];

export type HajjCatalogue = Tables['hajj_catalogues']['Row'];
export type HajjPackageRow = Tables['hajj_packages']['Row'];
export type HajjOptionRow = Tables['hajj_package_options']['Row'];
export type HajjPriceRow = Tables['hajj_package_prices']['Row'];
export type HajjDay = Tables['hajj_package_days']['Row'];
export type HajjAddonRow = Tables['hajj_addons']['Row'];
export type HajjAddonRoomPrice = Tables['hajj_addon_room_prices']['Row'];

export type HajjQuote = Tables['hajj_quotes']['Row'];
export type HajjQuoteUpdate = Tables['hajj_quotes']['Update'];

export type HajjCommissionReceipt = Tables['hajj_commission_receipts']['Row'];
export type NewHajjCommissionReceipt = Tables['hajj_commission_receipts']['Insert'];

export type HajjVendorPayment = Tables['hajj_vendor_payments']['Row'];
export type NewHajjVendorPayment = Tables['hajj_vendor_payments']['Insert'];

export type HajjProposal = Tables['hajj_proposals']['Row'];
export type NewHajjProposal = Tables['hajj_proposals']['Insert'];
export type HajjProposalUpdate = Tables['hajj_proposals']['Update'];

export type HajjTravellerRow = Tables['hajj_travellers']['Row'];
export type NewHajjTraveller = Tables['hajj_travellers']['Insert'];
export type HajjTravellerUpdate = Tables['hajj_travellers']['Update'];

export type HajjTravellerExtraRow = Tables['hajj_traveller_extras']['Row'];
export type NewHajjTravellerExtra = Tables['hajj_traveller_extras']['Insert'];
export type HajjTravellerExtraUpdate = Tables['hajj_traveller_extras']['Update'];

export type HajjTravellerAddonRow = Tables['hajj_traveller_addons']['Row'];
export type NewHajjTravellerAddon = Tables['hajj_traveller_addons']['Insert'];
export type HajjTravellerAddonUpdate = Tables['hajj_traveller_addons']['Update'];

/** A package with its hotel options and their per-room prices. */
export interface HajjPackage extends HajjPackageRow {
	options: (HajjOptionRow & { prices: HajjPriceRow[] })[];
}

/** An add-on with its room-dependent prices. */
export interface HajjAddon extends HajjAddonRow {
	room_prices: HajjAddonRoomPrice[];
}

/** A traveller with the add-ons they have taken. */
export interface HajjTraveller extends HajjTravellerRow {
	addons: HajjTravellerAddonRow[];
	/** Other services (hand-entered). May be absent on older fixtures / before the migration. */
	extras?: HajjTravellerExtraRow[];
}

export const ROOM_TYPES: HajjRoomType[] = ['Sharing', 'Quad', 'Triple', 'Double'];

/** Default SAR → PKR rate for a new Hajj quote. */
export const DEFAULT_HAJJ_ROE = 77;
