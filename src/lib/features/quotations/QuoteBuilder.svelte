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
	import { auth } from '$lib/stores/auth.svelte';
	import { useRates, useLatestRoe } from '$features/rates/queries';
	import { latestRates, transferRateOptions } from '$features/rates/types';
	import { latestHotelRoomRates } from '$features/rates/observations';
	import { useAllObservations } from '$features/rates/queries';
	import { rateAgeDays } from '$features/rates/validity';
	import { applyObservationPlan } from '$features/rates/api';
	import { reconcileObservations, type ObsStay, type RatePick } from '$features/rates/observations';
	import HotelRatePanel from '$features/rates/HotelRatePanel.svelte';
	import VendorPicker from '$features/vendors/VendorPicker.svelte';
	import HotelSearchSelect from '$features/hotels/HotelSearchSelect.svelte';
	import {
		calculateQuotation,
		perPerson,
		perPersonDivisor,
		personsInRooms,
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
	import { useCreateQuotation, useUpdateQuotationFull } from './queries';
	import { getQuotation, getQuotationLines } from './api';
	import type { Quotation } from './types';
	import {
		OTHER,
		ROOM_TYPES,
		OCCUPANCY,
		VEHICLES,
		ROUTES,
		TRANSFER_PRESETS,
		AIRLINE_ROUTES,
		newRoom,
		newTransfer,
		newFareTier,
		blankHotel,
		blankVisa,
		blankOtherService,
		blankAirline,
		blankForm,
		quotationToForm,
		roomTypeEnum,
		roomLabelFromEnum,
		type HotelForm,
		type TransferForm,
		type VisaForm,
		type OtherServiceForm,
		type FareTierRow
	} from './edit-map';
	import RangeCalendar from './RangeCalendar.svelte';
	import QuotationList from './QuotationList.svelte';
	import ServiceShell from './ServiceShell.svelte';
	import { useUploadDocument, useDocuments } from '$features/documents/queries';
	import { listDocuments } from '$features/documents/api';
	import type { DocumentType, Document } from '$features/documents/api';

	let {
		queryId,
		editId,
		embedded = false,
		mode = 'quote',
		onSaved
	}: {
		queryId: string;
		editId?: string;
		embedded?: boolean;
		mode?: 'quote' | 'booking';
		onSaved?: (quotation: Quotation) => void;
	} = $props();

	const client = useQueryClient();
	const queryDetail = untrack(() => useQueryDetail(queryId));
	const rates = useRates();
	const observations = useAllObservations();
	const roe = useLatestRoe();
	const createQuotation = untrack(() => useCreateQuotation(queryId));
	const updateFull = untrack(() => useUpdateQuotationFull(queryId));
	const setStatus = useSetQueryStatus();
	const uploadDoc = untrack(() => useUploadDocument('query', queryId));

	// Existing documents the staff can LINK as a service's proof instead of
	// re-uploading (they may already be filed in the Documents section). Query
	// docs are reactive; passenger-vault docs load once the passenger is known.
	const queryDocs = untrack(() => useDocuments('query', queryId));
	let passengerDocs = $state<Document[]>([]);
	$effect(() => {
		const pid = $queryDetail.data?.passenger_id;
		if (!pid) {
			passengerDocs = [];
			return;
		}
		listDocuments('passenger', pid).then((d) => (passengerDocs = d));
	});
	const existingDocs = $derived([
		...($queryDocs.data ?? []).map((d) => ({ id: d.id, label: `${d.document_type} · ${d.file_name}` })),
		...passengerDocs.map((d) => ({ id: d.id, label: `${d.document_type} · ${d.file_name} (profile)` }))
	]);

	// In booking mode the builder edits one quotation in place — track its id so
	// every save (incl. mark-booked) reuses it instead of minting a new version.
	let savedId = $state(untrack(() => editId));

	const booking = $derived(mode === 'booking');
	const saving = $derived($createQuotation.isPending || $updateFull.isPending);
	// Spread a form service's booked status into the calculator input.
	const bk = (x: { booked: boolean; bookedAt: string; bookingRef: string; proof: boolean; proofDocId: string }) => ({
		booked: x.booked,
		bookedAt: x.bookedAt || null,
		bookingRef: x.bookingRef || null,
		proof: x.proof,
		proofDocId: x.proofDocId || null
	});

	const pool = $derived(latestRates($rates.data ?? []));
	const byId = $derived(new Map(pool.map((r) => [r.id, r])));
	const rate = (id: string) => byId.get(id);

	const num = (v: number | string) => Number(v) || 0;
	const splitLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

	const MEAL_PLANS = [
		{ value: 'RO', label: 'RO · room only' },
		{ value: 'BB', label: 'BB · breakfast' },
		{ value: 'HB', label: 'HB · half board' },
		{ value: 'FB', label: 'FB · full board' }
	];

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
		const first = a.adultFares[0];
		if (first) {
			first.cost = Number(r.cost_price);
			first.sell = Number(r.selling_price);
		}
	}

	// Split a passenger type into another fare tier. Going from one tier to two
	// makes the (previously implicit) full-type count explicit so the running
	// total starts balanced; the new tier copies the first tier's fare.
	function splitFare(rows: FareTierRow[], total: number) {
		const first = rows[0];
		if (rows.length === 1 && first) first.count = total;
		rows.push(newFareTier(first?.cost ?? 0, first?.sell ?? 0, 0));
	}
	function removeFare(rows: FareTierRow[], i: number) {
		rows.splice(i, 1);
	}
	// Map a type's tier rows to the calculator shape: a lone tier prices the whole
	// type (single fare, count from pax); 2+ tiers pass explicit per-tier counts.
	function fareGroups(rows: FareTierRow[]) {
		const clean = rows.map((r) => ({ count: num(r.count), cost: num(r.cost), sell: num(r.sell) }));
		const first = clean[0] ?? { count: 0, cost: 0, sell: 0 };
		return {
			cost: first.cost,
			sell: first.sell,
			tiers: clean.length > 1 ? clean : undefined
		};
	}

	let form = $state(blankForm());

	// Booking progress: how many of the live services are marked booked.
	const services = $derived([
		...form.hotels,
		...form.transfers,
		...form.visas,
		...form.otherServices,
		...(form.airlineInclude ? [form.airline] : [])
	]);
	const serviceCount = $derived(services.length);
	const bookedCount = $derived(services.filter((s) => s.booked).length);

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
		if (r) {
			form.roeValue = Number(r.sar_to_pkr);
			if (r.usd_to_pkr) form.usdValue = Number(r.usd_to_pkr);
		}
		seeded = true;
	});

	// --- Stays (itinerary) --------------------------------------------------
	function addStay() {
		form.hotels.push(blankHotel(''));
		rechain(form.hotels);
	}
	// A 2nd hotel for the SAME period as stay `i`: same city/dates/nights, but its
	// own vendor/rooms. Flagged parallel so it inherits dates and isn't double-counted.
	function addHotelToStay(i: number) {
		const anchor = form.hotels[i];
		if (!anchor) return;
		const h = blankHotel(anchor.city);
		h.parallel = true;
		h.lockCheckIn = true;
		h.checkIn = anchor.checkIn;
		h.checkOut = anchor.checkOut;
		h.nights = anchor.nights;
		form.hotels.splice(i + 1, 0, h);
		rechain(form.hotels);
	}
	// Display number for a stay = count of non-parallel stays up to & incl. it.
	function stayNo(i: number): number {
		return form.hotels.slice(0, i + 1).filter((h) => !h.parallel).length;
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

	// A canonical hotel was picked → auto-populate its room costs from the latest
	// captured observations. Selling price stays blank — that's a margin call.
	function onHotelPick(h: HotelForm) {
		if (!h.hotelId) return;
		const recents = latestHotelRoomRates($observations.data ?? [], h.hotelId);
		if (recents.length) {
			h.rooms = recents.map((r) => {
				const occ = r.occupancy ?? 2;
				const rt = rtFromOccupancy(occ);
				return {
					rt,
					customLabel: rt === 'Custom' ? `Sleeps ${occ}` : '',
					occupancy: occ,
					qty: 1,
					cost: r.cost,
					sell: 0
				};
			});
			const v = recents[0]?.vendorId;
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

	// Click-to-fill from the hotel's known vendor rates: set vendor + meal on the
	// stay and update (or add) the matching room row with the captured cost.
	function applyRatePick(h: HotelForm, p: RatePick) {
		h.vendorId = p.vendorId ?? '';
		if (p.mealPlan) h.mealPlan = p.mealPlan;
		const label = roomLabelFromEnum(p.roomType);
		const occ = p.occupancy ?? OCCUPANCY[label] ?? 0;
		const match = h.rooms.find((r) => roomTypeEnum(r.rt) === p.roomType && r.occupancy === occ);
		if (match) {
			match.cost = p.cost;
		} else {
			const room = newRoom();
			room.rt = ROOM_TYPES.includes(label) ? label : 'Custom';
			if (room.rt === 'Custom') room.customLabel = label;
			room.occupancy = occ || room.occupancy;
			room.cost = p.cost;
			// Replace a still-blank starter row rather than stacking an empty one.
			const blankIdx = h.rooms.findIndex((r) => num(r.cost) === 0 && num(r.sell) === 0);
			if (blankIdx >= 0) h.rooms[blankIdx] = room;
			else h.rooms.push(room);
		}
		dirty = true;
	}

	// Most recent capture age for a selected hotel — drives the "update rates" hint.
	function hotelRateAge(h: HotelForm): number | null {
		if (!h.hotelId) return null;
		const recents = latestHotelRoomRates($observations.data ?? [], h.hotelId);
		const newest = recents.reduce<string | null>(
			(a, r) => (a && a > r.capturedAt ? a : r.capturedAt),
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
	// Fill the transfer list from a full-transport preset (one leg per route).
	function applyTransferPreset(routes: string[]) {
		form.transfers = routes.map((route) => {
			const t = newTransfer();
			if (ROUTES.includes(route)) {
				t.route = route;
			} else {
				t.route = 'Custom';
				t.customRoute = route;
			}
			return t;
		});
		dirty = true;
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
			...bk(h),
			city,
			name: h.name || city,
			currency: h.currency,
			parallel: h.parallel,
			hotelId: h.hotelId || null,
			mealPlan: h.mealPlan || 'RO',
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
			...bk(t),
			vehicleType: vehicleLabel(t),
			route: routeLabel(t),
			date: t.date || null,
			currency: t.currency,
			vendorId: t.vendorId || null,
			costSar: num(t.cost),
			sellSar: num(t.sell),
			vehicles: num(t.vehicles)
		}));
		const visas = form.visas.map((v) => ({
			...bk(v),
			visaType: v.type === 'Other' ? v.otherLabel || 'Other' : 'Umrah',
			currency: v.currency,
			vendorId: v.vendorId || null,
			costSar: num(v.cost),
			sellSar: num(v.sell),
			persons: num(v.persons)
		}));
		const otherServices = form.otherServices.map((o) => ({
			...bk(o),
			label: o.label,
			currency: o.currency,
			vendorId: o.vendorId || null,
			costSar: num(o.cost),
			sellSar: num(o.sell),
			qty: num(o.qty)
		}));
		const ai = form.airline;
		return {
			roe: num(form.roeValue),
			usd: num(form.usdValue),
			pax: { adults: form.adults, children: form.children, infants: form.infants },
			hotels,
			transfers,
			visas,
			otherServices,
			tickets: form.airlineInclude
				? (() => {
						const a = fareGroups(ai.adultFares);
						const c = fareGroups(ai.childFares);
						const inf = fareGroups(ai.infantFares);
						return { ...bk(ai), airlineName: ai.name || 'Tickets', rateCardId: ai.sel === OTHER || !ai.sel ? null : ai.sel, route: ai.route || null, fareClass: ai.fareClass || null, pnr: ai.pnr || null, adultCost: a.cost, adultSell: a.sell, childCost: c.cost, childSell: c.sell, infantCost: inf.cost, infantSell: inf.sell, adultTiers: a.tiers, childTiers: c.tiers, infantTiers: inf.tiers };
					})()
				: null
		};
	});

	const result = $derived(calculateQuotation(input));
	const divisor = $derived(perPersonDivisor({ adults: form.adults, children: form.children, infants: form.infants }, form.ppIncludeInfants));
	// Per person = the WHOLE package (every service, visa included) ÷ all
	// passengers. One all-in rate for everyone — no adult/child split.
	const pp = $derived(perPerson(result.totalSellPkr, divisor));

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
			perPersonPkr: pp,
			label: form.label || null,
			hotels: form.hotels.map(hotelWa).filter((h): h is WhatsAppHotel => h !== null),
			visaType: form.visas.length
				? form.visas.map((v) => (v.type === 'Other' ? v.otherLabel || 'Other' : 'Umrah')).join(' + ')
				: null,
			transferRoutes: form.transfers.map(routeLabel),
			ticketsIncluded: form.airlineInclude,
			airlineName: form.airlineInclude ? form.airline.name || null : null,
			airlineRoute: form.airlineInclude ? form.airline.route || null : null,
			otherServices: form.otherServices.map((o) => o.label.trim()).filter(Boolean)
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
		form.visas = [blankVisa()];
		form.airline = blankAirline();
		form.airlineInclude = false;
		dirty = false;
	}

	// Build the rate snapshots that smart auto-save will persist. Hotels are NOT
	// included here — hotel costs are captured as rate observations (Service
	// Rates → Hotels), not rate cards. See buildCaptureStays / buildObservations.
	function buildSnapshots(): RateSnapshot[] {
		const snaps: RateSnapshot[] = [];
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
				cost_price: num(a.adultFares[0]?.cost ?? 0),
				selling_price: num(a.adultFares[0]?.sell ?? 0)
			});
		}
		for (const v of form.visas) {
			if (num(v.cost) <= 0 && num(v.sell) <= 0) continue;
			snaps.push({
				item_type: 'visa',
				name: v.type === 'Other' ? v.otherLabel || 'Other' : 'Umrah',
				city: null,
				occupancy: null,
				vendor_id: v.vendorId || null,
				currency: v.currency,
				unit: 'per person',
				cost_price: num(v.cost),
				selling_price: num(v.sell)
			});
		}
		return snaps;
	}

	// Silent rate capture: one append-only observation per complete hotel room
	// line (canonical hotel + room type + dates + cost). Never blocks save.
	function buildCaptureStays(): ObsStay[] {
		return form.hotels
			.filter((h) => h.hotelId && h.checkIn && h.checkOut && num(h.nights) > 0)
			.map((h) => ({
				hotelId: h.hotelId,
				vendorId: h.vendorId,
				checkIn: h.checkIn,
				checkOut: h.checkOut,
				nights: num(h.nights),
				mealPlan: h.mealPlan,
				rooms: h.rooms.map((r) => ({
					roomType: roomTypeEnum(r.rt),
					occupancy: num(r.occupancy),
					cost: num(r.cost)
				}))
			}));
	}

	async function save(addAnother: boolean) {
		if (num(form.roeValue) <= 0) {
			alert('Set an exchange rate (ROE) first — see Rates.');
			return;
		}
		if (result.lines.some((l) => l.currency === 'USD') && num(form.usdValue) <= 0) {
			alert('Some components are in USD — set the USD → PKR rate first.');
			return;
		}
		const args = {
			queryId,
			roe: num(form.roeValue),
			usd: num(form.usdValue) || null,
			pax: { adults: form.adults, children: form.children, infants: form.infants },
			result,
			whatsappText,
			label: form.label || null,
			perPersonPkr: pp,
			ppIncludeInfants: form.ppIncludeInfants,
			validUntil: form.validUntil || null,
			inclusions: splitLines(form.inclusions),
			exclusions: splitLines(form.exclusions)
		};
		// Booking stage edits update ONE quotation in place (no version spam — the
		// booking is the source of truth). Quote stage mints a new version each save.
		let quotation: Quotation;
		if (booking && savedId) {
			quotation = await $updateFull.mutateAsync({ id: savedId, args });
		} else {
			quotation = await $createQuotation.mutateAsync(args);
			savedId = quotation.id;
		}
		// Smart auto-save: persist any new/changed hotel, transfer, ticket & visa
		// rates so they're available (vendor-wise) next time. Best-effort.
		try {
			await persistRates($rates.data ?? [], buildSnapshots());
			await client.invalidateQueries({ queryKey: ['rates'] });
		} catch (e) {
			console.warn('[quote] rate auto-save failed', e);
		}
		// Silent rate capture — must NEVER block the quotation save. Reconciles
		// against existing observations: overlapping windows are price-refreshed and
		// stretched; only genuinely new seasons add a row.
		try {
			const plan = reconcileObservations($observations.data ?? [], buildCaptureStays(), {
				quotationId: quotation.id,
				queryId,
				capturedBy: auth.user?.id ?? null,
				now: new Date().toISOString()
			});
			await applyObservationPlan(plan);
			await client.invalidateQueries({ queryKey: ['observations'] });
			await client.invalidateQueries({ queryKey: ['hotel-observations'] });
		} catch (e) {
			console.warn('[quote] rate observation capture failed', e);
		}
		// In quote mode a save moves the pipeline forward to Quoted. In booking
		// mode we stay in Booking and let the caller drive the booking from it.
		if (mode === 'quote') {
			const st = $queryDetail.data?.status;
			if (st === 'New Query' || st === 'Working') {
				$setStatus.mutate({ id: queryId, status: 'Quoted' });
			}
		}
		if (addAnother) resetLines();
		else onSaved?.(quotation);
	}

	// --- Per-service booking (booking stage) --------------------------------
	// Marking/unmarking/attaching a proof saves immediately so the booking,
	// itinerary and invoice reflect it at once. Services stay fully editable.
	type Svc = { booked: boolean; bookedAt: string; proof: boolean; proofDocId: string };
	async function markBooked(svc: Svc) {
		svc.booked = true;
		if (!svc.bookedAt) svc.bookedAt = new Date().toISOString();
		await save(false);
	}
	async function unmarkBooked(svc: Svc) {
		svc.booked = false;
		svc.bookedAt = '';
		svc.proof = false;
		svc.proofDocId = '';
		await save(false);
	}
	function uploadProof(svc: Svc, file: File, docType: DocumentType) {
		$uploadDoc.mutate(
			{ file, entityType: 'query', entityId: queryId, documentType: docType },
			{
				onSuccess: (doc) => {
					svc.proof = true;
					svc.proofDocId = doc.id;
					save(false);
				}
			}
		);
	}
	// "Already uploaded" — attach an existing document as this service's proof.
	function linkProof(svc: Svc, docId: string) {
		if (!docId) return;
		svc.proof = true;
		svc.proofDocId = docId;
		save(false);
	}
