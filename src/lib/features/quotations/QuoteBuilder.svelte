<script lang="ts">
	import { untrack } from 'svelte';
	import {
		ArrowLeft,
		Copy,
		Check,
		Save,
		Plus,
		Trash2,
		RefreshCw,
		ChevronUp,
		ChevronDown
	} from 'lucide-svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { Button, Card, Input, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useQueryDetail, useSetQueryStatus } from '$features/queries/queries';
	import { useRates, useLatestRoe } from '$features/rates/queries';
	import { latestRates, hotelRoomRates, transferRateOptions } from '$features/rates/types';
	import { rateAgeDays } from '$features/rates/validity';
	import VendorPicker from '$features/vendors/VendorPicker.svelte';
	import HotelPicker from './HotelPicker.svelte';
	import {
		calculateQuotation,
		perPerson,
		perPersonDivisor,
		perPersonAdvanced,
		personsInRooms,
		DEFAULT_CHILD_SHARE,
		type QuotationInput
	} from './calculator';
	import { renderStructured, type WhatsAppData, type WhatsAppHotel } from './whatsapp';
	import { addDays, toISO } from './dates';
	import {
		rechain,
		applyDateRange,
		applyNights,
		moveStay,
		pinCheckIn,
		relinkCheckIn,
		totalNights
	} from './itinerary';
	import { persistRates, type RateSnapshot } from './autosave';
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
		quotationToForm,
		type HotelForm,
		type TransferForm
	} from './edit-map';
	import RangeCalendar from './RangeCalendar.svelte';
	import QuotationList from './QuotationList.svelte';

	let { queryId, editId }: { queryId: string; editId?: string } = $props();

	const client = useQueryClient();
	const queryDetail = untrack(() => useQueryDetail(queryId));
	const rates = useRates();
	const roe = useLatestRoe();
	const createQuotation = untrack(() => useCreateQuotation(queryId));
	const setStatus = useSetQueryStatus();

	const pool = $derived(latestRates($rates.data ?? []));
	const byId = $derived(new Map(pool.map((r) => [r.id, r])));
	const rate = (id: string) => byId.get(id);

	const num = (v: number | string) => Number(v) || 0;
	const splitLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

	const transferOpts = $derived([
		{ value: '', label: 'Custom (type below)' },
		...transferRateOptions(pool).map((r) => ({
			value: r.id,
			label: `${r.name}${r.city ? ` · ${r.city}` : ''}`
		}))
	]);
	const airlineOpts = $derived([
		{ value: '', label: '— none —' },
		...pool.filter((r) => r.item_type === 'airline').map((r) => ({ value: r.id, label: r.name })),
		{ value: OTHER, label: 'Other — type manually' }
	]);

	function rtFromOccupancy(occ: number): string {
		const found = Object.entries(OCCUPANCY).find(([, v]) => v === occ);
		return found ? found[0] : 'Custom';
	}

	function onAirlineSel() {
		const a = form.airline;
		if (a.sel === OTHER || !a.sel) return;
		const r = rate(a.sel);
		if (!r) return;
		a.name = r.name;
		a.adultCost = Number(r.cost_price);
		a.adultSell = Number(r.selling_price);
	}

	let form = $state(blankForm());

	let seeded = $state(false);
	$effect(() => {
		if (seeded) return;
		if (editId) {
			seeded = true;
			(async () => {
				const [q, lines] = await Promise.all([getQuotation(editId), getQuotationLines(editId)]);
				form = quotationToForm(q, lines);
			})();
			return;
		}
		const q = $queryDetail.data;
		const r = $roe.data;
		if (!q) return;
		form.adults = q.adults;
		form.children = q.children;
		form.infants = q.infants;
		const cities = q.itinerary_cities ?? [];
		if (cities.length) {
			form.hotels = cities.map((c, i) => {
				const h = blankHotel(c.city);
				h.nights = c.nights ?? 0;
				if (i === 0 && c.arrival_date) h.checkIn = c.arrival_date;
				return h;
			});
			rechain(form.hotels);
		}
		form.validUntil = addDays(toISO(new Date()), 7);
		if (r) form.roeValue = Number(r.sar_to_pkr);
		seeded = true;
	});

	// --- Stays (itinerary) --------------------------------------------------
	function addStay() {
		form.hotels.push(blankHotel(''));
		rechain(form.hotels);
	}
	function removeStay(i: number) {
		form.hotels.splice(i, 1);
		rechain(form.hotels);
	}
	function onStayDates(i: number) {
		applyDateRange(form.hotels, i);
	}
	function onStayNights(i: number) {
		applyNights(form.hotels, i);
	}
	function move(i: number, dir: -1 | 1) {
		moveStay(form.hotels, i, i + dir);
	}
	function onStayCheckIn(i: number) {
		pinCheckIn(form.hotels, i);
	}
	function relink(i: number) {
		relinkCheckIn(form.hotels, i);
	}

	const requestedNights = $derived(
		($queryDetail.data?.itinerary_cities ?? []).reduce((a, c) => a + (c.nights ?? 0), 0)
	);
	const itineraryNights = $derived(totalNights(form.hotels));

	// A saved hotel was picked → auto-populate its room rates by occupancy.
	function onHotelPick(h: HotelForm, saved: boolean) {
		if (!saved || !h.name) return;
		const recents = hotelRoomRates($rates.data ?? [], h.name, h.city);
		if (recents.length) {
			h.rooms = recents.map((r) => {
				const occ = r.occupancy ?? 2;
				const rt = rtFromOccupancy(occ);
				return {
					rt,
					customLabel: rt === 'Custom' ? `Sleeps ${occ}` : '',
					occupancy: occ,
					qty: 1,
					cost: Number(r.cost_price),
					sell: Number(r.selling_price)
				};
			});
			const v = recents[0]?.vendor_id;
			if (v) h.vendorId = v;
		}
	}
	function onRoomType(room: ReturnType<typeof newRoom>) {
		if (room.rt !== 'Custom') room.occupancy = OCCUPANCY[room.rt] ?? room.occupancy;
	}
	function addRoom(h: HotelForm) {
		h.rooms.push(newRoom());
	}
	function removeRoom(h: HotelForm, i: number) {
		h.rooms.splice(i, 1);
	}

	// Most recent rate age for a selected hotel — drives the "update rates" hint.
	function hotelRateAge(h: HotelForm): number | null {
		if (!h.name) return null;
		const recents = hotelRoomRates($rates.data ?? [], h.name, h.city);
		const newest = recents.reduce<string | null>(
			(a, r) => (a && a > r.rate_date ? a : r.rate_date),
			null
		);
		return newest ? rateAgeDays(newest) : null;
	}

	function onTransferSel(t: TransferForm) {
		if (!t.sel) return;
		const r = rate(t.sel);
		if (!r) return;
		t.cost = Number(r.cost_price);
		t.sell = Number(r.selling_price);
		if (VEHICLES.includes(r.name)) {
			t.vehicle = r.name;
		} else {
			t.vehicle = 'Custom';
			t.customVehicle = r.name;
		}
		const route = r.city ?? '';
		if (ROUTES.includes(route)) {
			t.route = route;
		} else if (route) {
			t.route = 'Custom';
			t.customRoute = route;
		}
	}

	const stayPersons = (h: HotelForm) => personsInRooms(h.rooms.map((r) => ({ label: '', occupancy: num(r.occupancy), qty: num(r.qty), costSar: 0, sellSar: 0 })));
	// Breakfast persons: manual override when set (>0), else room occupancy total.
	const breakfastPersons = (h: HotelForm) => (num(h.breakfastPersons) > 0 ? num(h.breakfastPersons) : stayPersons(h));

	function roomTypeLabel(room: ReturnType<typeof newRoom>) {
		return room.rt === 'Custom' ? room.customLabel || 'Room' : room.rt;
	}
	function vehicleLabel(t: ReturnType<typeof newTransfer>) {
		return t.vehicle === 'Custom' ? t.customVehicle || 'Vehicle' : t.vehicle;
	}
	function routeLabel(t: ReturnType<typeof newTransfer>) {
		return t.route === 'Custom' ? t.customRoute || 'Transfer' : t.route;
	}

	function hotelInput(h: HotelForm) {
		if (!h.name || num(h.nights) <= 0) return null;
		const city = h.city || 'Hotel';
		return {
			city,
			name: h.name || city,
			vendorId: h.vendorId || null,
			rateCardId: null,
			nights: num(h.nights),
			checkIn: h.checkIn || null,
			checkOut: h.checkOut || null,
			rooms: h.rooms.map((r) => ({
				label: roomTypeLabel(r),
				occupancy: num(r.occupancy),
				qty: num(r.qty),
				costSar: num(r.cost),
				sellSar: num(r.sell)
			})),
			breakfast:
				h.breakfastMode === 'none'
					? null
					: {
							costSar: num(h.breakfastCost),
							sellSar: num(h.breakfastSell),
							persons: breakfastPersons(h),
							personsAuto: num(h.breakfastPersons) <= 0,
							included: h.breakfastMode === 'included'
						}
		};
	}

	const input = $derived.by((): QuotationInput => {
		const hotels = form.hotels
			.map((h) => hotelInput(h))
			.filter((h): h is NonNullable<typeof h> => h !== null);
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
				? { airlineName: ai.name || 'Tickets', rateCardId: ai.sel === OTHER || !ai.sel ? null : ai.sel, route: ai.route || null, fareClass: ai.fareClass || null, pnr: ai.pnr || null, adultCost: num(ai.adultCost), adultSell: num(ai.adultSell), childCost: num(ai.childCost), childSell: num(ai.childSell), infantCost: num(ai.infantCost), infantSell: num(ai.infantSell) }
				: null
		};
	});

	const result = $derived(calculateQuotation(input));
	const divisor = $derived(perPersonDivisor({ adults: form.adults, children: form.children, infants: form.infants }, form.ppIncludeInfants));
	const pp = $derived(perPerson(result.totalSellPkr, divisor));

	// Advanced per-person: shared costs ÷ adults; children pay only used items.
	let ppMode = $state<'simple' | 'advanced'>('simple');
	let childShare = $state({ ...DEFAULT_CHILD_SHARE });
	const advanced = $derived(
		perPersonAdvanced(result, num(form.roeValue), { adults: form.adults, children: form.children, infants: form.infants }, childShare)
	);
	const headlinePp = $derived(ppMode === 'advanced' ? advanced.perAdult : pp);

	function hotelWa(h: HotelForm): WhatsAppHotel | null {
		if (!h.name || num(h.nights) <= 0) return null;
		return {
			city: h.city || 'Hotel',
			hotel: h.name || '',
			nights: num(h.nights),
			breakfast: h.breakfastMode !== 'none',
			roomLines: h.rooms.map((r) => `${roomTypeLabel(r)} (sleeps ${num(r.occupancy)}) ×${num(r.qty)}`)
		};
	}

	const waData = $derived.by((): WhatsAppData => {
		const q = $queryDetail.data;
		return {
			totalNights: itineraryNights,
			packageType: q?.package_type ?? 'Umrah',
			perPersonPkr: headlinePp,
			perChildPkr: ppMode === 'advanced' && form.children > 0 ? advanced.perChild : null,
			label: form.label || null,
			hotels: form.hotels.map(hotelWa).filter((h): h is WhatsAppHotel => h !== null),
			visaType: form.visa.include ? (form.visa.type === 'Other' ? form.visa.otherLabel || 'Other' : 'Umrah') : null,
			transferRoutes: form.transfers.map(routeLabel),
			ticketsIncluded: form.airlineInclude
		};
	});

	const generated = $derived(renderStructured(waData));

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
		form.inclusions = '';
		form.exclusions = '';
		form.hotels = [blankHotel('')];
		form.transfers = [newTransfer()];
		form.visa = blankVisa();
		form.airline = blankAirline();
		form.airlineInclude = false;
		dirty = false;
	}

	// Build the rate snapshots that smart auto-save will persist.
	function buildSnapshots(): RateSnapshot[] {
		const snaps: RateSnapshot[] = [];
		for (const h of form.hotels) {
			if (!h.name || num(h.nights) <= 0) continue;
			for (const r of h.rooms) {
				snaps.push({
					item_type: 'hotel',
					name: h.name,
					city: h.city || null,
					occupancy: num(r.occupancy) || null,
					vendor_id: h.vendorId || null,
					currency: 'SAR',
					unit: 'per room / night',
					cost_price: num(r.cost),
					selling_price: num(r.sell)
				});
			}
		}
		for (const t of form.transfers) {
			if (num(t.vehicles) <= 0) continue;
			snaps.push({
				item_type: 'transfer',
				name: vehicleLabel(t),
				city: routeLabel(t),
				occupancy: null,
				vendor_id: t.vendorId || null,
				currency: 'SAR',
				unit: 'per vehicle',
				cost_price: num(t.cost),
				selling_price: num(t.sell)
			});
		}
		if (form.airlineInclude) {
			const a = form.airline;
			snaps.push({
				item_type: 'airline',
				name: a.name || 'Tickets',
				city: null,
				occupancy: null,
				vendor_id: null,
				currency: 'PKR',
				unit: 'per adult',
				cost_price: num(a.adultCost),
				selling_price: num(a.adultSell)
			});
		}
		if (form.visa.include) {
			const v = form.visa;
			snaps.push({
				item_type: 'visa',
				name: v.type === 'Other' ? v.otherLabel || 'Other' : 'Umrah',
				city: null,
				occupancy: null,
				vendor_id: v.vendorId || null,
				currency: 'SAR',
				unit: 'per person',
				cost_price: num(v.cost),
				selling_price: num(v.sell)
			});
		}
		return snaps;
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
			perPersonPkr: headlinePp,
			ppIncludeInfants: form.ppIncludeInfants,
			validUntil: form.validUntil || null,
			inclusions: splitLines(form.inclusions),
			exclusions: splitLines(form.exclusions)
		});
		// Smart auto-save: persist any new/changed hotel, transfer, ticket & visa
		// rates so they're available (vendor-wise) next time. Best-effort.
		try {
			await persistRates($rates.data ?? [], buildSnapshots());
			await client.invalidateQueries({ queryKey: ['rates'] });
		} catch (e) {
			console.warn('[quote] rate auto-save failed', e);
		}
		const st = $queryDetail.data?.status;
		if (st === 'New Query' || st === 'Working') {
			$setStatus.mutate({ id: queryId, status: 'Quoted' });
		}
		if (addAnother) resetLines();
	}
