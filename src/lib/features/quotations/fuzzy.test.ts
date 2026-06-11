import { describe, expect, it } from 'vitest';
import { bestMatch, levenshtein, normalizeName, similarity } from './fuzzy';

describe('fuzzy matching', () => {
	it('normalizes names', () => {
		expect(normalizeName('  Hilton-Makkah  Hotel! ')).toBe('hilton makkah hotel');
		expect(normalizeName('SWISSÔTEL')).toBe('swiss tel');
	});

	it('computes edit distance', () => {
		expect(levenshtein('kitten', 'sitting')).toBe(3);
		expect(levenshtein('same', 'same')).toBe(0);
	});

	it('scores identical and near-identical names high', () => {
		expect(similarity('Hilton Makkah', 'hilton makkah')).toBe(1);
		expect(similarity('Hilton Makkah', 'Hilton Makkah Hotel')).toBeGreaterThan(0.66);
		expect(similarity('Hilltn Makkah', 'Hilton Makkah')).toBeGreaterThan(0.8);
	});

	it('scores unrelated names low', () => {
		expect(similarity('Hilton Makkah', 'Anwar Al Madinah')).toBeLessThan(0.4);
	});

	it('finds the best match above threshold and rejects below', () => {
		const hotels = [{ name: 'Hilton Makkah' }, { name: 'Anwar Al Madinah' }];
		expect(bestMatch('hilton makka', hotels, (h) => h.name)?.name).toBe('Hilton Makkah');
		expect(bestMatch('Conrad Makkah', hotels, (h) => h.name)).toBeNull();
	});
});
