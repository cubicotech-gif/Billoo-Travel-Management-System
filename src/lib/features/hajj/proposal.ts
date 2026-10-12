import { buildQuote, type QuoteData } from './quote';
import { optionStays, summarizeStays, formatSpan, type Stay } from './catalogue';
import { PAYMENT_PLAN, PRICE_NOTE, SEASON_LABEL } from './content';
import type {
	HajjCatalogue,
	HajjCurrency,
	HajjDay,
	HajjOptionCode,
	HajjPackage,
	HajjRoomType
} from './types';
import { formatAmount as formatAmountRaw, money, multiply, subtract, toNumber } from '$lib/money';

// The client-facing proposal for a Hajj family quote. Built from the same
// buildQuote numbers as the builder, but it only ever carries SELLING prices —
// never cost, margin or commission. Used by the print page and the WhatsApp text.

export interface ProposalLine {
	kind: 'package' | 'addon' | 'ticket';
	label: string;
	amount: number;
	currency: HajjCurrency | 'PKR';
}

export interface ProposalTraveller {
	id: string;
	name: string;
	lines: ProposalLine[];
	/** Sell total per currency (package + add-ons), tickets excluded. */
	totals: Partial<Record<HajjCurrency, number>>;
	ticketPkr: number;
}

export interface ProposalGroup {
	key: string;
	pkg: HajjPackage;
	catalogue: HajjCatalogue;
	option: HajjOptionCode;
	room: HajjRoomType;
	currency: HajjCurrency;
	travellers: ProposalTraveller[];
	stays: Stay[];
	days: HajjDay[];
	span: string;
}

export interface ProposalTotals {
	byCurrency: { currency: HajjCurrency; sell: number }[];
	usd: number | null;
	sar: number | null;
	roe: number;
	/** SAR converted to PKR plus tickets; null when there is neither. */
	pkr: number | null;
	ticketPkr: number;
}

export interface Proposal {
	reference: string;
	clientName: string;
	clientPhone: string;
	travellerCount: number;
	groups: ProposalGroup[];
	totals: ProposalTotals;
	ticketQuoted: boolean;
	qurbaniQuoted: boolean;
	/** True when any group's package includes Aziziya accommodation. */
	anyAziziya: boolean;
}

export interface ProposalInput extends QuoteData {
	query: { client_name: string; client_phone: string; query_number: string; created_at: string };
	/** Display name per traveller id. */
	names: Record<string, string>;
	/** Itinerary rows per package id (loaded separately; may be empty). */
	days: Record<string, HajjDay[]>;
}

/** "BLO-2026-0001": the same reference the rest of the app shows for a query. */
export function referenceFor(q: { query_number: string; created_at: string }): string {
	return `BLO-${new Date(q.created_at).getFullYear()}-${q.query_number.slice(-4)}`;
}

export function buildProposal(input: ProposalInput): Proposal {
	const { query, names, days } = input;
	const result = buildQuote(input);
	const pkgById = new Map(input.packages.map((p) => [p.id, p]));
	const catById = new Map(input.catalogues.map((c) => [c.id, c]));
	const addonById = new Map(input.addons.map((a) => [a.id, a]));

	const groups = new Map<string, ProposalGroup>();
	let ticketQuoted = false;
	let qurbaniQuoted = false;

	for (const t of input.travellers) {
		const pkg = pkgById.get(t.package_id);
		const catalogue = pkg ? catById.get(pkg.catalogue_id) : undefined;
		const r = result.travellers.find((x) => x.id === t.id);
		if (!pkg || !catalogue || !r) continue;

		const lines: ProposalLine[] = [
			{ kind: 'package', label: pkg.title, amount: r.baseSell, currency: catalogue.currency }
		];
		for (const row of t.addons) {
			const addon = addonById.get(row.addon_id);
			const line = r.addons.find((l) => l.lineId === row.id);
			if (!addon || !line) continue;
			// Qurbani is recognised by its catalogue code, not its (editable) name.
			if (addon.code === 'qurbani') qurbaniQuoted = true;
			lines.push({
				kind: 'addon',
				label: row.qty > 1 ? `${addon.name} × ${row.qty}` : addon.name,
				amount: line.sell,
				currency: line.currency
			});
		}
		if (r.ticketSell > 0) {
			ticketQuoted = true;
			lines.push({
				kind: 'ticket',
				label: t.ticket_airline ? `Air ticket — ${t.ticket_airline}` : 'Air ticket',
				amount: r.ticketSell,
				currency: 'PKR'
			});
		}

		const totals: Partial<Record<HajjCurrency, number>> = {};
		for (const [cur, a] of Object.entries(r.amounts)) totals[cur as HajjCurrency] = a.sell;

		const traveller: ProposalTraveller = {
			id: t.id,
			name: names[t.id] ?? 'Traveller',
			lines,
			totals,
			ticketPkr: r.ticketSell
		};

		const key = `${pkg.id}|${t.option_code}|${t.room_type}`;
		let g = groups.get(key);
		if (!g) {
			const pkgDays = days[pkg.id] ?? [];
			g = {
				key,
				pkg,
				catalogue,
				option: t.option_code,
				room: t.room_type,
				currency: catalogue.currency,
				travellers: [],
				stays: optionStays(pkgDays, t.option_code),
				days: pkgDays,
				span: formatSpan(pkg.start_date, pkg.end_date)
			};
			groups.set(key, g);
		}
		g.travellers.push(traveller);
	}

	const sar = result.byCurrency.find((c) => c.currency === 'SAR')?.sell ?? null;
	const hasPkr = sar !== null || result.ticket.sell > 0;

	return {
		reference: referenceFor(query),
		clientName: query.client_name,
		clientPhone: query.client_phone,
		travellerCount: input.travellers.length,
		groups: [...groups.values()],
		totals: {
			byCurrency: result.byCurrency.map((c) => ({ currency: c.currency, sell: c.sell })),
			usd: result.usd?.sell ?? null,
			sar,
			roe: result.roe,
			pkr: hasPkr ? result.pkr.sell : null,
			ticketPkr: result.ticket.sell
		},
		ticketQuoted,
		qurbaniQuoted,
		anyAziziya: [...groups.values()].some((g) => g.pkg.has_aziziya)
	};
}

