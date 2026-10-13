import {
	baseCost,
	computeQuote,
	type CalcAddonDef,
	type CalcTraveller,
	type QuoteResult
} from './calc';
import type {
	HajjAddon,
	HajjCatalogue,
	HajjCurrency,
	HajjPackage,
	HajjRoomType,
	HajjTraveller
} from './types';

export interface QuoteData {
	roe: number;
	travellers: HajjTraveller[];
	packages: HajjPackage[];
	addons: HajjAddon[];
	catalogues: HajjCatalogue[];
}

function addonDef(addon: HajjAddon, currency: HajjCurrency): CalcAddonDef {
	const roomPrices: Partial<Record<HajjRoomType, number>> = {};
	for (const p of addon.room_prices) roomPrices[p.room_type] = Number(p.price);
	return {
		id: addon.id,
		kind: addon.pricing_kind,
		currency,
		unitPrice: addon.unit_price === null ? null : Number(addon.unit_price),
		capacity: addon.capacity,
		roomPrices
	};
}

/**
 * Resolve stored travellers against the live catalogue and price the family.
 * Travellers whose package has vanished from the catalogue are priced at zero
 * (the builder flags them) rather than dropped.
 */
export function buildQuote(data: QuoteData): QuoteResult {
	const catById = new Map(data.catalogues.map((c) => [c.id, c]));
	const pkgById = new Map(data.packages.map((p) => [p.id, p]));
	const addonById = new Map(data.addons.map((a) => [a.id, a]));

	const travellers: CalcTraveller[] = data.travellers.map((t) => {
		const pkg = pkgById.get(t.package_id);
		const currency = (pkg && catById.get(pkg.catalogue_id)?.currency) || 'USD';
		return {
			id: t.id,
			currency,
			room: t.room_type,
			baseCost: pkg ? baseCost(pkg, t.option_code, t.room_type) : null,
			baseSell: Number(t.sell_price),
			ticketCost: Number(t.ticket_cost_pkr),
			ticketSell: Number(t.ticket_sell_pkr),
			commission: pkg?.commission_per_person == null ? 0 : Number(pkg.commission_per_person),
			extras: (t.extras ?? []).map((e) => ({
				id: e.id,
				label: e.label,
				currency: e.currency,
				cost: Number(e.cost),
				sell: Number(e.sell_price)
			})),
			addons: t.addons.flatMap((row) => {
				const addon = addonById.get(row.addon_id);
				if (!addon) return [];
				const cur = catById.get(addon.catalogue_id)?.currency ?? currency;
				return [
					{
						id: row.id,
						def: addonDef(addon, cur),
						qty: row.qty,
						costOverride: row.cost_override === null ? null : Number(row.cost_override),
						sellPrice: row.sell_price === null ? null : Number(row.sell_price),
						// `== null` (not `=== null`): before the settlement migration is applied the
						// column is simply absent, and must read as "not settled", not NaN.
						poolCost: row.pool_cost == null ? null : Number(row.pool_cost),
						poolSharers: row.pool_sharers ?? null
					}
				];
			})
		};
	});

	return computeQuote({ roe: data.roe, travellers });
}
