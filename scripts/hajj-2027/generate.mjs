/*
 * Builds the Hajj 2027 seed from data.mjs:
 *   database/seeds/hajj-2027-catalogue.sql   (idempotent, never overwrites edits)
 *   docs/hajj-2027-price-check.md            (every price + itinerary, to check against the PDFs)
 *
 *   node scripts/hajj-2027/generate.mjs
 *
 * Validates as it goes (day counts, dates, option/price shape) and exits non-zero
 * on any inconsistency.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	CATALOGUES,
	SEASON,
	HOTELS,
	PACKAGES,
	ADDONS,
	MINA,
	ARAFAT,
	DEPARTURE,
	packageFlags
} from './data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const errors = [];
const fail = (msg) => errors.push(msg);

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined ? 'NULL' : String(v));
const pad = (x) => String(x).padStart(2, '0');
const iso = (day) => `2027-05-${pad(day)}`;

/** Hijri label for a May-2027 day: 7 May = 01 Zil Hajj; 4–6 May = 27–29 Zil Qad. */
function hijri(day) {
	return day >= 7 ? `${pad(day - 6)} Zil Hajj` : `${day + 23} Zil Qad`;
}

function dayDates(pkg, dayNo) {
	if (pkg.flex) {
		if (dayNo === 1) return { from: 10, to: 12, hijri: '4-6 Zil Hajj' };
		const d = 13 + (dayNo - 2);
		return { from: d, to: null, hijri: hijri(d) };
	}
	const d = pkg.start + dayNo - 1;
	return { from: d, to: null, hijri: hijri(d) };
}

function resolveRow(row, cat) {
	const [city, ka, kb] = row;
	const named = (k) => {
		if (k === 'MINA') return { name: MINA(cat.minaCategory), stars: null, kind: 'mina' };
		if (k === 'MINA_AZ')
			return {
				name: `${MINA(cat.minaCategory)} /Aziziya Accommodation - A CLASS`,
				stars: null,
				kind: 'mina'
			};
		if (k === 'ARAF') return { name: ARAFAT, stars: null, kind: 'arafat' };
		if (k === 'ARAF_AZ')
			return { name: `${ARAFAT} /Aziziya Accommodation - A CLASS`, stars: null, kind: 'arafat' };
		if (k === 'DEP') return { name: DEPARTURE, stars: null, kind: 'departure' };
		const h = HOTELS[k];
		if (!h) {
			fail(`unknown hotel key ${k}`);
			return { name: k, stars: null, kind: 'stay' };
		}
		return { name: h[0], stars: h[1], kind: 'stay' };
	};
	const a = named(ka);
	const b = kb ? named(kb) : null;
	return { city, a, b };
}

// ---------------------------------------------------------------- validate + build
const built = []; // per catalogue: { cat, packages: [...] }

