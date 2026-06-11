/*
 * Backfill the canonical `hotels` table (Rate Intelligence — step 1).
 *
 * Extracts distinct hotel names from rate_cards (name + city) and
 * quotation_lines (meta.hotel + meta.city), then clusters near-duplicate names
 * into one hotel each using the SAME fuzzy logic as the app (fuzzy.ts), folding
 * variants into `aliases`.
 *
 * Run (needs DB credentials — anon key works while dev-open-access is applied):
 *
 *   SUPABASE_URL=... SUPABASE_KEY=... \
 *     node_modules/.bin/vite-node scripts/backfill-hotels.ts
 *
 *   # optional: tighten/loosen clustering (default = fuzzy.ts threshold 0.82)
 *   ... scripts/backfill-hotels.ts --threshold=0.88
 *
 * This writes scripts/hotels.proposed.json and prints the proposed list for
 * REVIEW. It does NOT insert anything.
 *
 * After you review/merge clusters, save your approved copy as
 * scripts/hotels.approved.json and run with --apply to insert:
 *
 *   SUPABASE_URL=... SUPABASE_KEY=... \
 *     node_modules/.bin/vite-node scripts/backfill-hotels.ts --apply
 */
/* eslint-disable no-console -- this is a CLI script; stdout is the interface */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	DEFAULT_MATCH_THRESHOLD,
	normalizeName,
	similarity
} from '../src/lib/features/quotations/fuzzy';

type City = 'makkah' | 'madinah' | 'other';

const url = process.env.SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const key =
	process.env.SUPABASE_KEY ??
	process.env.SUPABASE_SERVICE_ROLE_KEY ??
	process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
	console.error('✖ Set SUPABASE_URL and SUPABASE_KEY (anon key is fine in dev) and re-run.');
	process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const thresholdArg = args.find((a) => a.startsWith('--threshold='));
const THRESHOLD = thresholdArg ? Number(thresholdArg.split('=')[1]) : DEFAULT_MATCH_THRESHOLD;

const here = dirname(fileURLToPath(import.meta.url));
const proposedPath = join(here, 'hotels.proposed.json');
const approvedPath = join(here, 'hotels.approved.json');

const supabase = createClient(url, key);

function cityEnum(raw: unknown): City {
	const c = normalizeName(String(raw ?? ''));
	if (c.includes('makk') || c.includes('mecca') || c.includes('makah')) return 'makkah';
	if (c.includes('madin') || c.includes('medin')) return 'madinah';
	return 'other';
}

interface Observation {
	name: string;
	city: City;
}

async function fetchObservations(): Promise<Observation[]> {
	const obs: Observation[] = [];

	const { data: rc, error: e1 } = await supabase
		.from('rate_cards')
		.select('name, city')
		.eq('item_type', 'hotel');
	if (e1) throw e1;
	for (const r of rc ?? []) {
		const name = String(r.name ?? '').trim();
		if (name) obs.push({ name, city: cityEnum(r.city) });
	}

	const { data: ql, error: e2 } = await supabase
		.from('quotation_lines')
		.select('meta')
		.eq('line_type', 'hotel');
	if (e2) throw e2;
	for (const l of ql ?? []) {
		const meta = (l.meta ?? {}) as Record<string, unknown>;
		const name = String(meta.hotel ?? '').trim();
		if (name) obs.push({ name, city: cityEnum(meta.city) });
	}

	return obs;
}

interface Cluster {
	canonical: string;
	city: City;
	variants: Map<string, number>; // original-cased name -> observation count
}

function clusterObservations(obs: Observation[]): Cluster[] {
	// Collapse exact (case-insensitive) duplicates first, with counts.
	const distinctMap = new Map<string, { name: string; city: City; count: number }>();
	for (const o of obs) {
		const k = `${o.city}|${o.name.toLowerCase()}`;
		const cur = distinctMap.get(k);
		if (cur) cur.count++;
		else distinctMap.set(k, { name: o.name, city: o.city, count: 1 });
	}

	// Greedy fuzzy clustering within each city; most-frequent names seed clusters.
	const distinct = [...distinctMap.values()].sort(
		(a, b) => b.count - a.count || a.name.localeCompare(b.name)
	);

	const clusters: Cluster[] = [];
	for (const d of distinct) {
		let best: Cluster | null = null;
		let bestScore = 0;
		for (const c of clusters) {
			if (c.city !== d.city) continue;
			let score = similarity(d.name, c.canonical);
			for (const v of c.variants.keys()) score = Math.max(score, similarity(d.name, v));
			if (score > bestScore) {
				bestScore = score;
				best = c;
			}
		}
		if (best && bestScore >= THRESHOLD) {
			best.variants.set(d.name, (best.variants.get(d.name) ?? 0) + d.count);
		} else {
			clusters.push({ canonical: d.name, city: d.city, variants: new Map([[d.name, d.count]]) });
		}
	}

	// Canonical = the highest-observed variant in each cluster.
	for (const c of clusters) {
		let bestName = c.canonical;
		let bestCount = -1;
		for (const [n, ct] of c.variants) {
			if (ct > bestCount) {
				bestCount = ct;
				bestName = n;
			}
		}
		c.canonical = bestName;
	}

	return clusters;
}

interface ProposedHotel {
	name: string;
	city: City;
	star_rating: number | null;
	distance_note: string | null;
	aliases: string[];
	_observations: number;
}

function toProposed(clusters: Cluster[]): ProposedHotel[] {
	return clusters
		.map((c) => ({
			name: c.canonical,
			city: c.city,
			star_rating: null,
			distance_note: null,
			aliases: [...c.variants.keys()].filter((n) => n !== c.canonical),
			_observations: [...c.variants.values()].reduce((a, b) => a + b, 0)
		}))
		.sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
}

async function dryRun() {
	const obs = await fetchObservations();
	const clusters = clusterObservations(obs);
	const proposed = toProposed(clusters);
	writeFileSync(proposedPath, JSON.stringify(proposed, null, 2));

	console.log(
		`\n${obs.length} hotel observations → ${proposed.length} proposed hotels (fuzzy threshold ${THRESHOLD}):\n`
	);
	let lastCity = '';
	for (const p of proposed) {
		if (p.city !== lastCity) {
			console.log(`\n=== ${p.city.toUpperCase()} ===`);
			lastCity = p.city;
		}
		console.log(`• ${p.name}  (${p._observations} obs)`);
		if (p.aliases.length) console.log(`    aliases: ${p.aliases.join('  |  ')}`);
	}
	console.log(`\n→ Wrote ${proposedPath}`);
	console.log(
		'→ Review/merge clusters, save your approved copy as hotels.approved.json, then re-run with --apply.\n'
	);
}

async function applyInsert() {
	if (!existsSync(approvedPath)) {
		console.error(
			`✖ ${approvedPath} not found.\n  Review hotels.proposed.json, save the approved version as hotels.approved.json, then re-run with --apply.`
		);
		process.exit(1);
	}
	const rows = JSON.parse(readFileSync(approvedPath, 'utf8')) as ProposedHotel[];
	const payload = rows.map((r) => ({
		name: r.name,
		city: r.city,
		star_rating: r.star_rating ?? null,
		distance_note: r.distance_note ?? null,
		aliases: r.aliases ?? []
	}));
	const { data, error } = await supabase.from('hotels').insert(payload).select('id');
	if (error) throw error;
	console.log(`✓ Inserted ${data?.length ?? 0} hotels.`);
}

(apply ? applyInsert() : dryRun()).catch((e) => {
	console.error(e);
	process.exit(1);
});
