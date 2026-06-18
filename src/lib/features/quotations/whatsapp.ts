// Renders the client-facing WhatsApp quotation as a clean, emoji-structured
// template, built from the quote inputs. The result is editable before sending
// and stored on the quotation.

export interface WhatsAppHotel {
	city: string;
	hotel: string;
	roomLines: string[]; // one line per room type, e.g. "Quad (4) ×1"
	nights: number;
	breakfast?: boolean;
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
	airlineName?: string | null;
	airlineRoute?: string | null;
	/** Extra add-ons shown as their own lines, e.g. "Polio certificate". */
	otherServices?: string[];
}

function pkr(amount: number): string {
	return Math.round(amount).toLocaleString('en-US');
}

const CITY_EMOJI: Record<string, string> = { Makkah: '🕋', Madinah: '🕌' };

function hotelBlock(h: WhatsAppHotel): string[] {
	const emoji = CITY_EMOJI[h.city] ?? '🏙️';
	const out = [`${emoji} ${h.city} Accommodation`, `🏨 ${h.hotel}`];
	for (const line of h.roomLines) out.push(`🛏️ ${line}`);
	if (h.breakfast) out.push('🍳 Breakfast Included');
	out.push(`📅 ${h.nights} Nights Stay`);
	return out;
}

export function renderStructured(d: WhatsAppData): string {
	const tier = d.label ? ` (${d.label})` : '';
	const lines: string[] = [
		`🌙 ${d.totalNights} Nights ${d.packageType} Package${tier} 🌙`,
		'',
		// The per-person price is the only figure shown — it already bundles every
		// service (visa included). We never print an individual service's price.
		`💰 PKR ${pkr(d.perPersonPkr)}/- Per Person`,
		''
	];

	for (const h of d.hotels) lines.push(...hotelBlock(h), '');

	lines.push('✅ Package Includes:');
	if (d.visaType) lines.push(`🛂 ${d.visaType} Visa`);
	// Transfers collapse to a single line — clients don't need each leg spelled out.
	if (d.transferRoutes.length) lines.push('🚐 Private Transfers');
	if (d.ticketsIncluded) {
		// Show the airline + route when we have them, e.g. "✈️ Saudia · KHI → JED → KHI".
		const detail = [d.airlineName, d.airlineRoute].filter(Boolean).join(' · ');
		lines.push(detail ? `✈️ ${detail}` : '✈️ Air Tickets');
	}
	for (const s of d.otherServices ?? []) lines.push(`➕ ${s}`);

	lines.push('');
	lines.push('📞 Contact us for booking and further details.');
	lines.push('Terms & Conditions Apply');

	return lines.join('\n');
}