for (const cat of CATALOGUES) {
	const packages = [];
	PACKAGES.forEach((pkg, idx) => {
		const flags = packageFlags(pkg.code);
		const rows = pkg.days(cat.currency);
		const prices = pkg[cat.currency.toLowerCase()];
		const hasB = Boolean(prices.B);

		const days = rows.map((row, i) => {
			const r = resolveRow(row, cat);
			const dt = dayDates(pkg, i + 1);
			if (!hasB && r.b) fail(`${pkg.code}: single-option package has a B hotel on day ${i + 1}`);
			if (
				hasB &&
				!r.b &&
				!['mina', 'arafat', 'departure'].includes(r.a.kind) &&
				r.a.name !== HOTELS.AZ[0]
			) {
				// Shared hotel in a two-option package is fine (B = NULL means "same as A"); nothing to check.
			}
			return { dayNo: i + 1, ...dt, ...r, kind: r.a.kind };
		});

		// Dates must run consecutively after day 1 (flex day 1 is a window, day 2 = 13 May).
		for (let i = 1; i < days.length; i++) {
			const prev = days[i - 1];
			const prevDay = prev.to ?? prev.from;
			if (i === 1 && pkg.flex) {
				if (days[i].from !== 13) fail(`${pkg.code}: flex day 2 should be 13 May`);
			} else if (days[i].from !== prevDay + 1)
				fail(`${pkg.code} ${cat.code}: day ${i + 1} date ${days[i].from} not after ${prevDay}`);
		}
		if (days.at(-1)?.kind !== 'departure') fail(`${pkg.code}: last day is not a departure`);

		// Price shape: every price a positive integer; at least one price per option.
		const options = [];
		for (const code of ['A', 'B']) {
			const opt = prices[code];
			if (!opt) continue;
			const [quad, triple, dbl] = opt;
			const rowsP = [];
			if (prices.sharing && prices.sharing[code === 'A' ? 0 : 1] != null)
				rowsP.push(['Sharing', prices.sharing[code === 'A' ? 0 : 1]]);
			if (quad != null) rowsP.push(['Quad', quad]);
			if (triple != null) rowsP.push(['Triple', triple]);
			if (dbl != null) rowsP.push(['Double', dbl]);
			for (const [rt, p] of rowsP)
				if (!Number.isInteger(p) || p <= 0)
					fail(`${pkg.code} ${cat.code} ${code} ${rt}: bad price ${p}`);
			if (!rowsP.length) fail(`${pkg.code} ${cat.code} option ${code}: no prices`);
			// Sanity: more people sharing a room never costs more per person.
			const by = Object.fromEntries(rowsP);
			if (by.Quad && by.Triple && by.Quad > by.Triple)
				fail(`${pkg.code} ${cat.code} ${code}: quad > triple`);
			if (by.Triple && by.Double && by.Triple > by.Double)
				fail(`${pkg.code} ${cat.code} ${code}: triple > double`);
			// Option B is the cheaper option in every package.
			options.push({ code, rows: rowsP, by });
		}
		if (options.length === 2) {
			for (const rt of ['Quad', 'Triple', 'Double']) {
				const a = options[0].by[rt];
				const b = options[1].by[rt];
				if (a != null && b != null && b > a)
					fail(`${pkg.code} ${cat.code} ${rt}: option B (${b}) dearer than A (${a})`);
			}
		}

		const first = days[0]?.from;
		const last = days.at(-1);
		packages.push({
			pkg,
			flags,
			idx,
			days,
			options,
			start: first,
			end: last.to ?? last.from,
			title: `${pkg.focus} – ${pkg.first} First`
		});
	});
	built.push({ cat, packages });
}

// Cross-catalogue: same shape in both lists.
for (let i = 0; i < PACKAGES.length; i++) {
	const u = built[0].packages[i];
	const s = built[1].packages[i];
	if (u.days.length !== s.days.length) fail(`${u.pkg.code}: USD/SAR itinerary lengths differ`);
	if (Boolean(u.pkg.usd.B) !== Boolean(s.pkg.sar.B))
		fail(`${u.pkg.code}: USD/SAR option counts differ`);
}
if (PACKAGES.length !== 26) fail(`expected 26 packages, got ${PACKAGES.length}`);

if (errors.length) {
	process.stderr.write(`Validation failed:\n${errors.map((e) => ` - ${e}`).join('\n')}\n`);
	process.exit(1);
}

// ---------------------------------------------------------------- SQL
const sql = [];
sql.push(`-- =====================================================
-- Hajj 2027 / 1448 catalogue — seed data (GENERATED)
-- =====================================================
-- Generated by scripts/hajj-2027/generate.mjs from scripts/hajj-2027/data.mjs.
-- DO NOT EDIT BY HAND — edit data.mjs and regenerate.
--
-- Run once in the Supabase SQL editor AFTER migrations/20260637_hajj_catalogue.sql.
-- Safe to re-run: every insert is ON CONFLICT DO NOTHING, so prices or
-- commission you have edited since are never overwritten.
--
-- Source: vendor brochures "HAJJ 2027 Packages US" (Mina Category A, USD) and
-- "HAJJ 2027 Packages Riyal" (Mina Category A Plus, SAR), price lists dated
-- 25 Aug 2026. Two separate catalogues; never merged. Prices are OUR COST.
-- Commission is not in the brochures and is left NULL.
-- =====================================================
`);

