import { describe, expect, it } from 'vitest';
import { renderStructured, type WhatsAppData } from './whatsapp';

const base: WhatsAppData = {
	totalNights: 9,
	packageType: 'Umrah',
	perPersonPkr: 185000,
	label: 'Premium',
	hotels: [
		{ city: 'Makkah', hotel: 'Hilton Suites', roomLines: ['Quad (4) ×1'], nights: 5, breakfast: true },
		{ city: 'Madinah', hotel: 'Anwar Al Madinah', roomLines: ['Quad (4) ×1'], nights: 4 }
	],
	visaType: 'Umrah',
	transferRoutes: ['Jeddah Airport → Makkah', 'Makkah → Madinah', 'Madinah → Madinah Airport'],
	ticketsIncluded: true,
	airlineName: 'Saudia',
	airlineRoute: 'KHI → JED → KHI'
};

describe('renderStructured (WhatsApp)', () => {
	it('renders the headline, per-person price and hotel blocks', () => {
		const out = renderStructured(base);
		expect(out).toContain('🌙 9 Nights Umrah Package (Premium) 🌙');
		expect(out).toContain('💰 PKR 185,000/- Per Person');
		expect(out).toContain('🕋 Makkah Accommodation');
		expect(out).toContain('🍳 Breakfast Included');
		expect(out).toContain('📅 5 Nights Stay');
	});

	it('collapses all transfer legs into a single Transfers line', () => {
		const out = renderStructured(base);
		expect(out).toContain('🚐 Private Transfers');
		expect(out).not.toContain('Jeddah Airport → Makkah');
		// only one transfers line regardless of leg count
		expect(out.match(/Private Transfers/g)).toHaveLength(1);
	});

	it('shows a combined multi-visa label without any price', () => {
		const out = renderStructured({ ...base, visaType: 'Umrah + Azerbaijan' });
		expect(out).toContain('🛂 Umrah + Azerbaijan Visa');
	});

	it('never prints an individual service price — only the per-person figure', () => {
		const out = renderStructured({
			...base,
			visaType: 'Masar + Non-Masar',
			otherServices: ['Polio certificate', 'Travel insurance']
		});
		expect(out).toContain('🛂 Masar + Non-Masar Visa');
		expect(out).not.toMatch(/Visa: PKR/);
		expect(out).toContain('➕ Polio certificate');
		expect(out).toContain('➕ Travel insurance');
		// The only money on the message is the per-person headline.
		expect(out.match(/PKR/g)?.length).toBe(1);
	});

	it('shows the airline name and route on the tickets line', () => {
		const out = renderStructured(base);
		expect(out).toContain('✈️ Saudia · KHI → JED → KHI');
	});

	it('falls back to a generic tickets line when airline detail is absent', () => {
		const out = renderStructured({ ...base, airlineName: null, airlineRoute: null });
		expect(out).toContain('✈️ Air Tickets');
	});

	it('omits optional lines when absent', () => {
		const out = renderStructured({ ...base, visaType: null, transferRoutes: [], ticketsIncluded: false });
		expect(out).not.toContain('Visa');
		expect(out).not.toContain('Private Transfers');
		expect(out).not.toContain('Air Tickets');
	});
});
