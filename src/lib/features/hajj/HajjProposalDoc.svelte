<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import { ArrowLeft, Check, Copy, MessageCircle, Printer } from 'lucide-svelte';
	import { Button } from '$ui';
	import { formatAmount } from '$lib/money';
	import { waLink } from '$lib/whatsapp';
	import { usePassengers } from '$features/passengers/queries';
	import { fullName } from '$features/passengers/types';
	import { useQueryDetail } from '$features/queries/queries';
	import { useOrgSettings } from '$features/settings/queries';
	import { listPackageDays } from './api';
	import {
		AZIZIYA_NOTE,
		PRICE_NOTE,
		REQUIRED_DOCUMENTS,
		SEASON_LABEL,
		TERMS,
		exclusions,
		inclusionsFor
	} from './content';
	import {
		buildProposal,
		serviceNames,
		travellerTotals,
		hotelsLine,
		instalments,
		minaCategory,
		proposalOptionsWhatsApp,
		roomLabel
	} from './proposal';
	import {
		useHajjAddons,
		useHajjCatalogues,
		useHajjPackages,
		useHajjProposals,
		useHajjQuote,
		useHajjTravellers
	} from './queries';
	import { isLive, optionTitle, snapshotToTravellers } from './snapshot';
	import type { HajjCurrency, HajjDay, HajjTraveller } from './types';
	import { DEFAULT_HAJJ_ROE } from './types';

	// Client-facing Hajj proposal: print / save as PDF, or copy as WhatsApp text.
	// Selling prices only — never cost, margin or commission — and under our own
	// brand (no vendor name, no photos).
	let { queryId }: { queryId: string } = $props();

	const query = untrack(() => useQueryDetail(queryId));
	const quote = untrack(() => useHajjQuote(queryId));
	const travellers = untrack(() => useHajjTravellers(queryId));
	const catalogues = untrack(() => useHajjCatalogues());
	const packages = untrack(() => useHajjPackages());
	const addons = untrack(() => useHajjAddons());
	const passengers = untrack(() => usePassengers());
	const proposals = untrack(() => useHajjProposals(queryId));
	const settings = untrack(() => useOrgSettings());

	const org = $derived($settings.data ?? null);

	// Read every store unconditionally so each stays subscribed (see HajjBuilder).
	const ready = $derived.by(() => {
		const loaded = [
			$query.data,
			$quote.data,
			$travellers.data,
			$catalogues.data,
			$packages.data,
			$addons.data
		];
		return loaded.every((d) => d !== undefined && d !== null);
	});
	const loadError = $derived(
		$query.error ?? $quote.error ?? $travellers.error ?? $catalogues.error ?? $packages.error ?? $addons.error
	);

	const list = $derived($travellers.data ?? []);

	// Saved options (if any). A query with none falls back to the live working copy.
	// A failed load (migration not applied) just means "no saved options".
	const saved = $derived($proposals.data ?? []);
	const settled = $derived(!$proposals.isLoading);
	const liveSaved = $derived(saved.filter(isLive));
	const urlIds = $derived(
		($page.url.searchParams.get('o') ?? '').split(',').filter((x) => x.length > 0)
	);
	// Which saved options appear in the document. null = the default (the URL's
	// choice, else every live option); the chips below override it.
	let picked = $state<string[] | null>(null);
	const chosenIds = $derived(
		picked ??
			(urlIds.length > 0
				? urlIds.filter((id) => saved.some((p) => p.id === id))
				: liveSaved.map((p) => p.id))
	);
	const chosen = $derived(
		saved.filter((p) => chosenIds.includes(p.id)).sort((x, y) => x.version - y.version)
	);
	function toggle(id: string) {
		const cur = new Set(chosenIds);
		if (cur.has(id)) cur.delete(id);
		else cur.add(id);
		picked = [...cur];
	}

	const personName = $derived(
		new Map(($passengers.data ?? []).map((p) => [p.id, fullName(p)]))
	);
	const namesOf = (ts: HajjTraveller[]) =>
		Object.fromEntries(ts.map((t) => [t.id, personName.get(t.passenger_id) ?? 'Traveller']));

	// What each option prices: a saved snapshot, or the live working copy.
	interface Source {
		key: string;
		title: string | null;
		roe: number;
		travellers: HajjTraveller[];
	}
	const sources = $derived<Source[]>(
		chosen.length > 0
			? chosen.map((p) => ({
					key: p.id,
					title: optionTitle(p),
					roe: Number(p.snapshot.roe),
					travellers: snapshotToTravellers(p.snapshot, queryId)
				}))
			: saved.length === 0
				? [
						{
							key: 'live',
							title: null,
							roe: Number($quote.data?.roe ?? DEFAULT_HAJJ_ROE),
							travellers: list
						}
					]
				: []
	);

	// Itinerary rows for each distinct package across the options (fetched as needed).
	let days = $state<Record<string, HajjDay[]>>({});
	$effect(() => {
		const have = untrack(() => days);
		const ids = new Set(sources.flatMap((src) => src.travellers.map((t) => t.package_id)));
		for (const id of ids)
			if (!(id in have))
				listPackageDays(id)
					.then((rows) => (days = { ...days, [id]: rows }))
					.catch(() => (days = { ...days, [id]: [] }));
	});

	const options = $derived(
		ready && settled && $query.data
			? sources.map((src) => ({
					key: src.key,
					title: src.title,
					proposal: buildProposal({
						roe: src.roe,
						travellers: src.travellers,
						packages: $packages.data ?? [],
						addons: $addons.data ?? [],
						catalogues: $catalogues.data ?? [],
						query: $query.data!,
						names: namesOf(src.travellers),
						days
					})
				}))
			: []
	);
	const head = $derived(options[0]?.proposal ?? null);
	const multi = $derived(options.length > 1);

	// --- Print-time choices ----------------------------------------------------
	let showItinerary = $state(true);
	let showTerms = $state(true);
	// Off by default: the client sees one amount per person with the services named,
	// not what each part costs. Tick it to print every line's price.
	let showBreakup = $state(false);
	const inSevenDays = () => {
		const d = new Date();
		d.setDate(d.getDate() + 7);
		return d.toISOString().slice(0, 10);
	};
	let validUntil = $state(inSevenDays());
	let validSeeded = false;
	$effect(() => {
		const v = chosen[0]?.valid_until;
		if (v && !validSeeded) {
			validSeeded = true;
			validUntil = v;
		}
	});

	const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
	const fmtDate = (iso: string) =>
		new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		});
	const dayDate = (d: HajjDay) =>
		new Date(`${d.date_ad}T00:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		}) + (d.date_ad_end ? `–${new Date(`${d.date_ad_end}T00:00:00Z`).getUTCDate()}` : '');
	const stars = (n: number | null) => (n ? '★'.repeat(Math.floor(n)) + (n % 1 ? '+' : '') : '');

	const money = (n: number, cur: HajjCurrency | 'PKR') => formatAmount(n, cur);

	const allGroups = $derived(options.flatMap((o) => o.proposal.groups));
	const aziziyaOnly = $derived(allGroups.some((g) => g.pkg.has_aziziya));
	const nonAziziya = $derived(allGroups.some((g) => !g.pkg.has_aziziya));
	const notIncluded = $derived(
		options.length > 0
			? exclusions({
					ticketQuoted: options.every((o) => o.proposal.ticketQuoted),
					qurbaniQuoted: options.every((o) => o.proposal.qurbaniQuoted)
				})
			: []
	);

	// --- WhatsApp ----------------------------------------------------------------
	const waText = $derived(
		options.length > 0
			? proposalOptionsWhatsApp(
					options.map((o, i) => ({ title: o.title ?? `Option ${i + 1}`, proposal: o.proposal })),
					{
						validUntil: validUntil ? fmtDate(validUntil) : null,
						brand: org?.company_name ?? 'Billoo Travel',
						breakup: showBreakup
					}
				)
			: ''
	);
	let copied = $state(false);
	async function copyText() {
		try {
			await navigator.clipboard.writeText(waText);
			copied = true;
			setTimeout(() => (copied = false), 2500);
		} catch {
			/* clipboard blocked — the text is still on screen to select */
		}
	}
	function sendWhatsApp() {
		const url = waLink($query.data?.client_phone ?? '', waText);
		if (url) window.open(url, '_blank');
	}
</script>

<div class="no-print mb-4 space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<a
			href="/queries/{queryId}"
			class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
		>
			<ArrowLeft class="h-4 w-4" /> Back to query
		</a>
		<div class="flex flex-wrap gap-2">
			<Button variant="secondary" onclick={copyText} disabled={!head}>
				{#if copied}<Check class="h-4 w-4" /> Copied{:else}<Copy class="h-4 w-4" /> Copy WhatsApp text{/if}
			</Button>
			<Button variant="secondary" onclick={sendWhatsApp} disabled={!head}>
				<MessageCircle class="h-4 w-4" /> Send on WhatsApp
			</Button>
			<Button onclick={() => window.print()} disabled={!head}>
				<Printer class="h-4 w-4" /> Print / Save PDF
			</Button>
		</div>
	</div>
	{#if saved.length > 0}
		<div class="flex flex-wrap items-center gap-2 text-sm text-slate-600" data-testid="hajj-option-picker">
			<span class="text-xs font-medium uppercase tracking-wide text-slate-400">Options in this proposal</span>
			{#each [...saved].reverse().filter((p) => isLive(p) || chosenIds.includes(p.id)) as p (p.id)}
				<label
					class="flex items-center gap-1.5 rounded-full border px-3 py-1 {chosenIds.includes(p.id)
						? 'border-brand-500 bg-brand-50 text-brand-700'
						: 'border-slate-300'}"
				>
					<input
						type="checkbox"
						checked={chosenIds.includes(p.id)}
						onchange={() => toggle(p.id)}
						class="rounded border-slate-300"
					/>
					v{p.version} · {optionTitle(p)}
				</label>
			{/each}
		</div>
	{/if}
	<div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
		<label class="flex items-center gap-1.5">
			<input type="checkbox" bind:checked={showItinerary} class="rounded border-slate-300" /> Day-by-day itinerary
		</label>
		<label class="flex items-center gap-1.5">
			<input type="checkbox" bind:checked={showBreakup} class="rounded border-slate-300" data-testid="hajj-breakup" /> Price breakup
		</label>
		<label class="flex items-center gap-1.5">
			<input type="checkbox" bind:checked={showTerms} class="rounded border-slate-300" /> Terms &amp; conditions
		</label>
		<label class="flex items-center gap-1.5">
			Valid until
			<input
				type="date"
				bind:value={validUntil}
				class="rounded-lg border border-slate-300 px-2 py-1 text-sm"
			/>
		</label>
	</div>
</div>

{#if loadError}
	<p class="text-red-600">Failed to load: {loadError.message}</p>
{:else if !ready}
	<p class="text-slate-400">Loading…</p>
{:else if $query.data && $query.data.package_type !== 'Hajj'}
	<p class="text-slate-500">This query isn’t a Hajj package — use its regular proposal.</p>
{:else if saved.length > 0 && chosen.length === 0}
	<p class="text-slate-500">Choose at least one saved option above to build the proposal.</p>
{:else if !head || options.every((o) => o.proposal.groups.length === 0)}
	<p class="text-slate-500">Add at least one traveller in the Hajj builder to prepare a proposal.</p>
{:else}
	<div
		class="print-card print-doc print-flush mx-auto max-w-3xl bg-white p-8 text-slate-800 shadow-sm print:shadow-none"
		data-testid="hajj-proposal"
	>
		<!-- Letterhead -->
		<div class="doc-section mb-4 flex items-center justify-between gap-4 border-b-2 border-brand-600 pb-4">
			{#if org?.logo_url}
				<img
					src={org.logo_url}
					alt={org.company_name}
					style="height: {org.logo_height}px"
					class="max-h-56 w-auto max-w-[60%] object-contain"
				/>
			{:else}
				<div>
					<div class="text-2xl font-extrabold tracking-tight text-brand-700">{org?.company_name ?? 'Billoo Travels'}</div>
					{#if org?.tagline}<div class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{org.tagline}</div>{/if}
				</div>
			{/if}
			{#if org?.kaaba_url}
				<img src={org.kaaba_url} alt="Hajj emblem" style="height: {org.kaaba_height}px" class="max-h-56 w-auto max-w-[55%] object-contain" />
			{:else}
				<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" class="h-14 w-14 text-emerald-700" aria-hidden="true">
					<rect x="16" y="20" width="28" height="34" rx="1" />
					<path d="M16 20 L24 14 L52 14 L44 20 Z" />
					<path d="M44 20 L52 14 L52 48 L44 54 Z" />
					<path d="M16 29 L44 29 M44 29 L52 23" />
					<path d="M28 54 L28 41 Q32 38 36 41 L36 54" />
				</svg>
			{/if}
		</div>

		<!-- Title -->
		<div class="doc-section mb-5 text-center">
			<div class="text-xs font-semibold uppercase tracking-[0.25em] text-brand-700">{SEASON_LABEL}</div>
			<div class="mt-1 text-2xl font-bold text-slate-800">Hajj Package Proposal</div>
			<div class="mt-2 text-sm font-semibold uppercase text-slate-700">{head.clientName}</div>
			<div class="text-xs text-slate-500">
				{head.travellerCount} traveller{head.travellerCount === 1 ? '' : 's'}
				<span class="ml-2 font-mono text-slate-400">Ref {head.reference}</span>
			</div>
			{#if multi}
				<div class="mt-1 text-xs font-medium text-slate-600">{options.length} options to choose from</div>
			{/if}
			<div class="mt-0.5 text-xs text-slate-400">
				Prepared {today}{validUntil ? ` · Valid until ${fmtDate(validUntil)}` : ''}
			</div>
		</div>

		<!-- One block per saved option (one when there is a single proposal) -->
		{#each options as opt, oi (opt.key)}
			{@const proposal = opt.proposal}
			{@const plan = instalments(proposal.totals)}
			{#if multi}
				<div class="doc-section mb-3 mt-2 rounded bg-slate-800 px-3 py-1.5 text-sm font-bold text-white">
					Option {oi + 1} — {opt.title}
				</div>
			{/if}
		{#each proposal.groups as g, gi (g.key)}
			<section class="doc-section mb-5 overflow-hidden rounded border border-slate-200">
				<div class="flex flex-wrap items-baseline justify-between gap-2 bg-brand-600 px-3 py-2 text-white">
					<div class="text-sm font-bold">
						{proposal.groups.length > 1 ? `Package ${gi + 1} — ` : ''}{g.pkg.title}
					</div>
					<div class="text-xs">{g.pkg.duration_label ?? ''} · {g.span}</div>
				</div>

				<div class="grid gap-x-6 gap-y-2 px-3 py-3 text-xs sm:grid-cols-2">
					<div class="sm:col-span-2">
						<div class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Hotels</div>
						<ul class="mt-0.5 space-y-0.5">
							{#each g.stays as s, i (i)}
								<li>
									<span class="font-medium text-slate-800">{s.city}:</span>
									{s.name}
									{#if s.stars}<span class="text-amber-500">{stars(s.stars)}</span>{/if}
									<span class="text-slate-400">· {s.nights} night{s.nights === 1 ? '' : 's'}</span>
								</li>
							{:else}
								<li class="text-slate-400">{hotelsLine(g) || 'As per itinerary'}</li>
							{/each}
						</ul>
					</div>
					<div>
						<div class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Room</div>
						<div class="mt-0.5">{roomLabel(g.room)} · Hotel option {g.option}</div>
					</div>
					<div>
						<div class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mina camp</div>
						<div class="mt-0.5">{minaCategory(g.catalogue) ?? 'Mina camp'}, Zone 1 near Jamarat</div>
					</div>
					{#if g.pkg.has_aziziya}
						<div class="sm:col-span-2 text-slate-500">
							Includes Aziziya accommodation. {AZIZIYA_NOTE}
						</div>
					{/if}
					{#if g.pkg.notes}
						<div class="sm:col-span-2 text-slate-500">{g.pkg.notes}</div>
					{/if}
				</div>

				<!-- Charges: selling prices only -->
				<table class="w-full border-t border-slate-200 text-xs">
					<thead class="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-400">
						<tr>
							<th class="px-3 py-1.5 font-medium">Traveller</th>
							<th class="px-3 py-1.5 font-medium">Description</th>
							<th class="px-3 py-1.5 text-right font-medium">Amount</th>
						</tr>
					</thead>
					<tbody>
						{#each g.travellers as t (t.id)}
							{#if showBreakup}
								{#each t.lines as l, li (li)}
									<tr class="{li === 0 ? 'border-t border-slate-200' : ''}">
										<td class="px-3 py-1 align-top font-medium text-slate-800">{li === 0 ? t.name : ''}</td>
										<td class="px-3 py-1 text-slate-600">
											{l.kind === 'package' ? 'Hajj package (per person)' : l.label}
										</td>
										<td class="px-3 py-1 text-right tabular-nums">{money(l.amount, l.currency)}</td>
									</tr>
								{/each}
								{#if t.lines.length > 1}
									{#each Object.entries(t.totals) as [cur, amt] (cur)}
										<tr>
											<td></td>
											<td class="px-3 py-1 text-right text-[10px] font-semibold uppercase text-slate-400">Subtotal ({cur})</td>
											<td class="px-3 py-1 text-right font-semibold tabular-nums">{money(amt, cur as HajjCurrency)}</td>
										</tr>
									{/each}
								{/if}
							{:else}
								{@const names = serviceNames(t)}
								<tr class="border-t border-slate-200">
									<td class="px-3 py-1.5 align-top font-medium text-slate-800">{t.name}</td>
									<td class="px-3 py-1.5 text-slate-600">
										Hajj package (per person)
										{#if names.length}
											<div class="mt-0.5 text-[11px] text-slate-500">Includes: {names.join(', ')}</div>
										{/if}
									</td>
									<td class="px-3 py-1.5 text-right align-top font-semibold tabular-nums">
										{#each travellerTotals(t) as a (a.currency)}
											<div>{money(a.amount, a.currency)}</div>
										{/each}
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>

				{#if showItinerary && g.days.length}
					<div class="border-t border-slate-200 px-3 py-2">
						<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Itinerary</div>
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
										<td class="py-0.5 pr-2 whitespace-nowrap">
											{dayDate(d)}{#if d.hijri_label}<span class="text-slate-400"> · {d.hijri_label}</span>{/if}
										</td>
										<td class="py-0.5 pr-2">{d.city_label}</td>
										<td class="py-0.5">{hotel}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{/each}

		<!-- Summary of charges -->
		<section class="doc-section mb-5 rounded border-2 border-brand-600 p-3">
			<div class="mb-2 text-xs font-bold uppercase tracking-wide text-brand-700">Summary of charges</div>
			<dl class="space-y-1 text-sm tabular-nums">
				{#if showBreakup && proposal.totals.sar !== null}
					<div class="flex justify-between">
						<dt class="text-slate-600">Package charges {money(proposal.totals.sar, 'SAR')} × {proposal.totals.roe}</dt>
						<dd>{money(proposal.totals.sar * proposal.totals.roe, 'PKR')}</dd>
					</div>
				{/if}
				{#if showBreakup && proposal.totals.ticketPkr > 0}
					<div class="flex justify-between">
						<dt class="text-slate-600">Air tickets</dt>
						<dd>{money(proposal.totals.ticketPkr, 'PKR')}</dd>
					</div>
				{/if}
				{#if showBreakup && proposal.totals.otherPkr > 0}
					<div class="flex justify-between">
						<dt class="text-slate-600">Other services</dt>
						<dd>{money(proposal.totals.otherPkr, 'PKR')}</dd>
					</div>
				{/if}
				{#if proposal.totals.pkr !== null}
					<div class="flex justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
						<dt>Total payable in PKR</dt>
						<dd>{money(proposal.totals.pkr, 'PKR')}</dd>
					</div>
				{/if}
				{#if !showBreakup && proposal.totals.sar !== null}
					<div class="text-[11px] text-slate-400">SAR amounts converted to PKR at {proposal.totals.roe}.</div>
				{/if}
				{#if proposal.totals.usd !== null}
					<div class="flex justify-between {proposal.totals.pkr !== null ? 'pt-1' : 'border-t border-slate-200 pt-1'} text-base font-bold text-slate-900">
						<dt>Total payable in USD{proposal.totals.pkr !== null ? ' (separate)' : ''}</dt>
						<dd>{money(proposal.totals.usd, 'USD')}</dd>
					</div>
				{/if}
			</dl>

			<div class="mt-3 border-t border-slate-200 pt-2">
				<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Payment plan</div>
				<ul class="space-y-0.5 text-xs">
					{#each plan as i (i.label)}
						<li class="flex flex-wrap justify-between gap-2">
							<span class="text-slate-600">{i.percent}% — {i.label}</span>
							<span class="tabular-nums font-medium">
								{i.amounts.map((a) => money(a.amount, a.currency)).join(' + ')}
							</span>
						</li>
					{/each}
				</ul>
			</div>
			<p class="mt-2 text-[10px] text-slate-400">{PRICE_NOTE}</p>
		</section>
		{/each}

		<!-- What's included -->
		<section class="doc-section mb-5">
			<div class="mb-1 text-xs font-bold uppercase tracking-wide text-brand-700">Included in your package</div>
			{#if nonAziziya}
				{#if aziziyaOnly}<div class="mt-1 text-[11px] font-semibold text-slate-600">Hotel packages</div>{/if}
				<ul class="grid gap-x-6 text-xs sm:grid-cols-2">
					{#each inclusionsFor({ has_aziziya: false }) as line (line)}
						<li class="flex gap-1.5 py-0.5"><Check class="mt-0.5 h-3 w-3 shrink-0 text-green-600" /> {line}</li>
					{/each}
				</ul>
			{/if}
			{#if aziziyaOnly}
				{#if nonAziziya}<div class="mt-2 text-[11px] font-semibold text-slate-600">Aziziya packages</div>{/if}
				<ul class="grid gap-x-6 text-xs sm:grid-cols-2">
					{#each inclusionsFor({ has_aziziya: true }) as line (line)}
						<li class="flex gap-1.5 py-0.5"><Check class="mt-0.5 h-3 w-3 shrink-0 text-green-600" /> {line}</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="doc-section mb-5">
			<div class="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Not included</div>
			<ul class="text-xs text-slate-600">
				{#each notIncluded as line (line)}
					<li class="py-0.5">— {line}</li>
				{/each}
			</ul>
		</section>

		<section class="doc-section mb-5">
			<div class="mb-1 text-xs font-bold uppercase tracking-wide text-brand-700">Documents required</div>
			<ol class="list-inside list-decimal text-xs text-slate-700">
				{#each REQUIRED_DOCUMENTS as line (line)}
					<li class="py-0.5">{line}</li>
				{/each}
			</ol>
		</section>

		{#if showTerms}
			<section class="mb-5">
				<div class="mb-1 text-xs font-bold uppercase tracking-wide text-brand-700">Terms &amp; conditions</div>
				<ol class="list-inside list-decimal space-y-0.5 text-[10px] leading-tight text-slate-600">
					{#each TERMS as line (line)}
						<li>{line}</li>
					{/each}
				</ol>
			</section>
		{/if}

		<!-- Acceptance + contact: kept together so the footer never sits alone on a page -->
		<section class="doc-section mt-6">
			<div class="grid grid-cols-2 gap-10 text-xs text-slate-500">
				<div class="border-t border-slate-400 pt-1">Client signature &amp; date</div>
				<div class="border-t border-slate-400 pt-1">For {org?.company_name ?? 'Billoo Travels'}</div>
			</div>
			<footer class="mt-5 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
				{[org?.company_name, org?.address, org?.phone, org?.email, org?.website].filter(Boolean).join(' · ')}
			</footer>
		</section>
	</div>

	<!-- The WhatsApp version, so it can be read and edited before sending -->
	<div class="no-print mx-auto mt-6 max-w-3xl">
		<h3 class="mb-1 text-sm font-semibold text-slate-700">WhatsApp version</h3>
		<pre class="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs whitespace-pre-wrap text-slate-700" data-testid="hajj-whatsapp">{waText}</pre>
	</div>
{/if}
