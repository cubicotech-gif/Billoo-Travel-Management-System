<script lang="ts">
	import { ArrowLeft, Printer } from 'lucide-svelte';
	import { Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import type { Currency, QuotationLineType } from '$lib/database.types';
	import { getQuery } from '$features/queries/api';
	import { getBookingForQuery, listBookingItems } from '$features/bookings/api';
	import { listQuotations, getQuotationLines } from '$features/quotations/api';
	import type { Query } from '$features/queries/types';

	// Client confirmation document, styled after the agency's manual voucher:
	// branded header, blue section bars and per-service breakdown tables
	// (passenger/visa, transfers, accommodation). The 'voucher' kind additionally
	// prints the charges + total; 'itinerary' is price-free. Reads the live
	// booking items, falling back to the latest quotation so it always has data.
	let { queryId, kind }: { queryId: string; kind: 'voucher' | 'itinerary' } = $props();

	interface Row {
		lineType: QuotationLineType;
		label: string;
		currency: Currency;
		amount: number;
		meta: Record<string, unknown>;
	}

	let query = $state<Query | null>(null);
	let rows = $state<Row[]>([]);
	let totalPkr = $state(0);
	let ref = $state('');
	let loaded = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (loaded) return;
		loaded = true;
		(async () => {
			try {
				query = await getQuery(queryId);
				const booking = await getBookingForQuery(queryId);
				if (booking) {
					const items = await listBookingItems(booking.id);
					rows = items.map((i) => ({
						lineType: i.line_type,
						label: i.label,
						currency: i.currency,
						amount: Number(i.actual_sell),
						meta: i.meta ?? {}
					}));
					totalPkr = Number(booking.actual_sell_pkr);
					ref = booking.id.slice(0, 6).toUpperCase();
				} else {
					const quotes = await listQuotations(queryId);
					const accepted = quotes.find((q) => q.status === 'accepted') ?? quotes[0];
					if (accepted) {
						const lines = await getQuotationLines(accepted.id);
						rows = lines.map((l) => ({
							lineType: l.line_type,
							label: l.label,
							currency: l.currency,
							amount: Number(l.line_sell),
							meta: l.meta ?? {}
						}));
						totalPkr = Number(accepted.total_sell_pkr);
						ref = accepted.id.slice(0, 6).toUpperCase();
					}
				}
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to load';
			}
		})();
	});

	const isVoucher = $derived(kind === 'voucher');

	// Accommodation = hotel room lines (skip the breakfast/meal helper lines).
	const stays = $derived(rows.filter((r) => r.lineType === 'hotel' && r.meta?.kind !== 'breakfast'));
	const transfers = $derived(rows.filter((r) => r.lineType === 'transfer'));
	const visas = $derived(rows.filter((r) => r.lineType === 'visa'));
	const tickets = $derived(rows.filter((r) => r.lineType === 'ticket'));

	function str(meta: Record<string, unknown>, key: string): string {
		const v = meta[key];
		return v == null ? '' : String(v);
	}
	function fmtDate(value: string): string {
		if (!value) return '';
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	}
	const MEALS: Record<string, string> = { RO: 'R/O', BB: 'B/B', HB: 'H/B', FB: 'F/B' };
	function meal(m: string): string {
		return MEALS[m] ?? (m || 'R/O');
	}
	// Split "A → B" (or ->, /, " to ") into pick-up / drop-off.
	function legs(route: string): { from: string; to: string } {
		const parts = route.split(/→|->|\s+to\s+|\s\/\s/i).map((p) => p.trim());
		return { from: parts[0] ?? route, to: parts[1] ?? '' };
	}
	function pax(): string {
		if (!query) return '';
		const bits = [`${query.adults} Adult${query.adults === 1 ? '' : 's'}`];
		if (query.children) bits.push(`${query.children} Child`);
		if (query.infants) bits.push(`${query.infants} Infant`);
		return bits.join(' · ');
	}
</script>

<div class="no-print mb-4 flex items-center justify-between">
	<a href="/queries/{queryId}" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
		<ArrowLeft class="h-4 w-4" /> Back to query
	</a>
	<Button onclick={() => window.print()}><Printer class="h-4 w-4" /> Print / Save PDF</Button>
</div>

