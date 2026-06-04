// WhatsApp helpers. Numbers are normalised to international form for wa.me.
// Default assumption is Pakistan (leading 0 -> 92) since that's the primary market.

export function waNumber(raw: string): string {
	let d = (raw ?? '').replace(/\D/g, '');
	if (!d) return '';
	if (d.startsWith('00')) d = d.slice(2);
	else if (d.startsWith('0')) d = '92' + d.slice(1);
	return d;
}

export function waLink(raw: string, text?: string): string {
	const n = waNumber(raw);
	if (!n) return '';
	return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
