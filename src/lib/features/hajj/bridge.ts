import { convertToPkr, money, subtract, add, toNumber } from '$lib/money';
import type { QuoteResult } from './calc';

// Bridge from a Hajj quote to the app's PKR-based money (finance, payments, the
// booking lifecycle all work in PKR). SAR converts at the quote's ROE and USD at
// a USD→PKR rate; tickets are already PKR. The vendor's commission is money we
// receive, so the books carry cost NET of commission.

export interface FinanceBridge {
	/** What the client owes, in PKR (USD included only when a rate is set). */
	sellPkr: number;
	/** Vendor cost minus commission, in PKR. */
	costPkr: number;
	grossCostPkr: number;
	commissionPkr: number;
	profitPkr: number;
	/** The quote has USD charges but no USD rate: they are NOT in the figures above. */
	usdMissingRate: boolean;
}

export function financeBridge(result: QuoteResult, usdRate: number | null): FinanceBridge {
	const rate = usdRate && usdRate > 0 ? usdRate : null;
	const usd = result.usd;

	let sell = money(result.pkr.sell, 'PKR');
	let gross = money(result.pkr.cost, 'PKR');
	let commission = convertToPkr(money(result.commission.SAR ?? 0, 'SAR'), result.roe);

	if (usd && rate) {
		sell = add(sell, convertToPkr(money(usd.sell, 'USD'), rate));
		gross = add(gross, convertToPkr(money(usd.cost, 'USD'), rate));
	}
	if (rate)
		commission = add(commission, convertToPkr(money(result.commission.USD ?? 0, 'USD'), rate));

	const net = subtract(gross, commission);
	return {
		sellPkr: toNumber(sell),
		costPkr: toNumber(net),
		grossCostPkr: toNumber(gross),
		commissionPkr: toNumber(commission),
		profitPkr: toNumber(subtract(sell, net)),
		usdMissingRate: !!usd && !rate
	};
}
