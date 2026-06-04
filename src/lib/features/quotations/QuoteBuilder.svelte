<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, Copy, Check, Save, Plus, Trash2, RefreshCw } from 'lucide-svelte';
	import { Button, Card, Input, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useQueryDetail } from '$features/queries/queries';
	import { useRates, useLatestRoe } from '$features/rates/queries';
	import { useVendors } from '$features/vendors/queries';
	import { latestRates } from '$features/rates/types';
	import {
		calculateQuotation,
		perPerson,
		perPersonDivisor,
		type QuotationInput
	} from './calculator';
	import { renderStructured, type WhatsAppData, type WhatsAppHotel } from './whatsapp';
	import { addDays, defaultCheckIn, nightsBetween } from './dates';
	import { useCreateQuotation } from './queries';
	import { getQuotation, getQuotationLines } from './api';
	import {
		OTHER,
		ROOM_TYPES,
		OCCUPANCY,
		VEHICLES,
		ROUTES,
		newRoom,
		newTransfer,
		blankHotel,
		blankVisa,
		blankAirline,
		blankForm,
		quotationToForm
	} from './edit-map';
	import RangeCalendar from './RangeCalendar.svelte';
	import QuotationList from './QuotationList.svelte';

	let { queryId, editId }: { queryId: string; editId?: string } = $props();

	const queryDetail = untrack(() => useQueryDetail(queryId));
	const rates = useRates();
	const vendors = useVendors();
	const roe = useLatestRoe();
	const createQuotation = untrack(() => useCreateQuotation(queryId));

	const pool = $derived(latestRates($rates.data ?? []));
	const byId = $derived(new Map(pool.map((r) => [r.id, r])));
	const rate = (id: string) => byId.get(id);

	function hotelOpts(city: string) {
		const items = pool.filter((r) => r.item_type === 'hotel' && r.city === city);
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
	const airlineOpts = $derived([
		{ value: '', label: '— none —' },
		...pool.filter((r) => r.item_type === 'airline').map((r) => ({ value: r.id, label: r.name })),
		{ value: OTHER, label: 'Other — type manually' }
	]);

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

	const num = (v: number | string) => Number(v) || 0;

	let form = $state(blankForm());

	let seeded = $state(false);
	$effect(() => {
		if (seeded) return;
		if (editId) {
			// Reopen a saved quotation: load it and reverse-map into the form.
			seeded = true;
			(async () => {
				const [q, lines] = await Promise.all([getQuotation(editId), getQuotationLines(editId)]);
				form = quotationToForm(q, lines);
			})();
			return;
		}
		// Fresh quote: seed pax/nights from the query and ROE from today's rate.
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

	// Hotel selection: fill name/vendor; seed a room price from the rate.
	function onHotelSel(h: typeof form.makkah) {
		if (h.sel === OTHER || !h.sel) return;
		const r = rate(h.sel);
		if (!r) return;
		h.name = r.name;
		if (r.vendor_id) h.vendorId = r.vendor_id;
		const first = h.rooms[0];
		if (first && first.cost === 0 && first.sell === 0) {
			first.cost = Number(r.cost_price);
			first.sell = Number(r.selling_price);
		}
	}
	function onRoomType(room: ReturnType<typeof newRoom>) {
		if (room.rt !== 'Custom') room.occupancy = OCCUPANCY[room.rt] ?? room.occupancy;
	}
	function addRoom(h: typeof form.makkah) {
		h.rooms.push(newRoom());
	}
	function removeRoom(h: typeof form.makkah, i: number) {
		h.rooms.splice(i, 1);
	}

	function nightsFromDates(h: typeof form.makkah) {
		h.nights = nightsBetween(h.checkIn, h.checkOut);
	}
	function datesFromNights(h: typeof form.makkah) {
		const n = num(h.nights);
		if (n > 0) {
			if (!h.checkIn) h.checkIn = defaultCheckIn();
			h.checkOut = addDays(h.checkIn, n);
		}
	}

	function roomTypeLabel(room: ReturnType<typeof newRoom>) {
		return room.rt === 'Custom' ? room.customLabel || 'Room' : room.rt;
	}
	function vehicleLabel(t: ReturnType<typeof newTransfer>) {
		return t.vehicle === 'Custom' ? t.customVehicle || 'Vehicle' : t.vehicle;
	}
	function routeLabel(t: ReturnType<typeof newTransfer>) {
		return t.route === 'Custom' ? t.customRoute || 'Transfer' : t.route;
	}

	function hotelInput(h: typeof form.makkah, city: string) {
		if (!h.sel || num(h.nights) <= 0) return null;
		return {
			city,
			name: h.name || city,
			vendorId: h.vendorId || null,
			rateCardId: h.sel === OTHER ? null : h.sel,
			nights: num(h.nights),
			checkIn: h.checkIn || null,
			checkOut: h.checkOut || null,
			rooms: h.rooms.map((r) => ({
				label: roomTypeLabel(r),
				occupancy: num(r.occupancy),
				qty: num(r.qty),
				costSar: num(r.cost),
				sellSar: num(r.sell)
			}))
		};
	}

	const input = $derived.by((): QuotationInput => {
		const hotels = [hotelInput(form.makkah, 'Makkah'), hotelInput(form.madinah, 'Madinah')].filter(
			(h): h is NonNullable<typeof h> => h !== null
		);
		const transfers = form.transfers.map((t) => ({
			vehicleType: vehicleLabel(t),
			route: routeLabel(t),
			vendorId: t.vendorId || null,
			costSar: num(t.cost),
			sellSar: num(t.sell),
			vehicles: num(t.vehicles)
		}));
		const v = form.visa;
		const ai = form.airline;
		return {
			roe: num(form.roeValue),
			pax: { adults: form.adults, children: form.children, infants: form.infants },
			hotels,
			transfers,
			visa: v.include
				? { visaType: v.type === 'Other' ? v.otherLabel || 'Other' : 'Umrah', vendorId: v.vendorId || null, costSar: num(v.cost), sellSar: num(v.sell) }
				: null,
			tickets: form.airlineInclude
				? { airlineName: ai.name || 'Tickets', vendorId: ai.vendorId || null, rateCardId: ai.sel === OTHER || !ai.sel ? null : ai.sel, adultCost: num(ai.adultCost), adultSell: num(ai.adultSell), childCost: num(ai.childCost), childSell: num(ai.childSell), infantCost: num(ai.infantCost), infantSell: num(ai.infantSell) }
				: null
		};
	});

	const result = $derived(calculateQuotation(input));
	const divisor = $derived(perPersonDivisor({ adults: form.adults, children: form.children, infants: form.infants }, form.ppIncludeInfants));
	const pp = $derived(perPerson(result.totalSellPkr, divisor));

	function hotelWa(h: typeof form.makkah): WhatsAppHotel | null {
		if (!h.sel || num(h.nights) <= 0) return null;
		return {
			hotel: h.name || '',
			nights: num(h.nights),
			roomLines: h.rooms.map((r) => `${roomTypeLabel(r)} (sleeps ${num(r.occupancy)}) ×${num(r.qty)}`)
		};
	}

	const waData = $derived.by((): WhatsAppData => {
		const q = $queryDetail.data;
		return {
			totalNights: num(form.makkah.nights) + num(form.madinah.nights),
			packageType: q?.package_type ?? 'Umrah',
			perPersonPkr: pp,
			label: form.label || null,
			makkah: hotelWa(form.makkah),
			madinah: hotelWa(form.madinah),
			visaType: form.visa.include ? (form.visa.type === 'Other' ? form.visa.otherLabel || 'Other' : 'Umrah') : null,
			transferRoutes: form.transfers.map(routeLabel),
			ticketsIncluded: form.airlineInclude
		};
	});

	const generated = $derived(renderStructured(waData));

	// Editable message: mirrors `generated` until staff edit it; Regenerate resets.
	let whatsappText = $state('');
	let dirty = $state(false);
	$effect(() => {
		const g = generated;
		if (!dirty) untrack(() => (whatsappText = g));
	});
	function regenerate() {
		whatsappText = generated;
		dirty = false;
	}

	let copied = $state(false);
	async function copyWa() {
		await navigator.clipboard.writeText(whatsappText);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function resetLines() {
		form.label = '';
		form.makkah = blankHotel();
		form.madinah = blankHotel();
		form.transfers = [newTransfer()];
		form.visa = blankVisa();
		form.airline = blankAirline();
		form.airlineInclude = false;
		dirty = false;
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
			whatsappText,
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

		{#each [{ slot: form.makkah, city: 'Makkah' }, { slot: form.madinah, city: 'Madinah' }] as h (h.city)}
			<Card title={`${h.city} hotel (SAR · per room/night)`}>
				<div class="space-y-3">
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div class="space-y-3">
							<Select label="Hotel" bind:value={h.slot.sel} options={hotelOpts(h.city)} onchange={() => onHotelSel(h.slot)} />
							{#if h.slot.sel === OTHER}
								<Input label="Hotel name" bind:value={h.slot.name} placeholder="Type hotel name" />
							{/if}
							{#if h.slot.sel}
								<div class="grid grid-cols-2 gap-2">
									<Select label="Vendor" bind:value={h.slot.vendorId} options={vendorOpts} />
									<Input label="Nights" type="number" min="0" bind:value={h.slot.nights} onchange={() => datesFromNights(h.slot)} />
								</div>
							{/if}
						</div>
						{#if h.slot.sel}
							<div>
								<span class="mb-1 block text-sm font-medium text-slate-700">Dates (check-in → check-out)</span>
								<RangeCalendar bind:start={h.slot.checkIn} bind:end={h.slot.checkOut} onChange={() => nightsFromDates(h.slot)} />
							</div>
						{/if}
					</div>

					{#if h.slot.sel}
						<div class="rounded-lg border border-slate-100 p-3">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-xs font-semibold uppercase text-slate-400">Room types (mixed allowed)</span>
								<Button size="sm" variant="ghost" onclick={() => addRoom(h.slot)}><Plus class="h-4 w-4" /> Room</Button>
							</div>
							<div class="space-y-2">
								{#each h.slot.rooms as room, i (i)}
									<div class="flex flex-wrap items-end gap-2">
										<div class="w-28"><Select label="Type" bind:value={room.rt} options={ROOM_TYPES} onchange={() => onRoomType(room)} /></div>
										{#if room.rt === 'Custom'}
											<div class="w-24"><Input label="Label" bind:value={room.customLabel} /></div>
											<div class="w-20"><Input label="Sleeps" type="number" min="1" bind:value={room.occupancy} /></div>
										{/if}
										<div class="w-16"><Input label="Qty" type="number" min="0" bind:value={room.qty} /></div>
										<div class="w-24"><Input label="Cost" type="number" min="0" step="0.01" bind:value={room.cost} /></div>
										<div class="w-24"><Input label="Sell" type="number" min="0" step="0.01" bind:value={room.sell} /></div>
										<button type="button" onclick={() => removeRoom(h.slot, i)} class="mb-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove room">
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</Card>
		{/each}

		<Card title="Transfers (SAR · per vehicle)">
			<div class="space-y-2">
				{#each form.transfers as t, i (i)}
					<div class="flex flex-wrap items-end gap-2">
						<div class="w-32"><Select label="Vehicle" bind:value={t.vehicle} options={VEHICLES} /></div>
						{#if t.vehicle === 'Custom'}<div class="w-28"><Input label="Custom" bind:value={t.customVehicle} /></div>{/if}
						<div class="w-44"><Select label="Route" bind:value={t.route} options={ROUTES} /></div>
						{#if t.route === 'Custom'}<div class="w-40"><Input label="Custom route" bind:value={t.customRoute} /></div>{/if}
						<div class="w-32"><Select label="Vendor" bind:value={t.vendorId} options={vendorOpts} /></div>
						<div class="w-16"><Input label="Qty" type="number" min="0" bind:value={t.vehicles} /></div>
						<div class="w-24"><Input label="Cost" type="number" min="0" step="0.01" bind:value={t.cost} /></div>
						<div class="w-24"><Input label="Sell" type="number" min="0" step="0.01" bind:value={t.sell} /></div>
						<button type="button" onclick={() => form.transfers.splice(i, 1)} class="mb-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove transfer">
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
				{/each}
				<Button size="sm" variant="ghost" onclick={() => form.transfers.push(newTransfer())}><Plus class="h-4 w-4" /> Transfer</Button>
			</div>
		</Card>

		<Card title="Visa (SAR · per person)">
			<div class="flex flex-wrap items-end gap-2">
				<label class="mb-2 flex items-center gap-2 text-sm text-slate-600">
					<input type="checkbox" bind:checked={form.visa.include} class="rounded border-slate-300" /> Include
				</label>
				{#if form.visa.include}
					<div class="w-32"><Select label="Visa type" bind:value={form.visa.type} options={['Umrah', 'Other']} /></div>
					{#if form.visa.type === 'Other'}<div class="w-32"><Input label="Label" bind:value={form.visa.otherLabel} /></div>{/if}
					<div class="w-36"><Select label="Vendor" bind:value={form.visa.vendorId} options={vendorOpts} /></div>
					<div class="w-24"><Input label="Cost" type="number" min="0" step="0.01" bind:value={form.visa.cost} /></div>
					<div class="w-24"><Input label="Sell" type="number" min="0" step="0.01" bind:value={form.visa.sell} /></div>
				{/if}
			</div>
		</Card>

		<Card title="Tickets (PKR)">
			<label class="mb-3 flex items-center gap-2 text-sm text-slate-600">
				<input type="checkbox" bind:checked={form.airlineInclude} class="rounded border-slate-300" /> Include air tickets
			</label>
			{#if form.airlineInclude}
				<div class="space-y-3">
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
						<Select label="Airline (adult fare from rates)" bind:value={form.airline.sel} options={airlineOpts} onchange={onAirlineSel} />
						{#if form.airline.sel === OTHER}
							<Input label="Airline name" bind:value={form.airline.name} placeholder="e.g. Saudia" />
						{/if}
						<Select label="Vendor" bind:value={form.airline.vendorId} options={vendorOpts} />
					</div>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
						<Input label="Adult cost" type="number" min="0" bind:value={form.airline.adultCost} />
						<Input label="Adult sell" type="number" min="0" bind:value={form.airline.adultSell} />
					</div>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<Input label="Child cost" type="number" min="0" bind:value={form.airline.childCost} />
						<Input label="Child sell" type="number" min="0" bind:value={form.airline.childSell} />
						<Input label="Infant cost" type="number" min="0" bind:value={form.airline.infantCost} />
						<Input label="Infant sell" type="number" min="0" bind:value={form.airline.infantSell} />
					</div>
				</div>
			{/if}
		</Card>
	</div>

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
			<textarea
				bind:value={whatsappText}
				oninput={() => (dirty = true)}
				rows="14"
				class="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
			></textarea>
			<div class="mt-3 flex flex-wrap gap-2">
				<Button variant="ghost" size="sm" onclick={regenerate}><RefreshCw class="h-4 w-4" /> Regenerate</Button>
				<Button variant="secondary" size="sm" onclick={copyWa}>
					{#if copied}<Check class="h-4 w-4" /> Copied{:else}<Copy class="h-4 w-4" /> Copy{/if}
				</Button>
				<Button size="sm" onclick={() => save(false)} disabled={$createQuotation.isPending}><Save class="h-4 w-4" /> Save</Button>
				<Button variant="secondary" size="sm" onclick={() => save(true)} disabled={$createQuotation.isPending}><Plus class="h-4 w-4" /> Save & add another</Button>
			</div>
		</Card>
	</div>
</div>

<div class="mt-8">
	<QuotationList {queryId} />
</div>
