// Fuzzy name matching for the smart auto-save layer. Used to decide whether a
// manually-typed hotel / vendor / transfer / airline already exists in the
// database before inserting a duplicate. Pure — no I/O — unit tested.

/** Lower-case, strip punctuation, collapse whitespace. */
export function normalizeName(s: string): string {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

function tokenSet(s: string): Set<string> {
	return new Set(normalizeName(s).split(' ').filter(Boolean));
}

/** Classic Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;
	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	let curr = new Array<number>(b.length + 1);
	for (let i = 1; i <= a.length; i++) {
		curr[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(
				(prev[j] ?? 0) + 1, // deletion
				(curr[j - 1] ?? 0) + 1, // insertion
				(prev[j - 1] ?? 0) + cost // substitution
			);
		}
		[prev, curr] = [curr, prev];
	}
	return prev[b.length] ?? 0;
}

/**
 * Similarity in [0, 1]. Combines a token-set Jaccard (good for word reorder /
 * extra words like "Hotel") with a Levenshtein ratio (good for small typos),
 * taking the more forgiving of the two.
 */
export function similarity(a: string, b: string): number {
	const na = normalizeName(a);
	const nb = normalizeName(b);
	if (!na || !nb) return 0;
	if (na === nb) return 1;

	const ta = tokenSet(na);
	const tb = tokenSet(nb);
	let inter = 0;
	for (const t of ta) if (tb.has(t)) inter++;
	const union = new Set([...ta, ...tb]).size;
	const jaccard = union ? inter / union : 0;

	const maxLen = Math.max(na.length, nb.length);
	const lev = maxLen ? 1 - levenshtein(na, nb) / maxLen : 0;

	return Math.max(jaccard, lev);
}

export const DEFAULT_MATCH_THRESHOLD = 0.82;

/**
 * Find the best-matching item in `items` for `name`, or null if nothing clears
 * the threshold. Returns the item plus its score so callers can decide.
 */
export function bestMatch<T>(
	name: string,
	items: T[],
	getName: (item: T) => string,
	threshold = DEFAULT_MATCH_THRESHOLD
): T | null {
	let best: T | null = null;
	let bestScore = 0;
	for (const item of items) {
		const score = similarity(name, getName(item));
		if (score > bestScore) {
			bestScore = score;
			best = item;
		}
	}
	return bestScore >= threshold ? best : null;
}
