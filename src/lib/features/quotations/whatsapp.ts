import type { PaxCounts, QuotationResult } from './calculator';

// Renders the client-facing WhatsApp quotation. Per the chosen format this is
// a *bundled* total — a package summary and one PKR price, no line prices.

export interface QuoteContext {
	packageType: string;
	passengerName: string;
	pax: PaxCounts;
	nightsMakkah?: number | null;
	nightsMadinah?: number | null;
	label?: string | null;
	perPersonPkr?: number | null;
}

function pkr(amount: number): string {
	return `PKR ${Math.round(amount).toLocaleString('en-US')}`;
}

function paxLine(pax: PaxCounts): string {
	const parts: string[] = [];
	if (pax.adults) parts.push(`${pax.adults} adult${pax.adults === 1 ? '' : 's'}`);
	if (pax.children) parts.push(`${pax.children} child${pax.children === 1 ? '' : 'ren'}`);
	if (pax.infants) parts.push(`${pax.infants} infant${pax.infants === 1 ? '' : 's'}`);
	return parts.join(' · ');
}

function nightsLine(ctx: QuoteContext): string {
	const parts: string[] = [];
	if (ctx.nightsMakkah) parts.push(`Makkah ${ctx.nightsMakkah}N`);
	if (ctx.nightsMadinah) parts.push(`Madinah ${ctx.nightsMadinah}N`);
	return parts.join(' · ');
}

export function renderWhatsApp(ctx: QuoteContext, result: QuotationResult): string {
	const tier = ctx.label ? ` (${ctx.label})` : '';
	const lines = [`*${ctx.packageType} Package — ${ctx.passengerName}${tier}*`];

	const pax = paxLine(ctx.pax);
	if (pax) lines.push(pax);

	const nights = nightsLine(ctx);
	if (nights) lines.push(nights);

	lines.push('Includes hotels, transfers, visa & tickets');
	lines.push('');
	lines.push(`Total: *${pkr(result.totalSellPkr)}*`);
	if (ctx.perPersonPkr && ctx.perPersonPkr > 0) {
		lines.push(`Per person: *${pkr(ctx.perPersonPkr)}*`);
	}

	return lines.join('\n');
}
