import { describe, expect, it } from 'vitest';
import {
	carrySell,
	defaultSelection,
	normalize,
	pickCatalogue,
	pickOption,
	pickPackage,
	type Selection
} from './selection';
import type { HajjCatalogue, HajjPackage, HajjRoomType } from './types';

const opt = (id: string, code: 'A' | 'B', rooms: HajjRoomType[]) => ({
	id,
	package_id: '',
	code,
	label: null,
	created_at: '',
	prices: rooms.map((r) => ({
		id: `${id}-${r}`,
		option_id: id,
		room_type: r,
		price: 1000,
		created_at: '',
		updated_at: ''
	}))
});

const pkg = (id: string, catalogue: string, code: string, options: ReturnType<typeof opt>[]) =>
	({ id, catalogue_id: catalogue, code, options }) as unknown as HajjPackage;

const packages = [
	pkg('usd-1', 'usd', 'UB001', [
		opt('a1', 'A', ['Triple', 'Double']),
		opt('b1', 'B', ['Quad', 'Triple', 'Double'])
	]),
	pkg('usd-4', 'usd', 'UB004', [opt('a4', 'A', ['Quad', 'Triple', 'Double'])]),
	pkg('sar-1', 'sar', 'UB001', [opt('sa1', 'A', ['Triple']), opt('sb1', 'B', ['Quad'])]),
	pkg('sar-4', 'sar', 'UB004', [opt('sa4', 'A', ['Quad', 'Triple', 'Double'])])
];
const catalogues = [{ id: 'usd' }, { id: 'sar' }] as HajjCatalogue[];

const sel = (over: Partial<Selection> = {}): Selection => ({
	catalogueId: 'usd',
	packageId: 'usd-4',
	option: 'A',
	room: 'Quad',
	...over
});

describe('normalize', () => {
	it('keeps a valid selection untouched', () => {
		expect(normalize(packages, sel())).toEqual(sel());
	});

	it('drops the option to one the package offers', () => {
		expect(normalize(packages, sel({ option: 'B' }))?.option).toBe('A');
	});

	it('drops the room to one the option prices (UB001 A has no Quad)', () => {
		const out = normalize(packages, sel({ packageId: 'usd-1', room: 'Quad' }));
		expect(out).toMatchObject({ option: 'A', room: 'Triple' });
	});

	it('returns null for an unknown package', () => {
		expect(normalize(packages, sel({ packageId: 'nope' }))).toBeNull();
	});
});

describe('changing a field', () => {
	it('switching price list keeps the same package code', () => {
		const out = pickCatalogue(packages, sel(), 'sar');
		expect(out).toMatchObject({ catalogueId: 'sar', packageId: 'sar-4', room: 'Quad' });
	});

	it('switching price list falls back to a valid room in the other list', () => {
		const out = pickCatalogue(
			packages,
			sel({ packageId: 'usd-1', option: 'A', room: 'Double' }),
			'sar'
		);
		expect(out).toMatchObject({ packageId: 'sar-1', option: 'A', room: 'Triple' });
	});

	it('switching package keeps the option and room when they still exist', () => {
		const out = pickPackage(packages, sel({ room: 'Triple' }), 'usd-1');
		expect(out).toMatchObject({ packageId: 'usd-1', room: 'Triple' });
	});

	it('switching option re-validates the room', () => {
		const out = pickOption(packages, sel({ packageId: 'usd-1', option: 'A', room: 'Triple' }), 'B');
		expect(out).toMatchObject({ option: 'B', room: 'Triple' });
	});
});

describe('defaultSelection', () => {
	it('starts at the first package of the first list', () => {
		expect(defaultSelection(packages, catalogues)).toMatchObject({
			catalogueId: 'usd',
			packageId: 'usd-1'
		});
	});

	it('is null when there is no catalogue data', () => {
		expect(defaultSelection([], catalogues)).toBeNull();
	});
});

describe('carrySell', () => {
	it('keeps the markup when the package changes within a currency', () => {
		expect(carrySell(15500, 14950, 16300, true)).toBe(16850);
	});

	it('keeps a below-cost sale below cost by the same amount', () => {
		expect(carrySell(50000, 54500, 59500, true)).toBe(55000);
	});

	it('never goes negative', () => {
		expect(carrySell(0, 1000, 100, true)).toBe(0);
	});

	it('starts at cost when the currency changes', () => {
		expect(carrySell(15500, 14950, 56000, false)).toBe(56000);
	});

	it('starts at cost when there was no previous cost', () => {
		expect(carrySell(0, null, 16300, true)).toBe(16300);
	});
});