</script>

{#if !embedded}
	<a href="/queries/{queryId}" class="no-print mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
		<ArrowLeft class="h-4 w-4" /> Back to query
	</a>
{/if}

{#if !booking}
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-slate-800">Build quotation</h1>
		<p class="text-sm text-slate-500">Prices pull from the latest Rates. SAR converts to PKR via the ROE. Manual entries auto-save to the rate database; hotel costs are captured into Service Rates → Hotels.</p>
	</div>
{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
	<div class="space-y-4 lg:col-span-2">
		<Card title={booking ? 'Pax & agreed rates' : 'Pax, rates & label'}>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-6">
				<Input label="ROE (1 SAR = PKR)" type="number" min="0" step="0.0001" bind:value={form.roeValue} />
				<Input label="USD (1 USD = PKR)" type="number" min="0" step="0.0001" bind:value={form.usdValue} />
				<Input label="Adults" type="number" min="0" bind:value={form.adults} />
				<Input label="Children" type="number" min="0" bind:value={form.children} />
				<Input label="Infants" type="number" min="0" bind:value={form.infants} />
				<Input label="Tier (e.g. 3★ / Premium)" bind:value={form.label} placeholder="e.g. 5-star" />
			</div>
			<p class="mt-1 text-xs text-slate-400">USD rate only needed if a stay/transfer/visa below is set to USD.</p>
			{#if !booking}
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
			{/if}
		</Card>

		<!-- Itinerary: a free-ordered sequence of stays with chained dates. -->
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Itinerary · {form.hotels.length} stay{form.hotels.length === 1 ? '' : 's'}</h2>
			<span class="text-sm font-medium {requestedNights && itineraryNights !== requestedNights ? 'text-amber-600' : 'text-slate-500'}">
				{itineraryNights} night{itineraryNights === 1 ? '' : 's'} total{requestedNights ? ` · requested ${requestedNights}` : ''}
			</span>
		</div>

		{#snippet stayBody(slot: HotelForm, hi: number)}
			{@const age = hotelRateAge(slot)}
			<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-xs font-semibold uppercase text-slate-400">
								Stay {stayNo(hi)}{slot.parallel ? ' · 2nd hotel (same dates)' : ''}
							</span>
							<select bind:value={slot.currency} class="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-600 focus:border-brand-500 focus:outline-none">
								<option value="SAR">SAR</option>
								<option value="USD">USD</option>
								<option value="PKR">PKR</option>
							</select>
						</div>
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
							<HotelSearchSelect bind:hotelId={slot.hotelId} bind:name={slot.name} bind:city={slot.city} onPicked={() => onHotelPick(slot)} />
							<div class="grid grid-cols-2 gap-2">
								<Input label="City" bind:value={slot.city} placeholder="e.g. Makkah" />
								<Select label="Meal plan" bind:value={slot.mealPlan} options={MEAL_PLANS} />
							</div>
							<VendorPicker service="Hotel" bind:value={slot.vendorId} />
							{#if age !== null && age >= 3}
								<p class="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">Saved rate is {age} days old — please update.</p>
							{/if}
						</div>
						<div>
							{#if slot.parallel}
								<div class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
									Shares <span class="font-medium">Stay {stayNo(hi)}</span> dates —
									{slot.checkIn || '—'} → {slot.checkOut || '—'} ({num(slot.nights)} night{num(slot.nights) === 1 ? '' : 's'}).
									<br />A second hotel for the same period; not double-counted in the night total.
								</div>
							{:else if hi === 0}
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
							{#if !slot.parallel}
								<div class="mt-2 w-24">
									<Input label="Nights" type="number" min="0" bind:value={slot.nights} onchange={() => onStayNights(hi)} />
								</div>
							{/if}
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
									{/if}
									{#if room.rt === 'Custom' || room.rt === 'Sharing'}
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

					{#if slot.hotelId}
						{#key slot.hotelId}
							<HotelRatePanel hotelId={slot.hotelId} onPick={(p) => applyRatePick(slot, p)} />
						{/key}
					{/if}

					{#if !slot.parallel}
						<div class="border-t border-slate-100 pt-2">
							<Button type="button" variant="ghost" size="sm" onclick={() => addHotelToStay(hi)}>
								<Plus class="h-4 w-4" /> Add another hotel (same dates)
							</Button>
						</div>
					{/if}
				</div>
		{/snippet}

		{#each form.hotels as slot, hi (slot.id)}
			{#if booking}
				<ServiceShell
					accent="hotel"
					title={`Stay ${stayNo(hi)}${slot.parallel ? ' · 2nd hotel' : ''}${slot.city ? ` · ${slot.city}` : ''}`}
					subtitle={slot.name || ''}
					booked={slot.booked}
					proof={slot.proof}
					busy={saving}
					{existingDocs}
					onMarkBooked={() => markBooked(slot)}
					onUnmark={() => unmarkBooked(slot)}
					onUploadProof={(f, d) => uploadProof(slot, f, d)}
					onLinkProof={(id) => linkProof(slot, id)}
				>
					{@render stayBody(slot, hi)}
				</ServiceShell>
			{:else}
				<Card title={`Stay ${stayNo(hi)}${slot.parallel ? ' · 2nd hotel' : ''}${slot.city ? ` · ${slot.city}` : ''}`}>
					{@render stayBody(slot, hi)}
				</Card>
			{/if}
		{/each}

		<Button type="button" variant="secondary" size="sm" onclick={addStay}><Plus class="h-4 w-4" /> Add stay</Button>

		{#snippet transferPresets()}
			<div class="mb-3 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
				<span class="text-xs font-medium text-slate-400">Full transport:</span>
				{#each TRANSFER_PRESETS as p (p.label)}
					<button type="button" onclick={() => applyTransferPreset(p.routes)} class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
						{p.label}
					</button>
				{/each}
			</div>
		{/snippet}
		{#snippet transferBody(t: TransferForm, i: number)}
			<div class="flex flex-wrap items-end gap-2">
				<div class="w-44"><Select label="Saved rate" bind:value={t.sel} options={transferOpts} onchange={() => onTransferSel(t)} /></div>
				<div class="w-32"><Select label="Vehicle" bind:value={t.vehicle} options={VEHICLES} /></div>
				{#if t.vehicle === 'Custom'}<div class="w-28"><Input label="Custom" bind:value={t.customVehicle} /></div>{/if}
				<div class="w-44"><Select label="Route" bind:value={t.route} options={ROUTES} /></div>
				{#if t.route === 'Custom'}<div class="w-40"><Input label="Custom route" bind:value={t.customRoute} /></div>{/if}
				<div class="w-36"><Input label="Date" type="date" bind:value={t.date} /></div>
				<div class="w-20"><Select label="Cur" bind:value={t.currency} options={['SAR', 'USD', 'PKR']} /></div>
				<div class="w-40"><VendorPicker service="Transfer" bind:value={t.vendorId} /></div>
				<div class="w-16"><Input label="Qty" type="number" min="0" bind:value={t.vehicles} /></div>
				<div class="w-24"><Input label="Cost" type="number" min="0" step="0.01" bind:value={t.cost} /></div>
				<div class="w-24"><Input label="Sell" type="number" min="0" step="0.01" bind:value={t.sell} /></div>
				<button type="button" onclick={() => form.transfers.splice(i, 1)} class="mb-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove transfer">
					<Trash2 class="h-4 w-4" />
				</button>
			</div>
		{/snippet}

		{#if booking}
			<div class="space-y-2">
				<h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Transfers</h2>
				{@render transferPresets()}
				{#each form.transfers as t, i (i)}
					<ServiceShell accent="transfer" title={routeLabel(t)} subtitle={vehicleLabel(t)} booked={t.booked} proof={t.proof} busy={saving} {existingDocs} onMarkBooked={() => markBooked(t)} onUnmark={() => unmarkBooked(t)} onUploadProof={(f, d) => uploadProof(t, f, d)} onLinkProof={(id) => linkProof(t, id)}>
						{@render transferBody(t, i)}
					</ServiceShell>
				{/each}
				<Button size="sm" variant="ghost" onclick={() => form.transfers.push(newTransfer())}><Plus class="h-4 w-4" /> Transfer</Button>
			</div>
		{:else}
			<Card title="Transfers (SAR · per vehicle)">
				{@render transferPresets()}
				<div class="space-y-2">
					{#each form.transfers as t, i (i)}
						{@render transferBody(t, i)}
					{/each}
					<Button size="sm" variant="ghost" onclick={() => form.transfers.push(newTransfer())}><Plus class="h-4 w-4" /> Transfer</Button>
				</div>
			</Card>
		{/if}

		{#snippet visaBody(v: VisaForm, i: number)}
			<div class="flex flex-wrap items-end gap-2">
				<div class="w-32"><Select label="Visa type" bind:value={v.type} options={['Umrah', 'Other']} /></div>
				{#if v.type === 'Other'}<div class="w-32"><Input label="Label" bind:value={v.otherLabel} placeholder="e.g. Non-Masar" /></div>{/if}
				<div class="w-20"><Input label="Persons" type="number" min="0" bind:value={v.persons} /></div>
				<div class="w-20"><Select label="Cur" bind:value={v.currency} options={['SAR', 'USD', 'PKR']} /></div>
				<div class="w-36"><VendorPicker service="Visa" bind:value={v.vendorId} /></div>
				<div class="w-24"><Input label="Cost/pp" type="number" min="0" step="0.01" bind:value={v.cost} /></div>
				<div class="w-24"><Input label="Sell/pp" type="number" min="0" step="0.01" bind:value={v.sell} /></div>
				<button type="button" onclick={() => form.visas.splice(i, 1)} class="mb-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove visa">
					<Trash2 class="h-4 w-4" />
				</button>
			</div>
		{/snippet}

		{#if booking}
			<div class="space-y-2">
				<h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Visas</h2>
				{#each form.visas as v, i (i)}
					<ServiceShell accent="visa" title={`${v.type === 'Other' ? v.otherLabel || 'Other' : 'Umrah'} visa`} subtitle={num(v.persons) > 0 ? `${num(v.persons)} pax` : 'all pax'} booked={v.booked} proof={v.proof} busy={saving} {existingDocs} onMarkBooked={() => markBooked(v)} onUnmark={() => unmarkBooked(v)} onUploadProof={(f, d) => uploadProof(v, f, d)} onLinkProof={(id) => linkProof(v, id)}>
						{@render visaBody(v, i)}
					</ServiceShell>
				{/each}
				<Button size="sm" variant="ghost" onclick={() => form.visas.push(blankVisa())}><Plus class="h-4 w-4" /> Visa</Button>
			</div>
		{:else}
			<Card title="Visas (per line, by headcount)">
				<p class="mb-2 text-xs text-slate-400">Each line covers a set number of people — e.g. 2× Masar + 2× Non-Masar in a family of 4. Persons 0 = everyone. Visa is quoted as its own total.</p>
				<div class="space-y-2">
					{#each form.visas as v, i (i)}
						{@render visaBody(v, i)}
					{/each}
					{#if form.visas.length === 0}
						<p class="text-xs text-slate-400">No visa on this quote.</p>
					{/if}
					<Button size="sm" variant="ghost" onclick={() => form.visas.push(blankVisa())}><Plus class="h-4 w-4" /> Visa</Button>
				</div>
			</Card>
		{/if}

		{#snippet otherBody(o: OtherServiceForm, i: number)}
			<div class="flex flex-wrap items-end gap-2">
				<div class="w-44"><Input label="Service" bind:value={o.label} placeholder="e.g. Polio certificate" /></div>
				<div class="w-16"><Input label="Qty" type="number" min="1" bind:value={o.qty} /></div>
				<div class="w-20"><Select label="Cur" bind:value={o.currency} options={['PKR', 'SAR', 'USD']} /></div>
				<div class="w-24"><Input label="Cost" type="number" min="0" step="0.01" bind:value={o.cost} /></div>
				<div class="w-24"><Input label="Sell" type="number" min="0" step="0.01" bind:value={o.sell} /></div>
				<button type="button" onclick={() => form.otherServices.splice(i, 1)} class="mb-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove service">
					<Trash2 class="h-4 w-4" />
				</button>
			</div>
		{/snippet}

		{#if booking}
			<div class="space-y-2">
				<h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Other services</h2>
				{#each form.otherServices as o, i (i)}
					<ServiceShell accent="other" title={o.label || 'Service'} subtitle={num(o.qty) > 1 ? `×${num(o.qty)}` : ''} booked={o.booked} proof={o.proof} busy={saving} {existingDocs} onMarkBooked={() => markBooked(o)} onUnmark={() => unmarkBooked(o)} onUploadProof={(f, d) => uploadProof(o, f, d)} onLinkProof={(id) => linkProof(o, id)}>
						{@render otherBody(o, i)}
					</ServiceShell>
				{/each}
				<Button size="sm" variant="ghost" onclick={() => form.otherServices.push(blankOtherService())}><Plus class="h-4 w-4" /> Service</Button>
			</div>
		{:else}
			<Card title="Other services">
				<p class="mb-2 text-xs text-slate-400">Add-ons like Polio certificate, insurance, etc. Priced as their own total.</p>
				<div class="space-y-2">
					{#each form.otherServices as o, i (i)}
						{@render otherBody(o, i)}
					{/each}
					{#if form.otherServices.length === 0}
						<p class="text-xs text-slate-400">No extra services.</p>
					{/if}
					<Button size="sm" variant="ghost" onclick={() => form.otherServices.push(blankOtherService())}><Plus class="h-4 w-4" /> Service</Button>
				</div>
			</Card>
		{/if}

		{#snippet fareTierRows(rows: FareTierRow[], total: number, typeLabel: string)}
			{@const tally = rows.reduce((a, r) => a + num(r.count), 0)}
			<div class="space-y-1.5">
				<div class="flex items-center justify-between">
					<span class="text-xs font-medium text-slate-500">{typeLabel} <span class="text-slate-400">({total})</span></span>
					{#if rows.length > 1}
						<span class="text-xs font-medium {tally === total ? 'text-emerald-600' : 'text-amber-600'}">
							{tally === total ? `groups total ${tally} ✓` : `groups total ${tally} — need ${total}`}
						</span>
					{/if}
				</div>
				{#each rows as r, i (i)}
					<div class="grid grid-cols-2 gap-2 {rows.length > 1 ? 'sm:grid-cols-4' : ''}">
						{#if rows.length > 1}
							<Input label={i === 0 ? 'Count' : ''} type="number" min="0" bind:value={r.count} />
						{/if}
						<Input label={i === 0 ? `${typeLabel} cost` : ''} type="number" min="0" bind:value={r.cost} />
						<Input label={i === 0 ? `${typeLabel} sell` : ''} type="number" min="0" bind:value={r.sell} />
						{#if rows.length > 1}
							<button type="button" onclick={() => removeFare(rows, i)} class="flex items-center justify-center self-end rounded-lg px-2 py-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove fare group">
								<Trash2 class="h-4 w-4" />
							</button>
						{/if}
					</div>
				{/each}
				<button type="button" onclick={() => splitFare(rows, total)} class="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
					<Plus class="h-3.5 w-3.5" /> Split fare
				</button>
			</div>
		{/snippet}

		{#snippet ticketsBody()}
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
						<Input label="Route (multi-city ok)" bind:value={form.airline.route} placeholder="e.g. KHI → JED → MED → KHI" />
					</div>
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="text-xs font-medium text-slate-400">Common:</span>
						{#each AIRLINE_ROUTES as r (r)}
							<button type="button" onclick={() => (form.airline.route = r)} class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
								{r}
							</button>
						{/each}
					</div>
					<div class="grid grid-cols-2 gap-2">
						<Input label="Fare class" bind:value={form.airline.fareClass} placeholder="e.g. Economy" />
						<Input label="PNR" bind:value={form.airline.pnr} />
					</div>
					<p class="text-xs text-slate-400">Same type at different fares? Use “Split fare” to add a group (e.g. 1 @ 144 + 11 @ 155) — counts must total that type's passengers.</p>
					{@render fareTierRows(form.airline.adultFares, form.adults, 'Adult')}
					{#if form.children > 0}
						{@render fareTierRows(form.airline.childFares, form.children, 'Child')}
					{/if}
					{#if form.infants > 0}
						{@render fareTierRows(form.airline.infantFares, form.infants, 'Infant')}
					{/if}
				</div>
			{/if}
		{/snippet}

		{#if booking}
			<ServiceShell accent="ticket" title="Air tickets" subtitle={form.airlineInclude ? form.airline.name || '' : 'not included'} booked={form.airline.booked} proof={form.airline.proof} busy={saving} {existingDocs} onMarkBooked={() => markBooked(form.airline)} onUnmark={() => unmarkBooked(form.airline)} onUploadProof={(f, d) => uploadProof(form.airline, f, d)} onLinkProof={(id) => linkProof(form.airline, id)}>
				{@render ticketsBody()}
			</ServiceShell>
		{:else}
			<Card title="Tickets (PKR)">
				{@render ticketsBody()}
			</Card>
		{/if}
	</div>

	<div class="space-y-4 lg:sticky lg:top-4 lg:self-start">
		<Card title={booking ? 'Invoice — cost sheet (staff)' : 'Breakdown (staff)'}>
			{#if booking && serviceCount > 0}
				<div class="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
					<div class="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
						<span>Booking progress</span>
						<span>{bookedCount} / {serviceCount} services booked</span>
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-slate-200">
						<div class="h-full rounded-full bg-emerald-500 transition-all" style="width: {serviceCount ? Math.round((bookedCount / serviceCount) * 100) : 0}%"></div>
					</div>
				</div>
			{/if}
			<div class="space-y-1.5 text-sm">
				{#each result.lines as l, i (i)}
					<div class="flex items-center justify-between gap-2">
						<span class="flex min-w-0 items-center gap-1.5 text-slate-500">
							{#if booking}
								{#if l.meta?.booked === true}
									<Check class="h-3.5 w-3.5 shrink-0 text-emerald-500" />
								{:else}
									<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"></span>
								{/if}
							{/if}
							<span class="truncate">{l.label}</span>
						</span>
						<span class="shrink-0 text-slate-700">{formatAmount(l.lineSell, l.currency)}</span>
					</div>
				{/each}
				{#if result.lines.length === 0}<p class="text-slate-400">Pick items to price.</p>{/if}
			</div>
			<div class="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
				<div class="flex justify-between"><span class="text-slate-500">SAR subtotal{num(form.roeValue) > 0 ? ` → ${formatAmount(result.sarSell * num(form.roeValue), 'PKR')}` : ''}</span><span>{formatAmount(result.sarSell, 'SAR')}</span></div>
				{#if result.usdSell > 0}
					<div class="flex justify-between"><span class="text-slate-500">USD subtotal{num(form.usdValue) > 0 ? ` → ${formatAmount(result.usdSell * num(form.usdValue), 'PKR')}` : ''}</span><span>{formatAmount(result.usdSell, 'USD')}</span></div>
				{/if}
				{#if result.pkrLandSell > 0}
					<div class="flex justify-between"><span class="text-slate-500">PKR subtotal (direct)</span><span>{formatAmount(result.pkrLandSell, 'PKR')}</span></div>
				{/if}
				<div class="flex justify-between"><span class="text-slate-500">Tickets (PKR)</span><span>{formatAmount(result.ticketsSellPkr, 'PKR')}</span></div>
				{#if result.visaSellPkr > 0}
					<div class="flex justify-between"><span class="text-slate-500">Visa total (PKR)</span><span>{formatAmount(result.visaSellPkr, 'PKR')}</span></div>
				{/if}
				{#if result.otherSellPkr > 0}
					<div class="flex justify-between"><span class="text-slate-500">Other services (PKR)</span><span>{formatAmount(result.otherSellPkr, 'PKR')}</span></div>
				{/if}
				<div class="flex justify-between font-semibold text-slate-800"><span>Total (PKR)</span><span>{formatAmount(result.totalSellPkr, 'PKR')}</span></div>
				<div class="flex justify-between font-medium text-brand-700"><span>Per person <span class="text-xs font-normal text-slate-400">(all-in ÷ {divisor})</span></span><span>{formatAmount(pp, 'PKR')}</span></div>
				<div class="flex justify-between text-green-600"><span>Profit</span><span>{formatAmount(result.profitPkr, 'PKR')}</span></div>
			</div>

			<div class="mt-3 border-t border-slate-100 pt-3">
				<label class="flex items-center gap-2 text-xs text-slate-500">
					<input type="checkbox" bind:checked={form.ppIncludeInfants} class="rounded border-slate-300" />
					Count infants in per-person (÷ {divisor})
				</label>
			</div>
		</Card>

		{#if booking}
			<Card title="Save booking">
				<p class="text-xs text-slate-500">These are the final agreed amounts we'll pay/charge. Mark each service booked as you arrange it — the itinerary and invoice update automatically. Saving records the booking.</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<Button size="sm" onclick={() => save(false)} disabled={saving}><Save class="h-4 w-4" /> Save booking</Button>
					<Button variant="secondary" size="sm" href="/queries/{queryId}/invoice"><Copy class="h-4 w-4" /> Invoice</Button>
				</div>
			</Card>
		{:else}
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
					<Button size="sm" onclick={() => save(false)} disabled={saving}><Save class="h-4 w-4" /> Save</Button>
					<Button variant="secondary" size="sm" onclick={() => save(true)} disabled={saving}><Plus class="h-4 w-4" /> Save & add another</Button>
				</div>
			</Card>
		{/if}
	</div>
</div>

{#if mode !== 'booking'}
	<div class="mt-8">
		<QuotationList {queryId} />
	</div>
{/if}
