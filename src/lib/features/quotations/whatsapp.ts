// Renders the client-facing WhatsApp quotation as a clean, emoji-structured
// template, built from the quote inputs. The result is editable before sending
// and stored on the quotation.

export interface WhatsAppHotel {
	hotel: string;
	roomLines: string[]; // one line per room type, e.g. "Quad (4) ×1"
	nights: number;
}

export interface WhatsAppData {
	totalNights: number;
	packageType: string;
	perPersonPkr: number;
	label?: string | null;
	makkah: WhatsAppHotel | null;
	madinah: WhatsAppHotel | null;
	visaType: string | null;
	transferRoutes: string[];
	ticketsIncluded: boolean;
}

function pkr(amount: number): string {
	return Math.round(amount).toLocaleString('en-US');
}

function hotelBlock(emoji: string, heading: string, h: WhatsAppHotel): string[] {
	const out = [`${emoji} ${heading}`, `🏨 ${h.hotel}`];
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

	if (d.makkah) lines.push(...hotelBlock('🕋', 'Makkah Accommodation', d.makkah), '');
	if (d.madinah) lines.push(...hotelBlock('🕌', 'Madinah Accommodation', d.madinah), '');

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