</script>

<a href="/queries/{queryId}" class="no-print mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
	<ArrowLeft class="h-4 w-4" /> Back to query
</a>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-slate-800">Build quotation</h1>
	<p class="text-sm text-slate-500">Prices pull from the latest Daily Rates. SAR converts to PKR via the ROE. Manual entries auto-save to the rate database.</p>
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
	<div class="space-y-4 lg:col-span-2">
		<Card title="Pax, ROE & label">
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
				<Input label="ROE (1 SAR = PKR)" type="number" min="0" step="0.0001" bind:value={form.roeValue} />
				<Input label="Adults" type="number" min="0" bind:value={form.adults} />
				<Input label="Children" type="number" min="0" bind:value={form.children} />
				<Input label="Infants" type="number" min="0" bind:value={form.infants} />
				<Input label="Tier (e.g. 3★ / Premium)" bind:value={form.label} placeholder="e.g. 5-star" />
			</div>
			<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<Input label="Valid until" type="date" bind:value={form.validUntil} />
				<div>
					<span class="mb-1 block text-sm font-medium text-slate-700">Inclusions (one per line)</span>
					<textarea bind:value={form.inclusions} rows="3" placeholder="Visa&#10;Hotels&#10;Transfers" class="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"></textarea>
				</div>
				<div>
					<span class="mb-1 block text-sm font-medium text-slate-700">Exclusions (one per line)</span>
					<textarea bind:value={form.exclusions} rows="3" placeholder="Air tickets&#10;Meals" class="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"></textarea>
				</div>
			</div>
		</Card>

		<!-- Itinerary: a free-ordered sequence of stays with chained dates. -->
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Itinerary · {form.hotels.length} stay{form.hotels.length === 1 ? '' : 's'}</h2>
			<span class="text-sm font-medium {requestedNights && itineraryNights !== requestedNights ? 'text-amber-600' : 'text-slate-500'}">
				{itineraryNights} night{itineraryNights === 1 ? '' : 's'} total{requestedNights ? ` · requested ${requestedNights}` : ''}
			</span>
		</div>

		{#each form.hotels as slot, hi (slot.id)}
			{@const age = hotelRateAge(slot)}
			<Card title={`Stay ${hi + 1}${slot.city ? ` · ${slot.city}` : ''}`}>
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase text-slate-400">Stay {hi + 1}</span>
						<div class="flex items-center gap-1">
							<button type="button" disabled={hi === 0} onclick={() => move(hi, -1)} class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30" aria-label="Move up">
								<ChevronUp class="h-4 w-4" />
							</button>
							<button type="button" disabled={hi === form.hotels.length - 1} onclick={() => move(hi, 1)} class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30" aria-label="Move down">
								<ChevronDown class="h-4 w-4" />
							</button>
							<button type="button" onclick={() => removeStay(hi)} class="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove stay">
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div class="space-y-3">
							<div class="grid grid-cols-2 gap-2">
								<Input label="City" bind:value={slot.city} placeholder="e.g. Makkah" />
								<HotelPicker city={slot.city} bind:value={slot.name} onPick={(saved) => onHotelPick(slot, saved)} />
							</div>
							<VendorPicker service="Hotel" bind:value={slot.vendorId} />
							{#if age !== null && age >= 3}
								<p class="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">Saved rate is {age} days old — please update.</p>
							{/if}
						</div>
						<div>
							{#if hi === 0}
								<span class="mb-1 block text-sm font-medium text-slate-700">Dates (check-in → check-out)</span>
								<RangeCalendar bind:start={slot.checkIn} bind:end={slot.checkOut} onChange={() => onStayDates(hi)} />
							{:else}
								<div class="grid grid-cols-2 gap-2">
									<Input label="Check-in" type="date" bind:value={slot.checkIn} onchange={() => onStayCheckIn(hi)} />
									<Input label="Check-out" type="date" bind:value={slot.checkOut} onchange={() => onStayDates(hi)} />
								</div>
								<p class="mt-1 text-xs text-slate-400">
									{#if slot.lockCheckIn}
										Check-in pinned. <button type="button" class="text-brand-600 hover:underline" onclick={() => relink(hi)}>↻ chain from previous</button>
									{:else}
										Defaults to the previous stay's check-out — edit to override.
									{/if}
								</p>
							{/if}
							<div class="mt-2 w-24">
								<Input label="Nights" type="number" min="0" bind:value={slot.nights} onchange={() => onStayNights(hi)} />
							</div>
						</div>
					</div>

					<div class="rounded-lg border border-slate-100 p-3">
						<div class="mb-2 flex items-center justify-between">
							<span class="text-xs font-semibold uppercase text-slate-400">Room types (mixed allowed) · SAR per room/night</span>
							<Button size="sm" variant="ghost" onclick={() => addRoom(slot)}><Plus class="h-4 w-4" /> Room</Button>
						</div>
						<div class="space-y-2">
							{#each slot.rooms as room, i (i)}
								<div class="flex flex-wrap items-end gap-2">
									<div class="w-28"><Select label="Type" bind:value={room.rt} options={ROOM_TYPES} onchange={() => onRoomType(room)} /></div>
									{#if room.rt === 'Custom'}
										<div class="w-24"><Input label="Label" bind:value={room.customLabel} /></div>
										<div class="w-20"><Input label="Sleeps" type="number" min="1" bind:value={room.occupancy} /></div>
									{/if}
									<div class="w-16"><Input label="Qty" type="number" min="0" bind:value={room.qty} /></div>
									<div class="w-24"><Input label="Cost" type="number" min="0" step="0.01" bind:value={room.cost} /></div>
									<div class="w-24"><Input label="Sell" type="number" min="0" step="0.01" bind:value={room.sell} /></div>
									<button type="button" onclick={() => removeRoom(slot, i)} class="mb-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove room">
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							{/each}
						</div>

						<!-- Breakfast: none / included in room rate / charged separately. -->
						<div class="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
							<div class="w-52">
								<Select label="Breakfast" bind:value={slot.breakfastMode} options={[
									{ value: 'none', label: 'No breakfast' },
									{ value: 'included', label: 'Included in room rate' },
									{ value: 'separate', label: 'Charged separately' }
								]} />
							</div>
							{#if slot.breakfastMode === 'separate'}
								<div class="w-24"><Input label="Cost (SAR)" type="number" min="0" step="0.01" bind:value={slot.breakfastCost} /></div>
								<div class="w-24"><Input label="Sell (SAR)" type="number" min="0" step="0.01" bind:value={slot.breakfastSell} /></div>
								<div class="w-28"><Input label="Persons (0 = auto)" type="number" min="0" bind:value={slot.breakfastPersons} /></div>
								<span class="mb-2 text-xs text-slate-400">× {breakfastPersons(slot)} persons × {num(slot.nights)} nights</span>
							{:else if slot.breakfastMode === 'included'}
								<span class="mb-2 text-xs text-slate-400">Bundled in the room rate — shown as “Breakfast Included”, no extra charge.</span>
							{/if}
						</div>
					</div>
				</div>
			</Card>
		{/each}

		<Button type="button" variant="secondary" size="sm" onclick={addStay}><Plus class="h-4 w-4" /> Add stay</Button>

		<Card title="Transfers (SAR · per vehicle)">
			<div class="space-y-2">
				{#each form.transfers as t, i (i)}
					<div class="flex flex-wrap items-end gap-2">
						<div class="w-44"><Select label="Saved rate" bind:value={t.sel} options={transferOpts} onchange={() => onTransferSel(t)} /></div>
						<div class="w-32"><Select label="Vehicle" bind:value={t.vehicle} options={VEHICLES} /></div>
						{#if t.vehicle === 'Custom'}<div class="w-28"><Input label="Custom" bind:value={t.customVehicle} /></div>{/if}
						<div class="w-44"><Select label="Route" bind:value={t.route} options={ROUTES} /></div>
						{#if t.route === 'Custom'}<div class="w-40"><Input label="Custom route" bind:value={t.customRoute} /></div>{/if}
						<div class="w-40"><VendorPicker service="Transfer" bind:value={t.vendorId} /></div>
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
					<div class="w-36"><VendorPicker service="Visa" bind:value={form.visa.vendorId} /></div>
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
					<p class="text-xs text-slate-400">Issued in-house on Billoo's IATA — no vendor. Adult fare auto-saves to rates.</p>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
						<Select label="Airline (adult fare from rates)" bind:value={form.airline.sel} options={airlineOpts} onchange={onAirlineSel} />
						{#if form.airline.sel === OTHER}
							<Input label="Airline name" bind:value={form.airline.name} placeholder="e.g. Saudia" />
						{/if}
						<Input label="Route" bind:value={form.airline.route} placeholder="e.g. KHI → JED → KHI" />
					</div>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<Input label="Fare class" bind:value={form.airline.fareClass} placeholder="e.g. Economy" />
						<Input label="PNR" bind:value={form.airline.pnr} />
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
				<div class="flex justify-between font-medium text-brand-700"><span>{ppMode === 'advanced' ? 'Per adult' : 'Per person'}</span><span>{formatAmount(headlinePp, 'PKR')}</span></div>
				<div class="flex justify-between text-green-600"><span>Profit</span><span>{formatAmount(result.profitPkr, 'PKR')}</span></div>
			</div>

			<div class="mt-3 border-t border-slate-100 pt-3">
				<div class="mb-2 flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
					<button class="flex-1 rounded-md px-2 py-1 font-medium {ppMode === 'simple' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}" onclick={() => (ppMode = 'simple')}>Simple split</button>
					<button class="flex-1 rounded-md px-2 py-1 font-medium {ppMode === 'advanced' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}" onclick={() => (ppMode = 'advanced')}>Advanced</button>
				</div>
				{#if ppMode === 'simple'}
					<label class="flex items-center gap-2 text-xs text-slate-500">
						<input type="checkbox" bind:checked={form.ppIncludeInfants} class="rounded border-slate-300" />
						Count infants in per-person (÷ {divisor})
					</label>
				{:else}
					<p class="mb-2 text-xs text-slate-400">Shared costs split across {form.adults} adult{form.adults === 1 ? '' : 's'}; children charged only for ticked items.</p>
					<div class="grid grid-cols-2 gap-1 text-xs text-slate-600">
						<label class="flex items-center gap-1"><input type="checkbox" bind:checked={childShare.hotels} class="rounded border-slate-300" /> Hotels</label>
						<label class="flex items-center gap-1"><input type="checkbox" bind:checked={childShare.transfers} class="rounded border-slate-300" /> Transfers</label>
						<label class="flex items-center gap-1"><input type="checkbox" bind:checked={childShare.visa} class="rounded border-slate-300" /> Visa</label>
						<label class="flex items-center gap-1"><input type="checkbox" bind:checked={childShare.tickets} class="rounded border-slate-300" /> Tickets</label>
					</div>
					<div class="mt-2 space-y-1 text-sm">
						<div class="flex justify-between font-medium text-brand-700"><span>Per adult</span><span>{formatAmount(advanced.perAdult, 'PKR')}</span></div>
						{#each advanced.adultBreakdown as b (b.label)}
							<div class="flex justify-between text-xs text-slate-400"><span>{b.label}</span><span>{formatAmount(b.amount, 'PKR')}</span></div>
						{/each}
						{#if form.children > 0}
							<div class="flex justify-between font-medium text-brand-700"><span>Per child</span><span>{formatAmount(advanced.perChild, 'PKR')}</span></div>
							{#each advanced.childBreakdown as b (b.label)}
								<div class="flex justify-between text-xs text-slate-400"><span>{b.label}</span><span>{formatAmount(b.amount, 'PKR')}</span></div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
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
