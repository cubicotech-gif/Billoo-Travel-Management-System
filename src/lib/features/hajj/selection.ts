import { availableOptions, availableRooms } from './calc';
import type { HajjCatalogue, HajjOptionCode, HajjPackage, HajjRoomType } from './types';

// A traveller's choice of price list, package, hotel option and room sharing.
// Changing any one field must leave the rest valid: the package has to belong
// to the catalogue, and the option/room must be ones the package actually
// prices. These helpers keep as much of the previous choice as still fits.

export interface Selection {
	catalogueId: string;
	packageId: string;
	option: HajjOptionCode;
	room: HajjRoomType;
}

const inCatalogue = (packages: HajjPackage[], catalogueId: string) =>
	packages.filter((p) => p.catalogue_id === catalogueId);

/** Make option and room valid for the selected package (keeping them if possible). */
export function normalize(packages: HajjPackage[], sel: Selection): Selection | null {
	const pkg = packages.find((p) => p.id === sel.packageId);
	if (!pkg) return null;
	const options = availableOptions(pkg);
	const option = options.includes(sel.option) ? sel.option : options[0];
	if (!option) return null;
	const rooms = availableRooms(pkg, option);
	const room = rooms.includes(sel.room) ? sel.room : rooms[0];
	if (!room) return null;
	return { catalogueId: pkg.catalogue_id, packageId: pkg.id, option, room };
}

/**
 * Switch price list. The same package code is kept when the other list has it
 * (UB004 in USD → UB004 in SAR), otherwise the first package of that list.
 */
export function pickCatalogue(
	packages: HajjPackage[],
	prev: Selection,
	catalogueId: string
): Selection | null {
	const code = packages.find((p) => p.id === prev.packageId)?.code;
	const list = inCatalogue(packages, catalogueId);
	const target = list.find((p) => p.code === code) ?? list[0];
	if (!target) return null;
	return normalize(packages, { ...prev, catalogueId, packageId: target.id });
}

export function pickPackage(
	packages: HajjPackage[],
	prev: Selection,
	packageId: string
): Selection | null {
	return normalize(packages, { ...prev, packageId });
}

export function pickOption(
	packages: HajjPackage[],
	prev: Selection,
	option: HajjOptionCode
): Selection | null {
	return normalize(packages, { ...prev, option });
}

/** A starting selection: the first package of a catalogue, option A, cheapest-sharing room. */
export function defaultSelection(
	packages: HajjPackage[],
	catalogues: HajjCatalogue[]
): Selection | null {
	for (const cat of catalogues) {
		const first = inCatalogue(packages, cat.id)[0];
		if (!first) continue;
		const sel = normalize(packages, {
			catalogueId: cat.id,
			packageId: first.id,
			option: 'A',
			room: 'Quad'
		});
		if (sel) return sel;
	}
	return null;
}

/**
 * Keep a markup when the package changes: the new selling price is the new
 * cost plus whatever margin was on the old one (same currency only). Across
 * currencies a margin can't carry over, so the new price starts at cost.
 */
export function carrySell(
	oldSell: number,
	oldCost: number | null,
	newCost: number,
	sameCurrency: boolean
): number {
	if (!sameCurrency || oldCost === null) return newCost;
	return Math.max(0, Math.round((newCost + (oldSell - oldCost)) * 100) / 100);
}