/** "Sharing" reads oddly on its own; the others are "Quad sharing" etc. */
export function roomLabel(room: HajjRoomType): string {
	return room === 'Sharing' ? 'Shared room' : `${room} sharing`;
}

export function minaCategory(c: HajjCatalogue): string | null {
	return c.mina_category ? `Maktab ${c.mina_category} category` : null;
}

/** Hotels as one line, e.g. "Makkah: Swissotel Makkah · Medinah: Dallah Taibah". */
export function hotelsLine(g: Pick<ProposalGroup, 'stays'>): string {
	return summarizeStays(g.stays);
}

// --- Payment plan -----------------------------------------------------------

export interface Instalment {
	label: string;
	percent: number;
	/** What falls due, per payable currency (PKR and/or USD — SAR is paid as PKR). */
	amounts: { currency: 'PKR' | 'USD'; amount: number }[];
}

/**
 * Split the totals over the payment plan. All but the last instalment are the
 * rounded percentage; the last is the remainder, so the parts always add up.
 */
export function instalments(totals: Pick<ProposalTotals, 'pkr' | 'usd'>): Instalment[] {
	const payable: { currency: 'PKR' | 'USD'; total: number }[] = [];
	if (totals.pkr !== null) payable.push({ currency: 'PKR', total: totals.pkr });
	if (totals.usd !== null) payable.push({ currency: 'USD', total: totals.usd });

	const paid = new Map<string, number>();
	return PAYMENT_PLAN.map((step, i) => {
		const last = i === PAYMENT_PLAN.length - 1;
		return {
			label: step.label,
			percent: step.percent,
			amounts: payable.map(({ currency, total }) => {
				const already = paid.get(currency) ?? 0;
				const amount = last
					? toNumber(subtract(money(total, currency), money(already, currency)))
					: toNumber(multiply(money(total, currency), step.percent / 100));
				paid.set(currency, already + amount);
				return { currency, amount };
			})
		};
	});
}

// --- WhatsApp ----------------------------------------------------------------

/** Plain spaces (Intl uses a no-break space after the currency code) for clean copy-paste. */
const formatAmount: typeof formatAmountRaw = (n, c) =>
	formatAmountRaw(n, c).replace(/\u00a0/g, ' ');

const ONE = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function groupLines(p: Proposal): string[] {
	const out: string[] = [];
	for (const g of p.groups) {
		out.push(`*${g.pkg.title}*${g.pkg.duration_label ? ` (${g.pkg.duration_label})` : ''}`);
		out.push(`📅 ${g.span}`);
		const hotels = hotelsLine(g);
		if (hotels) out.push(`🏨 ${hotels}`);
		out.push(`🛏 ${roomLabel(g.room)} · Hotel option ${g.option}`);
		const mina = minaCategory(g.catalogue);
		if (mina) out.push(`⛺ Mina: ${mina}`);
		for (const t of g.travellers) {
			const pkgLine = t.lines.find((l) => l.kind === 'package');
			const extras = t.lines.filter((l) => l.kind === 'addon');
			out.push(`👤 ${t.name} — ${pkgLine ? formatAmount(pkgLine.amount, g.currency) : ''}`);
			for (const e of extras)
				out.push(`   + ${e.label} — ${formatAmount(e.amount, e.currency as HajjCurrency)}`);
			const tk = t.lines.find((l) => l.kind === 'ticket');
			if (tk) out.push(`   + ${tk.label} — ${formatAmount(tk.amount, 'PKR')}`);
		}
		out.push('');
	}
	return out;
}

