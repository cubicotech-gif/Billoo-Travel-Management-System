<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, Copy, Check, Save, Plus } from 'lucide-svelte';
	import { Button, Card, Input, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useQueryDetail } from '$features/queries/queries';
	import { useRates, useLatestRoe } from '$features/rates/queries';
	import { useVendors } from '$features/vendors/queries';
	import { latestRates } from '$features/rates/types';
	import type { RateCard } from '$features/rates/types';
	import {
		calculateQuotation,
		perPerson,
		perPersonDivisor,
		roomsFor,
		totalPersons,
		type QuotationInput
	} from './calculator';
	import { renderWhatsApp } from './whatsapp';
	import { addDays, defaultCheckIn, nightsBetween } from './dates';
	import { useCreateQuotation } from './queries';
	import RangeCalendar from './RangeCalendar.svelte';
	import QuotationList from './QuotationList.svelte';

	let { queryId }: { queryId: string } = $props();

	const OTHER = '__other__';

	const queryDetail = untrack(() => useQueryDetail(queryId));
	const rates = useRates();
	const vendors = useVendors();
	const roe = useLatestRoe();
	const createQuotation = untrack(() => useCreateQuotation(queryId));

	const pool = $derived(latestRates($rates.data ?? []));
	const byId = $derived(new Map(pool.map((r) => [r.id, r])));
	function rate(id: string): RateCard | undefined {
		return byId.get(id);
	}

	function itemOpts(type: RateCard['item_type'], city?: string) {
		const items = pool.filter((r) => r.item_type === type && (!city || r.city === city));
		return [
			{ value: '', label: '— none —' },
			...items.map((r) => ({ value: r.id, label: r.name })),
			{ value: OTHER, label: 'Other — type manually' }
		];
	}
	const vendorOpts = $derived([
		{ value: '', label: 'Own / TBD' },
		...($vendors.data ?? []).map((v) => ({ value: v.id, label: v.name }))
	]);

	function blankHotel() {
		return { sel: '', name: '', vendorId: '', cost: 0, sell: 0, checkIn: '', checkOut: '', nights: 0, rooms: 1 };
	}
	function blankLine() {
		return { sel: '', name: '', vendorId: '', cost: 0, sell: 0, vehicles: 1 };
	}
	function blankAirline() {
		return { sel: '', name: '', vendorId: '', adultCost: 0, adultSell: 0, childCost: 0, childSell: 0, infantCost: 0, infantSell: 0 };
	}

	let form = $state({
		roeValue: 0,
		adults: 1,
		children: 0,
		infants: 0,
		ppIncludeInfants: false,
		label: '',
		makkah: blankHotel(),
		madinah: blankHotel(),
		transfer: blankLine(),
		visa: blankLine(),
		airline: blankAirline()
	});

	let seeded = $state(false);
	$effect(() => {
		if (seeded) return;
		const q = $queryDetail.data;
		const r = $roe.data;
		if (!q) return;
		form.adults = q.adults;
		form.children = q.children;
		form.infants = q.infants;
		form.makkah.nights = q.nights_makkah ?? 0;
		form.madinah.nights = q.nights_madinah ?? 0;
		if (r) form.roeValue = Number(r.sar_to_pkr);
		seeded = true;
	});

	const persons = $derived(totalPersons({ adults: form.adults, children: form.children, infants: form.infants }));
	const num = (v: number | string) => Number(v) || 0;

	// Auto-fill cost/sell/vendor from the chosen rate (still editable after).
	function onSel(line: { sel: string; name: string; vendorId: string; cost: number; sell: number }) {
		if (line.sel === OTHER || !line.sel) return;
		const r = rate(line.sel);
		if (!r) return;
		line.name = r.name;
		line.cost = Number(r.cost_price);
		line.sell = Number(r.selling_price);
		if (r.vendor_id) line.vendorId = r.vendor_id;
	}
	function onAirlineSel() {
		const a = form.airline;
		if (a.sel === OTHER || !a.sel) return;
		const r = rate(a.sel);
		if (!r) return;
		a.name = r.name;
		a.adultCost = Number(r.cost_price);
		a.adultSell = Number(r.selling_price);
		if (r.vendor_id) a.vendorId = r.vendor_id;
	}

	// Date <-> nights two-way sync per hotel.
	function nightsFromDates(h: { checkIn: string; checkOut: string; nights: number }) {
		h.nights = nightsBetween(h.checkIn, h.checkOut);
	}
	function datesFromNights(h: { checkIn: string; checkOut: string; nights: number }) {
		const n = num(h.nights);
		if (n > 0) {
			if (!h.checkIn) h.checkIn = defaultCheckIn();
			h.checkOut = addDays(h.checkIn, n);
		}
	}

	function hotelInput(h: typeof form.makkah, city: string) {
		if (!h.sel || num(h.nights) <= 0) return null;
		return {
			city,
			name: h.name || city,
			vendorId: h.vendorId || null,
			rateCardId: h.sel === OTHER ? null : h.sel,
			costSar: num(h.cost),
			sellSar: num(h.sell),
			nights: num(h.nights),
			rooms: num(h.rooms),
			checkIn: h.checkIn || null,
			checkOut: h.checkOut || null
		};
	}

	const input = $derived.by((): QuotationInput => {
		const hotels = [hotelInput(form.makkah, 'Makkah'), hotelInput(form.madinah, 'Madinah')].filter(
			(h): h is NonNullable<typeof h> => h !== null
		);
		const tr = form.transfer;
		const vi = form.visa;
		const ai = form.airline;
		return {
			roe: num(form.roeValue),
			pax: { adults: form.adults, children: form.children, infants: form.infants },
			hotels,
			transfer: tr.sel
				? { name: tr.name || 'Transfer', vendorId: tr.vendorId || null, rateCardId: tr.sel === OTHER ? null : tr.sel, costSar: num(tr.cost), sellSar: num(tr.sell), vehicles: num(tr.vehicles) }
				: null,
			visa: vi.sel
				? { name: vi.name || 'Visa', vendorId: vi.vendorId || null, rateCardId: vi.sel === OTHER ? null : vi.sel, costSar: num(vi.cost), sellSar: num(vi.sell) }
				: null,
			tickets: ai.sel
				? { airlineName: ai.name || 'Tickets', vendorId: ai.vendorId || null, rateCardId: ai.sel === OTHER ? null : ai.sel, adultCost: num(ai.adultCost), adultSell: num(ai.adultSell), childCost: num(ai.childCost), childSell: num(ai.childSell), infantCost: num(ai.infantCost), infantSell: num(ai.infantSell) }
				: null
		};
	});

	const result = $derived(calculateQuotation(input));
	const divisor = $derived(perPersonDivisor({ adults: form.adults, children: form.children, infants: form.infants }, form.ppIncludeInfants));
	const pp = $derived(perPerson(result.totalSellPkr, divisor));

	const makkahSuggest = $derived(rate(form.makkah.sel) ? roomsFor(persons, rate(form.makkah.sel)!.occupancy ?? 0) : 0);
	const madinahSuggest = $derived(rate(form.madinah.sel) ? roomsFor(persons, rate(form.madinah.sel)!.occupancy ?? 0) : 0);

	const whatsapp = $derived.by(() => {
		const q = $queryDetail.data;
		if (!q) return '';
		return renderWhatsApp(
			{
				packageType: q.package_type ?? 'Umrah',
				passengerName: q.client_name,
				pax: { adults: form.adults, children: form.children, infants: form.infants },
				nightsMakkah: form.makkah.nights || null,
				nightsMadinah: form.madinah.nights || null,
				label: form.label || null,
				perPersonPkr: pp
			},
			result
		);
	});

	let copied = $state(false);
	async function copyWhatsapp() {
		await navigator.clipboard.writeText(whatsapp);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function resetLines() {
		form.label = '';
		form.makkah = blankHotel();
		form.madinah = blankHotel();
		form.transfer = blankLine();
		form.visa = blankLine();
		form.airline = blankAirline();
	}

	async function save(addAnother: boolean) {
		if (num(form.roeValue) <= 0) {
			alert('Set an exchange rate (ROE) first — see Daily Rates.');
			return;
		}
		await $createQuotation.mutateAsync({
			queryId,
			roe: num(form.roeValue),
			pax: { adults: form.adults, children: form.children, infants: form.infants },
			result,
			whatsappText: whatsapp,
			label: form.label || null,
			perPersonPkr: pp,
			ppIncludeInfants: form.ppIncludeInfants
		});
		if (addAnother) resetLines();
	}
</script>

<a href="/queries/{queryId}" class="no-print mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
	<ArrowLeft class="h-4 w-4" /> Back to query
</a>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-slate-800">Build quotation</h1>
	<p class="text-sm text-slate-500">Prices pull from the latest Daily Rates. SAR converts to PKR via the ROE.</p>
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
	<div class="space-y-4 lg:col-span-2">
		<Card title="Pax, ROE & label">
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
				<Input label="ROE (1 SAR = PKR)" type="number" min="0" step="0.0001" bind:value={form.roeValue} />
				<Input label="Adults" type="number" min="0" bind:value={form.adults} />
				<Input label="Children" type="number" min="0" bind:value={form.children} />
				<Input label="Infants" type="number" min="0" bind:value={form.infants} />
				<Input label="Label (tier)" bind:value={form.label} placeholder="e.g. Gold" />
			</div>
		</Card>

		<!-- Hotels -->
		{#each [{ slot: form.makkah, city: 'Makkah', suggest: makkahSuggest }, { slot: form.madinah, city: 'Madinah', suggest: madinahSuggest }] as h (h.city)}
			<Card title={`${h.city} hotel (SAR · per room/night)`}>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div class="space-y-3">
						<Select label="Hotel" bind:value={h.slot.sel} options={itemOpts('hotel', h.city)} onchange={() => onSel(h.slot)} />
						{#if h.slot.sel === OTHER}
							<Input label="Hotel name" bind:value={h.slot.name} placeholder="Type hotel name" />
						{/if}
						{#if h.slot.sel}
							<div class="grid grid-cols-2 gap-2">
								<Select label="Vendor" bind:value={h.slot.vendorId} options={vendorOpts} />
								<Input label="Rooms" type="number" min="0" bind:value={h.slot.rooms} />
							</div>
							<div class="grid grid-cols-3 gap-2">
								<Input label="Cost" type="number" min="0" step="0.01" bind:value={h.slot.cost} />
								<Input label="Sell" type="number" min="0" step="0.01" bind:value={h.slot.sell} />
								<Input label="Nights" type="number" min="0" bind:value={h.slot.nights} onchange={() => datesFromNights(h.slot)} />
							</div>
							{#if h.suggest > 0}<p class="text-xs text-slate-400">Suggested {h.suggest} room(s) for {persons} pax.</p>{/if}
						{/if}
					</div>
					{#if h.slot.sel}
						<div>
							<span class="mb-1 block text-sm font-medium text-slate-700">Dates (check-in → check-out)</span>
							<RangeCalendar bind:start={h.slot.checkIn} bind:end={h.slot.checkOut} onChange={() => nightsFromDates(h.slot)} />
						</div>
					{/if}
				</div>
			</Card>
		{/each}

		<!-- Transfer + Visa -->
		<Card title="Transfer & Visa (SAR)">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Select label="Transfer" bind:value={form.transfer.sel} options={itemOpts('transfer')} onchange={() => onSel(form.transfer)} />
					{#if form.transfer.sel === OTHER}<Input label="Name" bind:value={form.transfer.name} />{/if}
					{#if form.transfer.sel}
						<Select label="Vendor" bind:value={form.transfer.vendorId} options={vendorOpts} />
						<div class="grid grid-cols-3 gap-2">
							<Input label="Cost" type="number" min="0" step="0.01" bind:value={form.transfer.cost} />
							<Input label="Sell" type="number" min="0" step="0.01" bind:value={form.transfer.sell} />
							<Input label="Vehicles" type="number" min="0" bind:value={form.transfer.vehicles} />
						</div>
					{/if}
				</div>
				<div class="space-y-2">
					<Select label="Visa (per person)" bind:value={form.visa.sel} options={itemOpts('visa')} onchange={() => onSel(form.visa)} />
					{#if form.visa.sel === OTHER}<Input label="Name" bind:value={form.visa.name} />{/if}
					{#if form.visa.sel}
						<Select label="Vendor" bind:value={form.visa.vendorId} options={vendorOpts} />
						<div class="grid grid-cols-2 gap-2">
							<Input label="Cost" type="number" min="0" step="0.01" bind:value={form.visa.cost} />
							<Input label="Sell" type="number" min="0" step="0.01" bind:value={form.visa.sell} />
						</div>
					{/if}
				</div>
			</div>
		</Card>

		<!-- Tickets -->
		<Card title="Tickets (PKR)">
			<div class="space-y-3">
				<Select label="Airline" bind:value={form.airline.sel} options={itemOpts('airline')} onchange={onAirlineSel} />
				{#if form.airline.sel === OTHER}<Input label="Airline name" bind:value={form.airline.name} />{/if}
				{#if form.airline.sel}
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
						<Select label="Vendor" bind:value={form.airline.vendorId} options={vendorOpts} />
						<Input label="Adult cost" type="number" min="0" bind:value={form.airline.adultCost} />
						<Input label="Adult sell" type="number" min="0" bind:value={form.airline.adultSell} />
					</div>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<Input label="Child cost" type="number" min="0" bind:value={form.airline.childCost} />
						<Input label="Child sell" type="number" min="0" bind:value={form.airline.childSell} />
						<Input label="Infant cost" type="number" min="0" bind:value={form.airline.infantCost} />
						<Input label="Infant sell" type="number" min="0" bind:value={form.airline.infantSell} />
					</div>
				{/if}
			</div>
		</Card>
	</div>

	<!-- Live summary -->
	<div class="space-y-4">
		<Card title="Breakdown (staff)">
			<div class="space-y-1.5 text-sm">
				{#each result.lines as l, i (i)}
					<div class="flex justify-between">
						<span class="text-slate-500">{l.label}</span>
						<span class="text-slate-700">{formatAmount(l.lineSell, l.currency)}</span>
					</div>
				{/each}
				{#if result.lines.length === 0}<p class="text-slate-400">Pick items to price.</p>{/if}
			</div>
			<div class="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
				<div class="flex justify-between"><span class="text-slate-500">SAR subtotal</span><span>{formatAmount(result.sarSell, 'SAR')}</span></div>
				<div class="flex justify-between"><span class="text-slate-500">Tickets (PKR)</span><span>{formatAmount(result.ticketsSellPkr, 'PKR')}</span></div>
				<div class="flex justify-between font-semibold text-slate-800"><span>Total (PKR)</span><span>{formatAmount(result.totalSellPkr, 'PKR')}</span></div>
				<div class="flex justify-between font-medium text-brand-700"><span>Per person</span><span>{formatAmount(pp, 'PKR')}</span></div>
				<div class="flex justify-between text-green-600"><span>Profit</span><span>{formatAmount(result.profitPkr, 'PKR')}</span></div>
			</div>
			<label class="mt-3 flex items-center gap-2 text-xs text-slate-500">
				<input type="checkbox" bind:checked={form.ppIncludeInfants} class="rounded border-slate-300" />
				Count infants in per-person (÷ {divisor})
			</label>
		</Card>

		<Card title="WhatsApp message">
			<pre class="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{whatsapp}</pre>
			<div class="mt-3 flex flex-wrap gap-2">
				<Button variant="secondary" size="sm" onclick={copyWhatsapp}>
					{#if copied}<Check class="h-4 w-4" /> Copied{:else}<Copy class="h-4 w-4" /> Copy{/if}
				</Button>
				<Button size="sm" onclick={() => save(false)} disabled={$createQuotation.isPending}>
					<Save class="h-4 w-4" /> Save
				</Button>
				<Button variant="secondary" size="sm" onclick={() => save(true)} disabled={$createQuotation.isPending}>
					<Plus class="h-4 w-4" /> Save & add another
				</Button>
			</div>
		</Card>
	</div>
</div>

<div class="mt-8">
	<QuotationList {queryId} />
</div>
