<script lang="ts">
	import { ArrowLeft, Printer } from 'lucide-svelte';
	import { Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import type { Currency, QuotationLineType } from '$lib/database.types';
	import { getQuery } from '$features/queries/api';
	import { getBookingForQuery, listBookingItems } from '$features/bookings/api';
	import { listQuotations, getQuotationLines } from '$features/quotations/api';
	import { getOrgSettings, type OrgSettings } from '$features/settings/api';
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
	let org = $state<OrgSettings | null>(null);
	let rows = $state<Row[]>([]);
	let totalPkr = $state(0);
	let ref = $state('');
	let loaded = $state(false);
	let error = $state<string | null>(null);
	// Print-time choice: full per-service breakup, or just the grand total.
	let showBreakup = $state(true);

	$effect(() => {
		if (loaded) return;
		loaded = true;
		(async () => {
			try {
				query = await getQuery(queryId);
				org = await getOrgSettings().catch(() => null);
				const booking = await getBookingForQuery(queryId);
				const items = booking ? await listBookingItems(booking.id) : [];
				if (booking && items.length > 0) {
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
					// No booking yet (or it has no items) — fall back to the latest
					// quotation so the document is never blank when a quote exists.
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
						ref = (booking?.id ?? accepted.id).slice(0, 6).toUpperCase();
					}
				}
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to load';
			}
		})();
	});

	const isVoucher = $derived(kind === 'voucher');

	// Religious design (Umrah dua + Saudi-visa note) for Umrah/Hajj; secular for
	// Tour/Leisure. Untagged packages default to religious (Umrah-first agency).
	const RELIGIOUS_TYPES = ['Umrah', 'Umrah Plus', 'Hajj'];
	const religious = $derived(!query?.package_type || RELIGIOUS_TYPES.includes(query.package_type));

	// Accommodation = hotel room lines (skip the breakfast/meal helper lines).
	const stays = $derived(rows.filter((r) => r.lineType === 'hotel' && r.meta?.kind !== 'breakfast'));
	const transfers = $derived(rows.filter((r) => r.lineType === 'transfer'));
	const visas = $derived(rows.filter((r) => r.lineType === 'visa'));
	const tickets = $derived(rows.filter((r) => r.lineType === 'ticket'));

	// Stays (by `meta.stay` index) that carry a breakfast line — so the meal
	// column reads B/B even when the room's own meal plan was left at R/O.
	const breakfastStays = $derived(
		new Set(
			rows
				.filter((r) => r.lineType === 'hotel' && r.meta?.kind === 'breakfast')
				.map((r) => Number(r.meta?.stay))
		)
	);

	// Real traveller names captured on the booking (may be empty on older queries).
	const manifest = $derived(query?.passenger_manifest ?? []);
	// True when at least one transfer has no scheduled pick-up time — we then print
	// the "driver will contact you" note instead of leaving pick-up blank.
	const anyDriverCall = $derived(
		transfers.some((t) => !str(t.meta, 'pickup_time') && !str(t.meta, 'date'))
	);

	function str(meta: Record<string, unknown>, key: string): string {
		const v = meta[key];
		return v == null ? '' : String(v);
	}
	// Compact date (e.g. "03 Mar 2026") — keeps the accommodation/transfer tables
	// narrow enough to fit A4 without wrapping onto a second page.
	function fmtDate(value: string): string {
		if (!value) return '';
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}
	// 24h "HH:MM" → friendly 12h ("2:30 PM"). Empty stays empty.
	function fmtTime(value: string): string {
		if (!value) return '';
		const m = value.match(/^(\d{1,2}):(\d{2})/);
		if (!m) return value;
		let h = Number(m[1]);
		const ap = h < 12 ? 'AM' : 'PM';
		h = h % 12 || 12;
		return `${h}:${m[2]} ${ap}`;
	}
	// Combine a date + time into one compact cell ("03 Mar 2026 · 2:30 PM").
	function dateTime(dateStr: string, timeStr: string): string {
		return [fmtDate(dateStr), fmtTime(timeStr)].filter(Boolean).join(' · ');
	}
	const MEALS: Record<string, string> = { RO: 'R/O', BB: 'B/B', HB: 'H/B', FB: 'F/B' };
	function meal(m: string): string {
		return MEALS[m] ?? (m || 'R/O');
	}
	// Meal shown for a stay: a bundled breakfast lifts a plain-room (R/O) to B/B,
	// but never downgrades an already-richer plan (H/B, F/B).
	function stayMeal(h: Row): string {
		const code = str(h.meta, 'meal_plan') || 'RO';
		if (breakfastStays.has(Number(h.meta?.stay)) && (code === 'RO' || code === 'BB')) return 'B/B';
		return meal(code);
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

<div class="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
	<a href="/queries/{queryId}" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
		<ArrowLeft class="h-4 w-4" /> Back to query
	</a>
	<div class="flex items-center gap-3">
		{#if isVoucher}
			<label class="flex items-center gap-1.5 text-sm text-slate-600">
				<input type="checkbox" bind:checked={showBreakup} class="rounded border-slate-300" /> Show price breakup
			</label>
		{/if}
		<Button onclick={() => window.print()}><Printer class="h-4 w-4" /> Print / Save PDF</Button>
	</div>
</div>

{#if error}
	<p class="text-red-600">{error}</p>
{:else if !query}
	<p class="text-slate-400">Loading…</p>
{:else}
	<div class="print-card print-doc mx-auto max-w-3xl bg-white p-8 text-slate-800 shadow-sm print:shadow-none">
		<!-- Letterhead: uploaded logo (large) or the company wordmark -->
		<div class="doc-section mb-4 flex items-center justify-between gap-4 border-b-2 border-brand-600 pb-4">
			{#if org?.logo_url}
				<img src={org.logo_url} alt={org.company_name} style="height: {org.logo_height}px" class="w-auto max-h-56 max-w-[60%] object-contain" />
			{:else}
				<div>
					<div class="text-2xl font-extrabold tracking-tight text-brand-700">{org?.company_name ?? 'Billoo Travels'}</div>
					{#if org?.tagline}<div class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{org.tagline}</div>{/if}
				</div>
			{/if}
			{#if religious}
				<!-- Right emblem (Kaaba + dua as one uploaded image), aligned like the logo. -->
				{#if org?.kaaba_url}
					<img src={org.kaaba_url} alt="Umrah / Hajj emblem" style="height: {org.kaaba_height}px" class="w-auto max-h-56 max-w-[55%] object-contain" />
				{:else}
					<!-- Fallback: built-in Kaaba line-art (vector) until an emblem is uploaded. -->
					<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" class="h-14 w-14 text-emerald-700" aria-hidden="true">
						<rect x="16" y="20" width="28" height="34" rx="1" />
						<path d="M16 20 L24 14 L52 14 L44 20 Z" />
						<path d="M44 20 L52 14 L52 48 L44 54 Z" />
						<path d="M16 29 L44 29 M44 29 L52 23" />
						<path d="M28 54 L28 41 Q32 38 36 41 L36 54" />
					</svg>
				{/if}
			{:else}
				<div class="text-right">
					<div class="text-sm font-semibold italic text-brand-700">Wishing you a wonderful journey</div>
				</div>
			{/if}
		</div>

		<!-- Confirmation banner -->
		<div class="doc-section mb-5 text-center">
			<div class="text-sm font-semibold italic text-brand-700">
				{isVoucher ? 'We are Pleased To Confirm your Booking' : 'Your Travel Itinerary'}
			</div>
			<div class="mt-1 text-base font-bold uppercase text-slate-800">{query.client_name}</div>
			<div class="text-xs text-slate-500">
				{query.package_type ?? query.destination} · {pax()}
				<span class="ml-2 font-mono text-slate-400">Ref {ref}</span>
			</div>
		</div>

		<!-- Passengers: real names (2-column numbered grid), falls back to a count. -->
		<div class="doc-section mb-4 overflow-hidden rounded border border-slate-200">
			<div class="bg-brand-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Passengers</div>
			{#if manifest.length}
				<div class="grid grid-cols-2 gap-x-6 gap-y-1 px-3 py-2 text-xs">
					{#each manifest as p, i (i)}
						<div class="flex items-baseline gap-1.5 border-b border-slate-50 py-0.5">
							<span class="w-5 shrink-0 text-right font-mono text-slate-400">{i + 1}.</span>
							<span class="font-medium text-slate-700">{p.name}</span>
							{#if p.passport}<span class="ml-auto font-mono text-[10px] text-slate-400">{p.passport}</span>{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="px-3 py-2 text-xs text-slate-500">
					{pax()} — passenger names to be confirmed.
				</div>
			{/if}
		</div>

		<!-- Flight details -->
		{#if tickets.length}
			<div class="doc-section mb-4 overflow-hidden rounded border border-slate-200">
				<div class="bg-brand-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Flight Details</div>
				<table class="w-full text-xs">
					<thead class="bg-slate-50 text-left uppercase tracking-wide text-slate-400">
						<tr>
							<th class="px-3 py-1.5 font-semibold">Airline / Flight</th>
							<th class="px-3 py-1.5 font-semibold">Route</th>
							<th class="px-3 py-1.5 font-semibold">PNR</th>
							<th class="px-3 py-1.5 font-semibold">Class</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each tickets as t, i (i)}
							<tr>
								<td class="px-3 py-2 font-medium text-slate-700">{t.label}</td>
								<td class="px-3 py-2 text-slate-600">{str(t.meta, 'route') || '—'}</td>
								<td class="px-3 py-2 font-mono text-slate-600">{str(t.meta, 'pnr') || '—'}</td>
								<td class="px-3 py-2 text-slate-600">{str(t.meta, 'fare_class') || 'Economy'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Visa -->
		{#if visas.length}
			<div class="doc-section mb-4 overflow-hidden rounded border border-slate-200">
				<div class="bg-brand-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Visa</div>
				<table class="w-full text-xs">
					<tbody class="divide-y divide-slate-100">
						{#each visas as v, i (i)}
							<tr>
								<td class="px-3 py-2 font-medium text-slate-700">
									{(str(v.meta, 'visa_type') || 'Umrah').toUpperCase()} Visa
								</td>
								<td class="px-3 py-2 text-right text-slate-600">
									{str(v.meta, 'persons') || (query.adults + query.children + query.infants)} person(s)
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Transfer details -->
		{#if transfers.length}
			<div class="doc-section mb-4 overflow-hidden rounded border border-slate-200">
				<div class="bg-brand-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Transfer Details</div>
				<table class="w-full text-xs">
					<thead class="bg-slate-50 text-left uppercase tracking-wide text-slate-400">
						<tr>
							<th class="px-3 py-1.5 font-semibold">Vehicle</th>
							<th class="px-3 py-1.5 font-semibold">Route</th>
							<th class="px-3 py-1.5 font-semibold">Pick-up</th>
							<th class="px-3 py-1.5 font-semibold">Drop-off</th>
							<th class="px-3 py-1.5 font-semibold">Ref / Contact</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each transfers as t, i (i)}
							{@const l = legs(str(t.meta, 'route') || t.label)}
							{@const contact = [str(t.meta, 'contact_person'), str(t.meta, 'contact_number')].filter(Boolean).join(' · ')}
							{@const pickUp = dateTime(str(t.meta, 'date'), str(t.meta, 'pickup_time'))}
							{@const dropOff = dateTime(str(t.meta, 'dropoff_date'), str(t.meta, 'dropoff_time'))}
							<tr>
								<td class="px-3 py-2 font-medium text-slate-700">{str(t.meta, 'vehicle_type') || '—'}</td>
								<td class="px-3 py-2 text-slate-700">{l.from}{l.to ? ` → ${l.to}` : ''}</td>
								<td class="px-3 py-2 text-slate-600">{pickUp || 'On arrival'}</td>
								<td class="px-3 py-2 text-slate-600">{dropOff || '—'}</td>
								<td class="px-3 py-2 text-slate-600">
									{#if str(t.meta, 'booking_ref')}<span class="font-mono">{str(t.meta, 'booking_ref')}</span>{/if}
									{#if contact}<div class="text-[10px] text-slate-400">{contact}</div>{/if}
									{#if !str(t.meta, 'booking_ref') && !contact}—{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if anyDriverCall}
					<div class="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] italic text-slate-500">
						Your driver will contact you directly to confirm the exact pick-up time as per your schedule.
					</div>
				{/if}
			</div>
		{/if}

		<!-- Accommodation details -->
		{#if stays.length}
			<div class="doc-section mb-4 overflow-hidden rounded border border-slate-200">
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
							<th class="px-2 py-1.5 font-semibold">HCN / Ref</th>
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
								<td class="px-2 py-2 text-center text-slate-700">{stayMeal(h)}</td>
								<td class="px-2 py-2 font-mono text-slate-700">{str(h.meta, 'booking_ref') || '—'}</td>
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
			<div class="doc-section mb-4 overflow-hidden rounded border border-slate-200">
				<div class="bg-slate-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Charges</div>
				<table class="w-full text-xs">
					<tbody class="divide-y divide-slate-100">
						{#if showBreakup}
							{#each rows as r, i (i)}
								<tr>
									<td class="px-3 py-1.5 text-slate-600">{r.label}</td>
									<td class="px-3 py-1.5 text-right text-slate-700">{formatAmount(r.amount, r.currency)}</td>
								</tr>
							{/each}
						{/if}
						<tr class="bg-slate-50 font-bold text-slate-800">
							<td class="px-3 py-2">{showBreakup ? 'Total' : 'Total payable'}</td>
							<td class="px-3 py-2 text-right">{formatAmount(totalPkr, 'PKR')}</td>
						</tr>
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Policy note -->
		<div class="doc-section mb-3 rounded border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
			<div class="mb-1 font-bold uppercase text-slate-700">Note: Check-in / Check-out Timings & Policies</div>
			<p class="mb-1">The usual check-in time is 4:00 PM. Rooms may not be available for early check-in unless specifically requested in advance. Luggage may be deposited at the hotel reception and collected once the room is allotted.</p>
			<p>Official check-out time is 12:00 noon. Any late check-out may involve additional charges — please check with the hotel reception in advance.</p>
		</div>

		<p class="mb-4 text-center text-[11px] font-semibold text-brand-700">
			{#if religious}
				Carry valid passport and travel documents (original &amp; copy) at all times during your journey. Ensure your departure from Saudi Arabia is within the visa validity period to avoid penalties.
			{:else}
				Carry valid passport and travel documents (original &amp; copy) at all times during your journey.
			{/if}
		</p>

		<div class="text-center text-xs font-semibold text-slate-600">Thank you for choosing {org?.company_name ?? 'Billoo Travels'}</div>

		<!-- Footer -->
		<div class="mt-4 border-t border-slate-200 pt-3 text-center text-[10px] leading-relaxed text-slate-500">
			{#if org?.address}<div class="font-semibold text-slate-600">{org.address}</div>{/if}
			<div>{[org?.email, org?.website, org?.phone].filter(Boolean).join(' · ')}</div>
		</div>
	</div>
{/if}
