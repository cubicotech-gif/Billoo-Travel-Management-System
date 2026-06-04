import { describe, expect, it } from 'vitest';
import { quotationToForm } from './edit-map';
import type { Quotation, QuotationLine } from './types';

function line(partial: Partial<QuotationLine>): QuotationLine {
	return {
		id: 'l',
		quotation_id: 'q',
		line_type: 'hotel',
		label: '',
		rate_card_id: null,
		vendor_id: null,
		currency: 'SAR',
		unit_cost: 0,
		unit_sell: 0,
		quantity: 1,
		line_cost: 0,
		line_sell: 0,
		meta: {},
		created_at: '',
		...partial
	};
}

const quotation = {
	id: 'q',
	roe: 78,
	adults: 4,
	children: 1,
	infants: 0,
	label: 'Gold',
	pp_include_infants: false
} as unknown as Quotation;

describe('quotationToForm (edit reopen)', () => {
	it('maps hotels (mixed rooms), transfer, visa and tickets back into the form', () => {
		const lines: QuotationLine[] = [
			line({ line_type: 'hotel', unit_cost: 200, unit_sell: 250, meta: { city: 'Makkah', hotel: 'Hilton', room_type: 'Quad', occupancy: 4, qty: 1, nights: 5, check_in: '2026-03-03', check_out: '2026-03-08' } }),
			line({ line_type: 'hotel', unit_cost: 150, unit_sell: 190, meta: { city: 'Makkah', hotel: 'Hilton', room_type: 'Double', occupancy: 2, qty: 1, nights: 5 } }),
			line({ line_type: 'transfer', unit_cost: 300, unit_sell: 380, quantity: 2, meta: { vehicle_type: '7-seater', route: 'Airport → Makkah' } }),
			line({ line_type: 'visa', unit_cost: 180, unit_sell: 220, meta: { visa_type: 'Umrah' } }),
			line({ line_type: 'ticket', currency: 'PKR', unit_cost: 150000, unit_sell: 180000, label: 'Saudia (adult ×4)', meta: { pax_type: 'adult' } })
		];

		const form = quotationToForm(quotation, lines);

		expect(form.roeValue).toBe(78);
		expect(form.adults).toBe(4);
		expect(form.label).toBe('Gold');

		// Makkah hotel slot with two room types preserved.
		const makkah = form.hotels.find((h) => h.city === 'Makkah')!;
		expect(makkah.name).toBe('Hilton');
		expect(makkah.nights).toBe(5);
		expect(makkah.checkIn).toBe('2026-03-03');
		expect(makkah.rooms).toHaveLength(2);
		expect(makkah.rooms[0]).toMatchObject({ rt: 'Quad', qty: 1, cost: 200, sell: 250 });

		expect(form.transfers[0]).toMatchObject({ vehicle: '7-seater', route: 'Airport → Makkah', vehicles: 2, sell: 380 });
		expect(form.visa).toMatchObject({ include: true, type: 'Umrah', sell: 220 });
		expect(form.airlineInclude).toBe(true);
		expect(form.airline.name).toBe('Saudia');
		expect(form.airline.adultSell).toBe(180000);
	});

	it('maps custom room type / route / Other visa', () => {
		const lines: QuotationLine[] = [
			line({ line_type: 'hotel', meta: { city: 'Madinah', hotel: 'X', room_type: 'Penthouse', occupancy: 6, qty: 1, nights: 3 } }),
			line({ line_type: 'transfer', meta: { vehicle_type: 'Bus', route: 'Makkah → Taif' } }),
			line({ line_type: 'visa', meta: { visa_type: 'Work' } })
		];
		const form = quotationToForm(quotation, lines);
		const madinah = form.hotels.find((h) => h.city === 'Madinah')!;
		expect(madinah.rooms[0]).toMatchObject({ rt: 'Custom', customLabel: 'Penthouse', occupancy: 6 });
		expect(form.transfers[0]).toMatchObject({ vehicle: 'Custom', customVehicle: 'Bus', route: 'Custom', customRoute: 'Makkah → Taif' });
		expect(form.visa).toMatchObject({ type: 'Other', otherLabel: 'Work' });
	});
});
