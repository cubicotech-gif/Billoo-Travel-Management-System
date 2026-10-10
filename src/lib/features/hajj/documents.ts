import { convertToPkr, money, subtract, sum, toNumber } from '$lib/money';
import type { Proposal } from './proposal';
import { roomLabel } from './proposal';
import type { HajjCurrency } from './types';

// Pure models for the client's Hajj invoice. Selling prices only — never cost,
// margin or commission. Payments, discounts and balances are PKR (the app's
// books); SAR converts at the quote ROE and USD at the quote's USD rate.

export interface InvoiceRow {
	traveller: string;
	/** True on the first row of each traveller (the name is printed once). */
	first: boolean;
	description: string;
	currency: HajjCurrency | 'PKR';
	amount: number;
	/** The PKR value; null for a USD charge when no USD rate is set. */
	amountPkr: number | null;
}

export interface PaymentLine {
	status: string;
	amount: number;
	paid_date: string | null;
	due_date: string | null;
	label: string;
	method: string | null;
	created_at: string;
}

export interface InvoiceModel {
	rows: InvoiceRow[];
	/** Sum of the PKR-convertible charges. */
	subtotalPkr: number;
	discountPkr: number;
	payablePkr: number;
	paidPkr: number;
	balancePkr: number;
	/** USD charges that are NOT in the PKR figures because no USD rate is set. */
	usdOutstanding: number | null;
	received: { date: string; amount: number; method: string | null }[];
	/** Scheduled (unpaid) instalments, soonest first. */
	upcoming: { label: string; amount: number; due: string | null }[];
}

export function lineToPkr(
	amount: number,
	currency: HajjCurrency | 'PKR',
	roe: number,
	usdRate: number | null
): number | null {
	if (currency === 'PKR') return amount;
	if (currency === 'SAR') return toNumber(convertToPkr(money(amount, 'SAR'), roe));
	return usdRate && usdRate > 0 ? toNumber(convertToPkr(money(amount, 'USD'), usdRate)) : null;
}

export function invoiceModel(
	proposal: Proposal,
	opts: {
		roe: number;
		usdRate: number | null;
		discountPkr: number;
		payments: PaymentLine[];
	}
): InvoiceModel {
	const rows: InvoiceRow[] = [];
	for (const g of proposal.groups)
		for (const t of g.travellers)
			t.lines.forEach((l, i) => {
				const description =
					l.kind === 'package'
						? `Hajj package — ${g.pkg.title}${g.pkg.duration_label ? ` (${g.pkg.duration_label})` : ''} · ${roomLabel(g.room)} · Option ${g.option}`
						: l.label;
				rows.push({
					traveller: t.name,
					first: i === 0,
					description,
					currency: l.currency,
					amount: l.amount,
					amountPkr: lineToPkr(l.amount, l.currency, opts.roe, opts.usdRate)
				});
			});

	const subtotal = sum(
		rows.filter((r) => r.amountPkr !== null).map((r) => money(r.amountPkr as number, 'PKR')),
		'PKR'
	);
	const discount = money(Math.max(0, opts.discountPkr), 'PKR');
	const payable = subtract(subtotal, discount);
	const paidRows = opts.payments.filter((p) => p.status === 'paid');
	const paid = sum(
		paidRows.map((p) => money(Number(p.amount), 'PKR')),
		'PKR'
	);

	const usdRows = rows.filter((r) => r.currency === 'USD' && r.amountPkr === null);
	const usdOutstanding = usdRows.length
		? toNumber(
				sum(
					usdRows.map((r) => money(r.amount, 'USD')),
					'USD'
				)
			)
		: null;

	return {
		rows,
		subtotalPkr: toNumber(subtotal),
		discountPkr: toNumber(discount),
		payablePkr: Math.max(0, toNumber(payable)),
		paidPkr: toNumber(paid),
		balancePkr: toNumber(subtract(payable, paid)),
		usdOutstanding,
		received: paidRows
			.map((p) => ({
				date: p.paid_date ?? p.created_at,
				amount: Number(p.amount),
				method: p.method
			}))
			.sort((a, b) => a.date.localeCompare(b.date)),
		upcoming: opts.payments
			.filter((p) => p.status !== 'paid')
			.map((p) => ({ label: p.label, amount: Number(p.amount), due: p.due_date }))
			.sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
	};
}
