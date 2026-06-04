// Parse pasted spreadsheet data. Excel/Sheets copy as tab-separated; we also
// accept comma-separated. Returns a row-major grid of trimmed cells.

export function parseTable(raw: string): string[][] {
	return raw
		.split(/\r?\n/)
		.filter((line) => line.trim().length > 0)
		.map((line) => {
			const cells = line.includes('\t') ? line.split('\t') : line.split(',');
			return cells.map((c) => c.trim());
		});
}

/** Looks like a header row if its first cell matches the first column label. */
export function looksLikeHeader(row: string[] | undefined, firstColumn: string): boolean {
	return !!row && row[0]?.toLowerCase() === firstColumn.toLowerCase();
}