sql.push('-- Catalogues');
sql.push(
	`INSERT INTO public.hajj_catalogues (code, name, season_year, hijri_year, currency, mina_category, price_list_date)
VALUES
${CATALOGUES.map(
	(c) =>
		`\t(${q(c.code)}, ${q(c.name)}, ${SEASON.year}, ${SEASON.hijri}, ${q(c.currency)}, ${q(c.minaCategory)}, ${q(SEASON.priceListDate)})`
).join(',\n')}
ON CONFLICT (code) DO NOTHING;
`
);

// Packages
const pkgRows = [];
for (const { cat, packages } of built)
	for (const p of packages) {
		const f = p.flags;
		pkgRows.push(
			`\t(${q(cat.code)}, ${q(p.pkg.code)}, ${q(p.pkg.alt ?? null)}, ${q(p.title)}, ${q(p.pkg.focus)}, ${q(f.series)}, ${q(p.pkg.first)}, ${p.days.length}, ${q(p.pkg.label)}, ${p.pkg.short ? 'TRUE' : 'FALSE'}, ${f.isShifting ? 'TRUE' : 'FALSE'}, ${f.hasAziziya ? 'TRUE' : 'FALSE'}, ${q(iso(p.start))}, ${q(iso(p.end))}, ${q(p.pkg.notes ?? null)}, ${(p.idx + 1) * 10})`
		);
	}
sql.push('-- Packages');
sql.push(
	`INSERT INTO public.hajj_packages
	(catalogue_id, code, alt_code, title, hotel_focus, series, first_city, total_days, duration_label, is_short, is_shifting, has_aziziya, start_date, end_date, notes, sort_order)
SELECT c.id, v.code, v.alt_code, v.title, v.hotel_focus, v.series, v.first_city, v.total_days, v.duration_label, v.is_short, v.is_shifting, v.has_aziziya, v.start_date::date, v.end_date::date, v.notes, v.sort_order
FROM (VALUES
${pkgRows.join(',\n')}
) AS v(cat, code, alt_code, title, hotel_focus, series, first_city, total_days, duration_label, is_short, is_shifting, has_aziziya, start_date, end_date, notes, sort_order)
JOIN public.hajj_catalogues c ON c.code = v.cat
ON CONFLICT (catalogue_id, code) DO NOTHING;
`
);

// Options
const optRows = [];
for (const { cat, packages } of built)
	for (const p of packages)
		for (const o of p.options) optRows.push(`\t(${q(cat.code)}, ${q(p.pkg.code)}, ${q(o.code)})`);
sql.push('-- Hotel options (A / B)');
sql.push(
	`INSERT INTO public.hajj_package_options (package_id, code)
SELECT p.id, v.opt
FROM (VALUES
${optRows.join(',\n')}
) AS v(cat, pkg, opt)
JOIN public.hajj_catalogues c ON c.code = v.cat
JOIN public.hajj_packages p ON p.catalogue_id = c.id AND p.code = v.pkg
ON CONFLICT (package_id, code) DO NOTHING;
`
);

// Prices
const priceRows = [];
for (const { cat, packages } of built)
	for (const p of packages)
		for (const o of p.options)
			for (const [rt, price] of o.rows)
				priceRows.push(`\t(${q(cat.code)}, ${q(p.pkg.code)}, ${q(o.code)}, ${q(rt)}, ${price})`);
sql.push('-- Per-person prices (our cost), by option and room sharing');
sql.push(
	`INSERT INTO public.hajj_package_prices (option_id, room_type, price)
SELECT o.id, v.room, v.price
FROM (VALUES
${priceRows.join(',\n')}
) AS v(cat, pkg, opt, room, price)
JOIN public.hajj_catalogues c ON c.code = v.cat
JOIN public.hajj_packages p ON p.catalogue_id = c.id AND p.code = v.pkg
JOIN public.hajj_package_options o ON o.package_id = p.id AND o.code = v.opt
ON CONFLICT (option_id, room_type) DO NOTHING;
`
);

