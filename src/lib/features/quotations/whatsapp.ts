// Renders the client-facing WhatsApp quotation as a clean, emoji-structured
// template, built from the quote inputs. The result is editable before sending
// and stored on the quotation.

export interface WhatsAppHotel {
	city: string;
	hotel: string;
	roomLines: string[]; // one line per room type, e.g. "Quad (4) ×1"
	nights: number;
}

export interface WhatsAppData {
	totalNights: number;
	packageType: string;
	perPersonPkr: number;
	label?: string | null;
	hotels: WhatsAppHotel[];
	visaType: string | null;
	transferRoutes: string[];
	ticketsIncluded: boolean;
}

function pkr(amount: number): string {
	return Math.round(amount).toLocaleString('en-US');
}

const CITY_EMOJI: Record<string, string> = { Makkah: '🕋', Madinah: '🕌' };

function hotelBlock(h: WhatsAppHotel): string[] {
	const emoji = CITY_EMOJI[h.city] ?? '🏙️';
	const out = [`${emoji} ${h.city} Accommodation`, `🏨 ${h.hotel}`];
	for (const line of h.roomLines) out.push(`🛏️ ${line}`);
	out.push(`📅 ${h.nights} Nights Stay`);
	return out;
}

export function renderStructured(d: WhatsAppData): string {
	const tier = d.label ? ` (${d.label})` : '';
	const lines: string[] = [
		`🌙 ${d.totalNights} Nights ${d.packageType} Package${tier} 🌙`,
		`Package Cost: PKR ${pkr(d.perPersonPkr)}/- Per Person`,
		''
	];

	for (const h of d.hotels) lines.push(...hotelBlock(h), '');

	lines.push('✅ Package Includes:');
	lines.push('');
	if (d.visaType) lines.push(`${d.visaType} Visa`);
	for (const route of d.transferRoutes) lines.push(route);
	if (d.ticketsIncluded) lines.push('Air Tickets');

	lines.push('');
	lines.push('📞 Contact us for booking and further details.');
	lines.push('Terms & Conditions Apply');

	return lines.join('\n');
}