function totalLines(p: Proposal, heading = '*Total*'): string[] {
	const out: string[] = [heading];
	const { totals } = p;
	if (totals.sar !== null)
		out.push(
			`${formatAmount(totals.sar, 'SAR')} (SAR) @ ${totals.roe} = ${formatAmount(totals.sar * totals.roe, 'PKR')}`
		);
	if (totals.ticketPkr > 0) out.push(`Air tickets ${formatAmount(totals.ticketPkr, 'PKR')}`);
	if (totals.pkr !== null) out.push(`*Total in PKR: ${formatAmount(totals.pkr, 'PKR')}*`);
	if (totals.usd !== null)
		out.push(
			`*Total in USD: ${formatAmount(totals.usd, 'USD')}${totals.pkr !== null ? ' (payable separately)' : ''}*`
		);
	out.push('');
	return out;
}

function closingLines(
	flags: { ticketQuoted: boolean; qurbaniQuoted: boolean },
	opts: { validUntil?: string | null; brand?: string }
): string[] {
	const brand = opts.brand?.trim() || 'Billoo Travel';
	const out: string[] = [
		'✅ Includes: Makkah & Medinah hotels (half board), Mina & Arafat camps with meals, luxury buses for Mashaer days, Makkah–Medinah transfer, Ziyarat, Hajj training & guidance'
	];
	if (!flags.ticketQuoted || !flags.qurbaniQuoted)
		out.push(
			`❌ Not included: ${[!flags.ticketQuoted ? 'air ticket' : null, !flags.qurbaniQuoted ? 'Qurbani' : null].filter(Boolean).join(', ')}`
		);
	out.push(
		`💳 Payment: ${PAYMENT_PLAN.map((s) => `${s.percent}% ${s.label.charAt(0).toLowerCase()}${s.label.slice(1)}`).join(', ')}`
	);
	if (opts.validUntil) out.push(`⏳ Valid till ${opts.validUntil}`);
	out.push(PRICE_NOTE);
	out.push('');
	out.push('Reply to confirm and we will send the booking form.');
	out.push(`— ${brand}`);
	return out;
}

/**
 * Copy-paste WhatsApp version of the proposal: selling prices only, no vendor
 * name, no cost/margin. `validUntil` is an optional ISO date.
 */
export function proposalWhatsApp(
	p: Proposal,
	opts: { validUntil?: string | null; brand?: string } = {}
): string {
	return [
		`*${SEASON_LABEL.split(' · ')[0]} Package Proposal — ${p.clientName}*`,
		`${ONE(p.travellerCount, 'traveller')} · Ref ${p.reference}`,
		'',
		...groupLines(p),
		...totalLines(p),
		...closingLines(p, opts)
	].join('\n');
}

/**
 * WhatsApp text for several saved options ("Option 1 — Economy", …) of one
 * query. One option reads exactly like a plain proposal.
 */
export function proposalOptionsWhatsApp(
	options: { title: string; proposal: Proposal }[],
	opts: { validUntil?: string | null; brand?: string } = {}
): string {
	const first = options[0];
	if (!first) return '';
	if (options.length === 1) return proposalWhatsApp(first.proposal, opts);
	const p = first.proposal;
	const out: string[] = [
		`*${SEASON_LABEL.split(' · ')[0]} Package Proposal — ${p.clientName}*`,
		`${ONE(p.travellerCount, 'traveller')} · Ref ${p.reference}`,
		`${options.length} options for you to choose from:`,
		''
	];
	options.forEach((o, i) => {
		out.push(`━━━ *Option ${i + 1} — ${o.title}* ━━━`);
		out.push(...groupLines(o.proposal));
		out.push(...totalLines(o.proposal, `*Total — ${o.title}*`));
	});
	out.push(
		...closingLines(
			{
				ticketQuoted: options.every((o) => o.proposal.ticketQuoted),
				qurbaniQuoted: options.every((o) => o.proposal.qurbaniQuoted)
			},
			opts
		)
	);
	return out.join('\n');
}