// Days
const dayRows = [];
for (const { cat, packages } of built)
	for (const p of packages)
		for (const d of p.days)
			dayRows.push(
				`\t(${q(cat.code)}, ${q(p.pkg.code)}, ${d.dayNo}, ${q(iso(d.from))}, ${q(d.to ? iso(d.to) : null)}, ${q(d.hijri)}, ${q(d.city)}, ${q(d.kind)}, ${q(d.a.name)}, ${n(d.a.stars)}, ${q(d.b ? d.b.name : null)}, ${n(d.b ? d.b.stars : null)})`
			);
sql.push('-- Day-by-day itineraries');
sql.push(
	`INSERT INTO public.hajj_package_days
	(package_id, day_no, date_ad, date_ad_end, hijri_label, city_label, kind, hotel_a, stars_a, hotel_b, stars_b)
SELECT p.id, v.day_no, v.date_ad::date, v.date_ad_end::date, v.hijri_label, v.city_label, v.kind, v.hotel_a, v.stars_a::numeric, v.hotel_b, v.stars_b::numeric
FROM (VALUES
${dayRows.join(',\n')}
) AS v(cat, pkg, day_no, date_ad, date_ad_end, hijri_label, city_label, kind, hotel_a, stars_a, hotel_b, stars_b)
JOIN public.hajj_catalogues c ON c.code = v.cat
JOIN public.hajj_packages p ON p.catalogue_id = c.id AND p.code = v.pkg
ON CONFLICT (package_id, day_no) DO NOTHING;
`
);

// Add-ons
const addonRows = [];
const addonRoomRows = [];
CATALOGUES.forEach((cat, ci) => {
	ADDONS.forEach((a, ai) => {
		const price = a.price ? a.price[ci] : null;
		const codes = a.codes ? `ARRAY[${a.codes.map(q).join(', ')}]` : 'NULL';
		addonRows.push(
			`\t(${q(cat.code)}, ${q(a.code)}, ${q(a.name)}, ${q(a.group)}, ${q(a.kind)}, ${n(price)}, ${n(a.capacity ?? null)}, ${a.estimate ? 'TRUE' : 'FALSE'}, ${codes}, ${(ai + 1) * 10}, ${q(a.notes ?? null)})`
		);
		for (const [rt, usd, sar] of a.room ?? [])
			addonRoomRows.push(`\t(${q(cat.code)}, ${q(a.code)}, ${q(rt)}, ${ci === 0 ? usd : sar})`);
	});
});
sql.push('-- Add-ons and supplements (our cost; NULL price = to be supplied)');
sql.push(
	`INSERT INTO public.hajj_addons
	(catalogue_id, code, name, group_name, pricing_kind, unit_price, capacity, is_estimate, package_codes, sort_order, notes)
SELECT c.id, v.code, v.name, v.group_name, v.pricing_kind, v.unit_price::numeric, v.capacity::integer, v.is_estimate, v.package_codes, v.sort_order, v.notes
FROM (VALUES
${addonRows.join(',\n')}
) AS v(cat, code, name, group_name, pricing_kind, unit_price, capacity, is_estimate, package_codes, sort_order, notes)
JOIN public.hajj_catalogues c ON c.code = v.cat
ON CONFLICT (catalogue_id, code) DO NOTHING;
`
);
sql.push('-- Room-dependent add-on prices');
sql.push(
	`INSERT INTO public.hajj_addon_room_prices (addon_id, room_type, price)
SELECT a.id, v.room, v.price
FROM (VALUES
${addonRoomRows.join(',\n')}
) AS v(cat, addon, room, price)
JOIN public.hajj_catalogues c ON c.code = v.cat
JOIN public.hajj_addons a ON a.catalogue_id = c.id AND a.code = v.addon
ON CONFLICT (addon_id, room_type) DO NOTHING;
`
);