{#if error}
	<p class="text-red-600">{error}</p>
{:else if !query}
	<p class="text-slate-400">Loading…</p>
{:else}
	<div class="mx-auto max-w-3xl bg-white p-8 text-slate-800 shadow-sm print:shadow-none">
		<!-- Letterhead -->
		<div class="mb-4 flex items-start justify-between gap-4 border-b-2 border-brand-600 pb-4">
			<div>
				<div class="text-2xl font-extrabold tracking-tight text-brand-700">Billoo<span class="font-light text-slate-500"> Travels</span></div>
				<div class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Since 1969 · Umrah & Travel</div>
			</div>
			<div class="text-right" dir="rtl">
				<div class="text-base font-semibold text-emerald-700">اللّٰهُمَّ اجعل هذه العُمرة مبرورة</div>
				<div class="text-base font-semibold text-emerald-700">وذنبنا مغفورا</div>
			</div>
		</div>

		<!-- Confirmation banner -->
		<div class="mb-5 text-center">
			<div class="text-sm font-semibold italic text-brand-700">
				{isVoucher ? 'We are Pleased To Confirm your Booking' : 'Your Travel Itinerary'}
			</div>
			<div class="mt-1 text-base font-bold uppercase text-slate-800">{query.client_name}</div>
			<div class="text-xs text-slate-500">
				{query.package_type ?? query.destination} · {pax()}
				<span class="ml-2 font-mono text-slate-400">Ref {ref}</span>
			</div>
		</div>

		<!-- Passenger / Visa details -->
		{#if visas.length || tickets.length}
			<div class="mb-4 overflow-hidden rounded border border-slate-200">
				<div class="bg-brand-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Passenger Details</div>
				<table class="w-full text-xs">
					<thead class="bg-slate-50 text-left uppercase tracking-wide text-slate-400">
						<tr>
							<th class="px-3 py-1.5 font-semibold">Description</th>
							<th class="px-3 py-1.5 text-center font-semibold">Adult</th>
							<th class="px-3 py-1.5 text-center font-semibold">Child</th>
							<th class="px-3 py-1.5 text-center font-semibold">Infant</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each visas as v, i (i)}
							<tr>
								<td class="px-3 py-2 font-medium text-slate-700">
									{(str(v.meta, 'visa_type') || 'Umrah').toUpperCase()} VISA FOR {str(v.meta, 'persons') || (query.adults + query.children + query.infants)} PERSON(S)
								</td>
								<td class="px-3 py-2 text-center">{query.adults}</td>
								<td class="px-3 py-2 text-center">{query.children}</td>
								<td class="px-3 py-2 text-center">{query.infants}</td>
							</tr>
						{/each}
						{#each tickets as t, i (i)}
							<tr>
								<td class="px-3 py-2 font-medium text-slate-700">
									{t.label}{str(t.meta, 'pnr') ? ` · PNR ${str(t.meta, 'pnr')}` : ''}{str(t.meta, 'route') ? ` · ${str(t.meta, 'route')}` : ''}
								</td>
								<td class="px-3 py-2 text-center" colspan="3">{str(t.meta, 'fare_class') || 'Air ticket'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Transfer details -->
		{#if transfers.length}
			<div class="mb-4 overflow-hidden rounded border border-slate-200">
				<div class="bg-brand-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Transfer Details</div>
				<table class="w-full text-xs">
					<thead class="bg-slate-50 text-left uppercase tracking-wide text-slate-400">
						<tr>
							<th class="px-3 py-1.5 font-semibold">Vehicle</th>
							<th class="px-3 py-1.5 font-semibold">Pick Up</th>
							<th class="px-3 py-1.5 font-semibold">Date</th>
							<th class="px-3 py-1.5 font-semibold">Drop Off</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each transfers as t, i (i)}
							{@const l = legs(str(t.meta, 'route') || t.label)}
							<tr>
								<td class="px-3 py-2 font-medium text-slate-700">{str(t.meta, 'vehicle_type') || '—'}</td>
								<td class="px-3 py-2 text-slate-700">{l.from}</td>
								<td class="px-3 py-2 text-slate-600">{fmtDate(str(t.meta, 'date')) || '—'}</td>
								<td class="px-3 py-2 text-slate-700">{l.to || '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Accommodation details -->
		{#if stays.length}
			<div class="mb-4 overflow-hidden rounded border border-slate-200">
				<div class="bg-brand-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Accommodation Details</div>
				<table class="w-full text-xs">
					<thead class="bg-slate-50 text-left uppercase tracking-wide text-slate-400">
						<tr>
							<th class="px-2 py-1.5 font-semibold">City</th>
							<th class="px-2 py-1.5 font-semibold">Hotel</th>
							<th class="px-2 py-1.5 font-semibold">Check-in</th>
							<th class="px-2 py-1.5 font-semibold">Check-out</th>
							<th class="px-2 py-1.5 text-center font-semibold">Nights</th>
							<th class="px-2 py-1.5 font-semibold">Room Type</th>
							<th class="px-2 py-1.5 text-center font-semibold">Rooms</th>
							<th class="px-2 py-1.5 text-center font-semibold">Meal</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each stays as h, i (i)}
							<tr>
								<td class="px-2 py-2 font-medium text-slate-700">{str(h.meta, 'city')}</td>
								<td class="px-2 py-2 text-slate-700">{str(h.meta, 'hotel')}</td>
								<td class="px-2 py-2 text-slate-600">{fmtDate(str(h.meta, 'check_in')) || '—'}</td>
								<td class="px-2 py-2 text-slate-600">{fmtDate(str(h.meta, 'check_out')) || '—'}</td>
								<td class="px-2 py-2 text-center text-slate-700">{str(h.meta, 'nights') || '—'}</td>
								<td class="px-2 py-2 text-slate-700">{str(h.meta, 'room_type') || 'Room'}</td>
								<td class="px-2 py-2 text-center text-slate-700">{str(h.meta, 'qty') || 1}</td>
								<td class="px-2 py-2 text-center text-slate-700">{meal(str(h.meta, 'meal_plan'))}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		{#if rows.length === 0}
			<p class="py-6 text-center text-sm text-slate-400">
				No services yet — build & save the booking, then this confirmation fills in automatically.
			</p>
		{/if}

		<!-- Charges (voucher only) -->
		{#if isVoucher && rows.length}
			<div class="mb-4 overflow-hidden rounded border border-slate-200">
				<div class="bg-slate-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Charges</div>
				<table class="w-full text-xs">
					<tbody class="divide-y divide-slate-100">
						{#each rows as r, i (i)}
							<tr>
								<td class="px-3 py-1.5 text-slate-600">{r.label}</td>
								<td class="px-3 py-1.5 text-right text-slate-700">{formatAmount(r.amount, r.currency)}</td>
							</tr>
						{/each}
						<tr class="bg-slate-50 font-bold text-slate-800">
							<td class="px-3 py-2">Total</td>
							<td class="px-3 py-2 text-right">{formatAmount(totalPkr, 'PKR')}</td>
						</tr>
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Policy note -->
		<div class="mb-3 rounded border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
			<div class="mb-1 font-bold uppercase text-slate-700">Note: Check-in / Check-out Timings & Policies</div>
			<p class="mb-1">The usual check-in time is 4:00 PM. Rooms may not be available for early check-in unless specifically requested in advance. Luggage may be deposited at the hotel reception and collected once the room is allotted.</p>
			<p>Official check-out time is 12:00 noon. Any late check-out may involve additional charges — please check with the hotel reception in advance.</p>
		</div>

		<p class="mb-4 text-center text-[11px] font-semibold text-brand-700">
			Carry valid passport and travel documents (original &amp; copy) at all times during your journey. Ensure your departure from Saudi Arabia is within the visa validity period to avoid penalties.
		</p>

		<div class="text-center text-xs font-semibold text-slate-600">Thank you for choosing BillooTravels.com</div>

		<!-- Footer -->
		<div class="mt-4 border-t border-slate-200 pt-3 text-center text-[10px] leading-relaxed text-slate-500">
			<div class="font-semibold text-slate-600">M-2 Mezzanine Floor, Plot No 41-C, 27th Commercial Street, Phase-V, Tauheed Commercial, DHA Karachi</div>
			<div>Email: Billootravels@gmail.com · www.Billootravels.com · 021 35876791 / 92 / 93</div>
		</div>
	</div>
{/if}
