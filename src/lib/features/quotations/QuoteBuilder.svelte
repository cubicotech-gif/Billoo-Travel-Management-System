<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Copy, Check, Save } from 'lucide-svelte';
	import { Button, Card, Input, Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { useQueryDetail } from '$features/queries/queries';
	import { useRates, useLatestRoe } from '$features/rates/queries';
	import { latestRates } from '$features/rates/types';
	import type { RateCard } from '$features/rates/types';
	import { calculateQuotation, roomsFor, totalPersons, type QuotationInput } from './calculator';
	import { renderWhatsApp } from './whatsapp';
	import { useCreateQuotation } from './queries';

	let { queryId }: { queryId: string } = $props();

	const queryDetail = untrack(() => useQueryDetail(queryId));
	const rates = useRates();
	const roe = useLatestRoe();
	const createQuotation = untrack(() => useCreateQuotation(queryId));

	// Rate option lists (latest per item), as {value,label} for the selects.
	const pool = $derived(latestRates($rates.data ?? []));
	const byId = $derived(new Map(pool.map((r) => [r.id, r])));

	function opts(type: RateCard['item_type'], city?: string) {
		const items = pool.filter((r) => r.item_type === type && (!city || r.city === city));
		return [{ value: '', label: '— none —' }, ...items.map((r) => ({ value: r.id, label: r.name }))];
	}

	let form = $state({
		roeValue: 0,
		adults: 1,
		children: 0,
		infants: 0,
		makkahId: '',
		makkahNights: 0,
		makkahRooms: 1,
		madinahId: '',
		madinahNights: 0,
		madinahRooms: 1,
		transferId: '',
		vehicles: 1,
		visaId: '',
		airlineId: '',
		childCost: 0,
		childSell: 0,
		infantCost: 0,
		infantSell: 0
	});

	// Seed from the query + latest ROE once they load.
	let seeded = $state(false);
	$effect(() => {
		if (seeded) return;
		const q = $queryDetail.data;
		const r = $roe.data;
		if (!q) return;
		form.adults = q.adults;
		form.children = q.children;
		form.infants = q.infants;
		form.makkahNights = q.nights_makkah ?? 0;
		form.madinahNights = q.nights_madinah ?? 0;
		if (r) form.roeValue = Number(r.sar_to_pkr);
		seeded = true;
	});

	const persons = $derived(totalPersons({ adults: form.adults, children: form.children, infants: form.infants }));

	function rate(id: string): RateCard | undefined {
		return byId.get(id);
	}

	// Suggested room counts from the selected hotel's occupancy.
	const makkahSuggest = $derived(rate(form.makkahId) ? roomsFor(persons, rate(form.makkahId)!.occupancy ?? 0) : 0);
	const madinahSuggest = $derived(rate(form.madinahId) ? roomsFor(persons, rate(form.madinahId)!.occupancy ?? 0) : 0);

	const input = $derived.by((): QuotationInput => {
		const hotels: QuotationInput['hotels'] = [];
		const mk = rate(form.makkahId);
		if (mk && form.makkahNights > 0) {
			hotels.push({ city: 'Makkah', name: mk.name, rateCardId: mk.id, costSar: Number(mk.cost_price), sellSar: Number(mk.selling_price), nights: form.makkahNights, rooms: form.makkahRooms });
		}
		const md = rate(form.madinahId);
		if (md && form.madinahNights > 0) {
			hotels.push({ city: 'Madinah', name: md.name, rateCardId: md.id, costSar: Number(md.cost_price), sellSar: Number(md.selling_price), nights: form.madinahNights, rooms: form.madinahRooms });
		}
		const tr = rate(form.transferId);
		const vi = rate(form.visaId);
		const air = rate(form.airlineId);
		return {
			roe: Number(form.roeValue),
			pax: { adults: form.adults, children: form.children, infants: form.infants },
			hotels,
			transfer: tr ? { name: tr.name, rateCardId: tr.id, costSar: Number(tr.cost_price), sellSar: Number(tr.selling_price), vehicles: form.vehicles } : null,
			visa: vi ? { name: vi.name, rateCardId: vi.id, costSar: Number(vi.cost_price), sellSar: Number(vi.selling_price) } : null,
			tickets: air
				? {
						airlineName: air.name,
						rateCardId: air.id,
						adultCost: Number(air.cost_price),
						adultSell: Number(air.selling_price),
						childCost: Number(form.childCost),
						childSell: Number(form.childSell),
						infantCost: Number(form.infantCost),
						infantSell: Number(form.infantSell)
					}
				: null
		};
	});

	const result = $derived(calculateQuotation(input));

	const whatsapp = $derived.by(() => {
		const q = $queryDetail.data;
		if (!q) return '';
		return renderWhatsApp(
			{
				packageType: q.package_type ?? 'Umrah',
				passengerName: q.client_name,
				pax: { adults: form.adults, children: form.children, infants: form.infants },
				nightsMakkah: form.makkahNights || null,
				nightsMadinah: form.madinahNights || null
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

	async function save() {
		if (form.roeValue <= 0) {
			alert('Set an exchange rate (ROE) first — see Daily Rates.');
			return;
		}
		await $createQuotation.mutateAsync({
			queryId,
			roe: Number(form.roeValue),
			pax: { adults: form.adults, children: form.children, infants: form.infants },
			result,
			whatsappText: whatsapp
		});
		goto(`/queries/${queryId}`);
	}
</script>

<a href="/queries/{queryId}" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
	<ArrowLeft class="h-4 w-4" /> Back to query
</a>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-slate-800">Build quotation</h1>
	<p class="text-sm text-slate-500">Prices pull from the latest Daily Rates. SAR converts to PKR via the ROE.</p>
</div>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
	<!-- Inputs -->
	<div class="space-y-4 lg:col-span-2">
		<Card title="Pax & ROE">
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Input label="ROE (1 SAR = PKR)" type="number" min="0" step="0.0001" bind:value={form.roeValue} />
				<Input label="Adults" type="number" min="0" bind:value={form.adults} />
				<Input label="Children" type="number" min="0" bind:value={form.children} />
				<Input label="Infants" type="number" min="0" bind:value={form.infants} />
			</div>
		</Card>

		<Card title="Hotels (SAR · per room/night)">
			<div class="space-y-4">
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Select label="Makkah hotel" bind:value={form.makkahId} options={opts('hotel', 'Makkah')} />
					<Input label="Nights" type="number" min="0" bind:value={form.makkahNights} />
					<Input label="Rooms" type="number" min="0" bind:value={form.makkahRooms} />
				</div>
				{#if makkahSuggest > 0}<p class="text-xs text-slate-400">Suggested {makkahSuggest} room(s) for {persons} pax.</p>{/if}
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Select label="Madinah hotel" bind:value={form.madinahId} options={opts('hotel', 'Madinah')} />
					<Input label="Nights" type="number" min="0" bind:value={form.madinahNights} />
					<Input label="Rooms" type="number" min="0" bind:value={form.madinahRooms} />
				</div>
				{#if madinahSuggest > 0}<p class="text-xs text-slate-400">Suggested {madinahSuggest} room(s) for {persons} pax.</p>{/if}
			</div>
		</Card>

		<Card title="Transfer & Visa (SAR)">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div class="grid grid-cols-2 gap-3">
					<Select label="Transfer" bind:value={form.transferId} options={opts('transfer')} />
					<Input label="Vehicles" type="number" min="0" bind:value={form.vehicles} />
				</div>
				<Select label="Visa (per person)" bind:value={form.visaId} options={opts('visa')} />
			</div>
		</Card>

		<Card title="Tickets (PKR)">
			<div class="space-y-3">
				<Select label="Airline (adult fare from rates)" bind:value={form.airlineId} options={opts('airline')} />
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<Input label="Child cost" type="number" min="0" bind:value={form.childCost} />
					<Input label="Child sell" type="number" min="0" bind:value={form.childSell} />
					<Input label="Infant cost" type="number" min="0" bind:value={form.infantCost} />
					<Input label="Infant sell" type="number" min="0" bind:value={form.infantSell} />
				</div>
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
				{#if result.lines.length === 0}
					<p class="text-slate-400">Pick items to price.</p>
				{/if}
			</div>
			<div class="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
				<div class="flex justify-between"><span class="text-slate-500">SAR subtotal</span><span>{formatAmount(result.sarSell, 'SAR')}</span></div>
				<div class="flex justify-between"><span class="text-slate-500">Tickets (PKR)</span><span>{formatAmount(result.ticketsSellPkr, 'PKR')}</span></div>
				<div class="flex justify-between font-semibold text-slate-800"><span>Total (PKR)</span><span>{formatAmount(result.totalSellPkr, 'PKR')}</span></div>
				<div class="flex justify-between text-green-600"><span>Profit</span><span>{formatAmount(result.profitPkr, 'PKR')}</span></div>
			</div>
		</Card>

		<Card title="WhatsApp message">
			<pre class="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{whatsapp}</pre>
			<div class="mt-3 flex gap-2">
				<Button variant="secondary" size="sm" onclick={copyWhatsapp}>
					{#if copied}<Check class="h-4 w-4" /> Copied{:else}<Copy class="h-4 w-4" /> Copy{/if}
				</Button>
				<Button size="sm" onclick={save} disabled={$createQuotation.isPending}>
					<Save class="h-4 w-4" /> {$createQuotation.isPending ? 'Saving…' : 'Save quotation'}
				</Button>
			</div>
		</Card>
	</div>
</div>