const sqlPath = resolve(root, 'database/seeds/hajj-2027-catalogue.sql');
mkdirSync(dirname(sqlPath), { recursive: true });
writeFileSync(sqlPath, sql.join('\n'));

// ---------------------------------------------------------------- price-check doc
const md = [];
md.push(`# Hajj 2027 / 1448 — catalogue check sheet

> Generated from \`scripts/hajj-2027/data.mjs\` (transcribed from the two vendor brochures).
> **Check these figures against the PDFs before loading** \`database/seeds/hajj-2027-catalogue.sql\`.
> Prices are per person and are **our cost**. \`—\` means the brochure shows N/A.
`);
for (const { cat, packages } of built) {
	md.push(`\n## ${cat.name}\n`);
	md.push(`Currency: **${cat.currency}** · Mina camp: **Category ${cat.minaCategory}**\n`);
	md.push('| Code | Package | Printed | Rows | Option | Sharing | Quad | Triple | Double |');
	md.push('|---|---|---|---|---|---|---|---|---|');
	const f = (v) => (v == null ? '—' : v.toLocaleString('en-US'));
	for (const p of packages) {
		const code = p.pkg.alt ? `${p.pkg.code} (${p.pkg.alt})` : p.pkg.code;
		p.options.forEach((o, i) => {
			md.push(
				`| ${i === 0 ? code : ''} | ${i === 0 ? p.title : ''} | ${i === 0 ? p.pkg.label : ''} | ${i === 0 ? p.days.length : ''} | ${o.code} | ${f(o.by.Sharing)} | ${f(o.by.Quad)} | ${f(o.by.Triple)} | ${f(o.by.Double)} |`
			);
		});
	}
}

md.push('\n## Add-ons and supplements (our cost)\n');
md.push('| Add-on | Kind | USD | SAR | Applies to |');
md.push('|---|---|---|---|---|');
for (const a of ADDONS) {
	const fmt = (ci) => {
		if (a.room) return a.room.map(([rt, u, s]) => `${rt} ${ci === 0 ? u : s}`).join(' · ');
		const p = a.price?.[ci];
		return p == null ? '_to be supplied_' : p.toLocaleString('en-US');
	};
	const scope = a.codes ? `${a.codes[0]}–${a.codes.at(-1)}` : 'all packages';
	md.push(
		`| ${a.name}${a.estimate ? ' (approx)' : ''} | ${a.kind}${a.capacity ? ` (max ${a.capacity})` : ''} | ${fmt(0)} | ${fmt(1)} | ${scope} |`
	);
}

md.push('\n## Itineraries\n');
md.push('Option B hotel shown after a `/` where it differs from A. Dates are May 2027.\n');
for (const { cat, packages } of built) {
	md.push(`\n### ${cat.name}\n`);
	for (const p of packages) {
		md.push(
			`<details><summary><b>${p.pkg.code}</b> — ${p.title} · ${p.pkg.label} · ${p.start}–${p.end} May</summary>\n`
		);
		md.push('| Day | Date | Hijri | City | Accommodation |');
		md.push('|---|---|---|---|---|');
		for (const d of p.days) {
			const date = d.to ? `${d.from}–${d.to} May` : `${d.from} May`;
			const hotel = d.b ? `${d.a.name} / ${d.b.name}` : d.a.name;
			md.push(`| ${d.dayNo} | ${date} | ${d.hijri} | ${d.city} | ${hotel} |`);
		}
		md.push('\n</details>\n');
	}
}

const mdPath = resolve(root, 'docs/hajj-2027-price-check.md');
writeFileSync(mdPath, md.join('\n'));

const nPrices = priceRows.length;
const nDays = dayRows.length;
process.stdout.write(
	`OK: ${CATALOGUES.length} catalogues, ${built.reduce((a, b) => a + b.packages.length, 0)} packages, ${optRows.length} options, ${nPrices} prices, ${nDays} itinerary days, ${addonRows.length} add-ons\n`
);
