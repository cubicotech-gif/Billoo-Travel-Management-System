<script lang="ts">
	import { ArrowLeft, Check, Printer } from 'lucide-svelte';
	import { Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import { AZIZIYA_NOTE, SEASON_LABEL, TRAVEL_NOTES, inclusionsFor } from './content';
	import type { HajjDocContext } from './doc-context';
	import { invoiceModel } from './documents';
	import HajjDocLoader from './HajjDocLoader.svelte';
	import HajjLetterhead from './HajjLetterhead.svelte';
	import { minaCategory, roomLabel } from './proposal';
	import type { HajjDay } from './types';

	// The client's booking confirmation ('voucher') and travel schedule
	// ('itinerary') for a Hajj booking. The itinerary carries no prices; the
	// voucher can print the total. Under our own brand — no vendor name.
	let { queryId, kind }: { queryId: string; kind: 'voucher' | 'itinerary' } = $props();

	const isVoucher = $derived(kind === 'voucher');
	let showCharges = $state(true);
	let showSchedule = $state(false); // voucher: day-by-day is optional (the itinerary always has it)

	const stars = (n: number | null) => (n ? '★'.repeat(Math.floor(n)) + (n % 1 ? '+' : '') : '');
	const dayDate = (d: HajjDay) =>
		new Date(`${d.date_ad}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) +
		(d.date_ad_end ? `–${new Date(`${d.date_ad_end}T00:00:00Z`).getUTCDate()}` : '');
	const total = (c: HajjDocContext) =>
		invoiceModel(c.proposal, { roe: c.roe, usdRate: c.usdRate, discountPkr: c.discountPkr, payments: c.payments });
	const extras = (g: HajjDocContext['proposal']['groups'][number]) =>
		g.travellers
			.map((t) => ({ id: t.id, name: t.name, lines: t.lines.filter((l) => l.kind !== 'package').map((l) => l.label) }))
			.filter((t) => t.lines.length > 0);
</script>

<div class="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
	<a href="/queries/{queryId}" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
		<ArrowLeft class="h-4 w-4" /> Back to query
	</a>
	<div class="flex flex-wrap items-center gap-3">
		{#if isVoucher}
			<label class="flex items-center gap-1.5 text-sm text-slate-600">
				<input type="checkbox" bind:checked={showSchedule} class="rounded border-slate-300" /> Day-by-day itinerary
			</label>
			<label class="flex items-center gap-1.5 text-sm text-slate-600">
				<input type="checkbox" bind:checked={showCharges} class="rounded border-slate-300" /> Show total payable
			</label>
		{/if}
		<Button onclick={() => window.print()}><Printer class="h-4 w-4" /> Print / Save PDF</Button>
	</div>
</div>

<HajjDocLoader {queryId}>
	{#snippet children(c)}
		{@const t = total(c)}
		<div class="print-card print-doc print-flush mx-auto max-w-3xl bg-white p-8 text-slate-800 shadow-sm print:shadow-none" data-testid="hajj-{kind}">
			<HajjLetterhead org={c.org} />

			<div class="doc-section mb-5 text-center">
				<div class="text-xs font-semibold uppercase tracking-[0.25em] text-brand-700">{SEASON_LABEL}</div>
				<div class="mt-1 text-sm font-semibold italic text-brand-700">
					{isVoucher ? 'We are pleased to confirm your Hajj booking' : 'Your Hajj Itinerary'}
				</div>
				<div class="mt-1 text-base font-bold uppercase text-slate-800">{c.query.client_name}</div>
				<div class="text-xs text-slate-500">
					{c.proposal.travellerCount} pilgrim{c.proposal.travellerCount === 1 ? '' : 's'}
					<span class="ml-2 font-mono text-slate-400">Ref {c.proposal.reference}</span>
				</div>
			</div>

			<!-- Pilgrims -->
			<div class="doc-section mb-4 overflow-hidden rounded border border-slate-200">
				<div class="bg-brand-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Pilgrims</div>
				<div class="grid grid-cols-2 gap-x-6 gap-y-1 px-3 py-2 text-xs">
					{#each c.pilgrims as p, i (p.id)}
						<div class="flex items-baseline gap-1.5 border-b border-slate-50 py-0.5">
							<span class="w-5 shrink-0 text-right font-mono text-slate-400">{i + 1}.</span>
							<span class="font-medium text-slate-700">{p.name}</span>
							{#if p.passport}<span class="ml-auto font-mono text-[10px] text-slate-400">{p.passport}</span>{/if}
						</div>
					{/each}
				</div>
			</div>

			{#each c.proposal.groups as g, gi (g.key)}
				<div class="doc-section mb-4 overflow-hidden rounded border border-slate-200">
					<div class="flex flex-wrap items-baseline justify-between gap-2 bg-brand-600 px-3 py-1.5 text-white">
						<div class="text-xs font-bold uppercase tracking-wide">
							{c.proposal.groups.length > 1 ? `Package ${gi + 1} — ` : ''}{g.pkg.title}
						</div>
						<div class="text-[11px]">{g.pkg.duration_label ?? ''} · {g.span}</div>
					</div>
					<div class="px-3 py-2 text-xs text-slate-600">
						{roomLabel(g.room)} · Hotel option {g.option} · {minaCategory(g.catalogue) ?? 'Mina camp'}, Zone 1 near Jamarat
						{#if g.pkg.has_aziziya}<div class="mt-0.5 text-slate-500">Includes Aziziya accommodation. {AZIZIYA_NOTE}</div>{/if}
						<div class="mt-0.5 text-slate-500">
							Pilgrims: {g.travellers.map((x) => x.name).join(', ')}
						</div>
					</div>

					<table class="w-full border-t border-slate-100 text-xs">
						<thead class="bg-slate-50 text-left uppercase tracking-wide text-slate-400">
							<tr>
								<th class="px-3 py-1.5 font-semibold">City</th>
								<th class="px-3 py-1.5 font-semibold">Hotel</th>
								<th class="px-3 py-1.5 text-center font-semibold">Nights</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each g.stays as s, i (i)}
								<tr>
									<td class="px-3 py-1.5 font-medium text-slate-700">{s.city}</td>
									<td class="px-3 py-1.5 text-slate-700">
										{s.name}{#if s.stars}<span class="ml-1 text-amber-500">{stars(s.stars)}</span>{/if}
									</td>
									<td class="px-3 py-1.5 text-center text-slate-700">{s.nights}</td>
								</tr>
							{/each}
							<tr>
								<td class="px-3 py-1.5 font-medium text-slate-700">Mina · Arafat · Muzdalifah</td>
								<td class="px-3 py-1.5 text-slate-700">{minaCategory(g.catalogue) ?? 'Mina camp'} (8–12 Zil Hajj)</td>
								<td class="px-3 py-1.5 text-center text-slate-700">—</td>
							</tr>
						</tbody>
					</table>

					{#if (!isVoucher || showSchedule) && g.days.length}
						<div class="border-t border-slate-100 px-3 py-2">
							<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Day by day</div>
							<table class="w-full text-[11px]">
								<thead class="text-left text-slate-400">
									<tr>
										<th class="py-0.5 pr-2 font-medium">Day</th>
										<th class="py-0.5 pr-2 font-medium">Date</th>
										<th class="py-0.5 pr-2 font-medium">City</th>
										<th class="py-0.5 font-medium">Accommodation</th>
									</tr>
								</thead>
								<tbody>
									{#each g.days as d (d.id)}
										{@const hotel = g.option === 'B' ? (d.hotel_b ?? d.hotel_a) : d.hotel_a}
										<tr class="border-t border-slate-100 {d.kind === 'stay' ? '' : 'text-slate-500'}">
											<td class="py-0.5 pr-2 tabular-nums">{d.day_no}</td>
											<td class="py-0.5 pr-2 whitespace-nowrap">{dayDate(d)}{#if d.hijri_label}<span class="text-slate-400"> · {d.hijri_label}</span>{/if}</td>
											<td class="py-0.5 pr-2">{d.city_label}</td>
											<td class="py-0.5">{hotel}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}

					{#if extras(g).length}
						<div class="border-t border-slate-100 px-3 py-2 text-xs">
							<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Additional services</div>
							{#each extras(g) as e (e.id)}
								<div class="py-0.5 text-slate-700"><span class="font-medium">{e.name}:</span> {e.lines.join(' · ')}</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}

			{#if isVoucher}
				<div class="doc-section mb-4">
					<div class="mb-1 text-xs font-bold uppercase tracking-wide text-brand-700">Included in your package</div>
					{#if c.proposal.groups.some((g) => !g.pkg.has_aziziya)}
						<ul class="grid gap-x-6 text-[11px] sm:grid-cols-2">
							{#each inclusionsFor({ has_aziziya: false }) as line (line)}
								<li class="flex gap-1.5 py-0.5"><Check class="mt-0.5 h-3 w-3 shrink-0 text-green-600" /> {line}</li>
							{/each}
						</ul>
					{/if}
					{#if c.proposal.groups.some((g) => g.pkg.has_aziziya)}
						<ul class="grid gap-x-6 text-[11px] sm:grid-cols-2">
							{#each inclusionsFor({ has_aziziya: true }) as line (line)}
								<li class="flex gap-1.5 py-0.5"><Check class="mt-0.5 h-3 w-3 shrink-0 text-green-600" /> {line}</li>
							{/each}
						</ul>
					{/if}
				</div>

				{#if showCharges}
					<div class="doc-section mb-4 overflow-hidden rounded border border-slate-200">
						<div class="bg-slate-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">Total payable</div>
						<div class="space-y-1 bg-slate-50 px-3 py-2 text-sm tabular-nums">
							<div class="flex justify-between font-bold text-slate-800">
								<span>Total (PKR)</span><span>{formatAmount(t.payablePkr, 'PKR')}</span>
							</div>
							{#if t.usdOutstanding !== null}
								<div class="flex justify-between font-bold text-slate-800">
									<span>Plus, payable in USD</span><span>{formatAmount(t.usdOutstanding, 'USD')}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{/if}

			<!-- Notes, thanks and contact stay together so the footer never sits alone on a page -->
			<div class="doc-section">
			<div class="mb-3 rounded border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
				<div class="mb-1 font-bold uppercase text-slate-700">Important notes</div>
				<ul class="list-inside list-disc space-y-0.5">
					{#each TRAVEL_NOTES as n (n)}<li>{n}</li>{/each}
				</ul>
			</div>

			<div class="text-center text-xs font-semibold text-slate-600">Thank you for choosing {c.org?.company_name ?? 'Billoo Travels'}</div>
			<div class="mt-4 border-t border-slate-200 pt-3 text-center text-[10px] leading-relaxed text-slate-500">
				{#if c.org?.address}<div class="font-semibold text-slate-600">{c.org.address}</div>{/if}
				<div>{[c.org?.email, c.org?.website, c.org?.phone].filter(Boolean).join(' · ')}</div>
			</div>
			</div>
		</div>
	{/snippet}
</HajjDocLoader>
