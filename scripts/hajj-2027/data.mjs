/*
 * Hajj 2027 / 1448 catalogue — transcribed from the vendor's two brochures
 * ("HAJJ 2027 Packages US" = Mina Category A / USD, "…Riyal" = Mina Category A
 * Plus / SAR). Price lists dated 25 Aug 2026.
 *
 * This file is the single source for database/seeds/hajj-2027-catalogue.sql and
 * docs/hajj-2027-price-check.md — edit here, then run:
 *
 *   node scripts/hajj-2027/generate.mjs
 *
 * Prices are OUR COST (what the vendor charges). Commission is not in the
 * brochures; it is entered later from the admin screen.
 */

export const CATALOGUES = [
	{
		code: '2027-USD',
		name: 'Hajj 2027 · USD (Mina Category A)',
		currency: 'USD',
		minaCategory: 'A'
	},
	{
		code: '2027-SAR',
		name: 'Hajj 2027 · SAR (Mina Category A Plus)',
		currency: 'SAR',
		minaCategory: 'A Plus'
	}
];

export const SEASON = { year: 2027, hijri: 1448, priceListDate: '2026-08-25' };

// Hotels as printed. [name, stars]. 4.5 = printed "★★★★+".
export const HOTELS = {
	DAT: ['Dar Al Tawhid Intercontinental', 5],
	DATIHG: ['Dar Al Tawhid IHG', 5],
	FCT: ['Fairmont Clock Tower', 5],
	TAQ: ['Dar Al Taqwa', 5],
	TAQH: ['Dar Al Taqwa/Hilton', 5],
	DT: ['Dallah Taibah (Premier Floor)', 4],
	SWM: ['Swissotel Makkah', 5],
	MT: ['Makkah Tower', 4],
	MTAT: ['Makkah Tower / Abraj Tower', 5],
	ABRAJ: ['Abraj Tower / Makkah Hotel & Tower', 5],
	VOCO: ['Voco Makkah By IHG', 4],
	PZ: ['Pullman Zamzam Makkah', 4.5],
	AZ: ['Aziziya Accommodation - A Class', null],
	ALQ: ['Al Aqeeq / Dallah Taibah / Similar', 4],
	STAR4: ['4 Star Hotel', 4]
};

// Mashaer rows. MINA / MINA_AZ text depends on the catalogue's Mina category.
export const MINA = (cat) => `Zone 1 near Jamarat ${cat} Category (Exclusive Services)`;
export const ARAFAT = 'Arafat Air Conditioned Marquee (Exclusive Services)';
export const DEPARTURE = 'Departure to Airport';

// Day-by-day rows: [city label as printed, hotel key A, hotel key B?]
// Keys: HOTELS keys, plus MINA, ARAF, MINA_AZ, ARAF_AZ, DEP.
const MASH = [
	['To Mina', 'MINA'],
	['Mina', 'ARAF'],
	['Mina', 'MINA'],
	['Mina', 'MINA']
];
const rep = (n, row) => Array.from({ length: n }, () => row);

/**
 * Package definitions.
 *  start       — AD day of May 2027 for day 1 (flex: arrival window 10–12 May, day 2 = 13 May)
 *  label       — headline duration as printed on the page
 *  days(cur)   — itinerary rows (cur = catalogue currency, for the few differences)
 *  usd / sar   — prices [quad, triple, double] per option (null = N/A);
 *                sharing = [A, B] where the vendor lists a "Sharing Room" row
 */
export const PACKAGES = [
	{
		code: 'UB001',
		focus: 'Intercon / Fairmont',
		first: 'Medinah',
		label: '13 Days',
		start: 7,
		days: () => [
			...rep(3, ['Medinah', 'TAQ']).map((r, i) => (i === 0 ? ['To Medinah', 'TAQ'] : r)),
			['To Makkah', 'DAT', 'FCT'],
			...rep(3, ['Makkah', 'DAT', 'FCT']),
			...MASH,
			['To Makkah', 'DAT', 'FCT'],
			['', 'DEP']
		],
		usd: { A: [null, 22450, 26850], B: [17300, 19100, 21850] },
		sar: { A: [null, 82000, 98000], B: [63200, 69700, 79700] }
	},
	{
		code: 'UB002',
		focus: 'Intercon / Fairmont',
		first: 'Makkah',
		label: '14 Days',
		start: 10,
		days: () => [
			['To Makkah', 'DAT', 'FCT'],
			...rep(3, ['Makkah', 'DAT', 'FCT']),
			...MASH,
			['To Makkah', 'DAT', 'FCT'],
			['Makkah', 'DAT', 'FCT'],
			['To Medinah', 'TAQ'],
			['Medinah', 'TAQ'],
			['Medinah', 'TAQ'],
			['', 'DEP']
		],
		usd: { A: [null, 22450, 26850], B: [17300, 19100, 21850] },
		sar: { A: [null, 82000, 98000], B: [63200, 69700, 79700] }
	},
	{
		code: 'UB003',
		focus: 'Intercon / Fairmont',
		first: 'Medinah',
		label: '10 Days',
		start: 10,
		days: () => [
			['To Medinah', 'TAQ'],
			['Makkah', 'TAQ'],
			['Makkah', 'DAT', 'FCT'],
			['Makkah', 'DAT', 'FCT'],
			...MASH,
			['To Makkah', 'DAT', 'FCT'],
			['Makkah', 'DEP']
		],
		usd: { A: [null, 21650, 26050], B: [16890, 18250, 21000] },
		sar: { A: [null, 79000, 95000], B: [61700, 66700, 76700] }
	},
	{
		code: 'UB004',
		focus: 'Swissotel',
		first: 'Medinah',
		label: '14 Days',
		start: 7,
		days: () => [
			['To Medinah', 'TAQH', 'DT'],
			...rep(2, ['Medinah', 'TAQH', 'DT']),
			['To Makkah', 'SWM'],
			...rep(3, ['Makkah', 'SWM']),
			...MASH,
			['To Makkah', 'SWM'],
			['Makkah', 'DEP']
		],
		usd: { A: [14950, 16300, 19300], B: [14200, 15590, 18350] },
		sar: { A: [54500, 59500, 70500], B: [51900, 56900, 66900] }
	},
	{
		code: 'UB005',
		focus: 'Swissotel',
		first: 'Makkah',
		label: '14 Days',
		start: 10,
		days: () => [
			['To Makkah', 'SWM'],
			...rep(3, ['Makkah', 'SWM']),
			...MASH,
			['To Makkah', 'SWM'],
			['Makkah', 'SWM'],
			['To Medinah', 'TAQH', 'DT'],
			...rep(2, ['Medinah', 'TAQH', 'DT']),
			['', 'DEP']
		],
		usd: { A: [14950, 16300, 19300], B: [14200, 15590, 18350] },
		sar: { A: [54500, 59500, 70500], B: [51900, 56900, 66900] }
	},
	{
		code: 'UB006',
		focus: 'Swissotel',
		first: 'Medinah',
		label: '10 Days',
		start: 10,
		short: true,
		days: () => [
			['To Medinah', 'TAQ', 'DT'],
			['Medinah', 'TAQ', 'DT'],
			['To Makkah', 'SWM'],
			['Makkah', 'SWM'],
			...MASH,
			['To Makkah', 'SWM'],
			['Makkah', 'DEP']
		],
		usd: { A: [15350, 15750, 18500], B: [13850, 15200, 17950] },
		sar: { A: [56000, 57500, 67500], B: [50500, 55500, 65500] }
	},
	{
		code: 'UB007',
		focus: 'Swissotel',
		first: 'Makkah',
		label: '09 Days',
		start: 12,
		short: true,
		days: () => [
			['To Makkah', 'SWM'],
			['Makkah', 'SWM'],
			...MASH,
			['To Makkah', 'SWM'],
			['Medinah', 'ALQ'],
			['', 'DEP']
		],
		usd: { A: [13850, 15200, 17950] },
		sar: { A: [50500, 55500, 65500] }
	},
	{
		code: 'UB008',
		focus: 'Makkah Tower',
		first: 'Medinah',
		label: '14 Days',
		start: 7,
		days: () => [
			['To Medinah', 'TAQH', 'DT'],
			...rep(2, ['Medinah', 'TAQH', 'DT']),
			['To Makkah', 'MT'],
			...rep(3, ['Makkah', 'MT']),
			...MASH,
			['To Makkah', 'MT'],
			['Makkah', 'DEP']
		],
		usd: { A: [13250, 14600, 17900], B: [12450, 14050, 16990], sharing: [null, 12450] },
		sar: { A: [48400, 53300, 65300], B: [45400, 51300, 62000], sharing: [null, 45400] }
	},
	{
		code: 'UB009',
		focus: 'Makkah Tower',
		first: 'Makkah',
		label: '14 Days',
		start: 10,
		days: () => [
			['To Makkah', 'MT'],
			...rep(3, ['Makkah', 'MT']),
			...MASH,
			['To Makkah', 'MT'],
			['Makkah', 'MT'],
			['To Medinah', 'TAQH', 'DT'],
			...rep(2, ['Medinah', 'TAQH', 'DT']),
			['', 'DEP']
		],
		usd: { A: [13250, 14600, 17900], B: [12450, 14050, 16990], sharing: [null, 12450] },
		sar: { A: [48400, 53300, 65300], B: [45400, 51300, 62000], sharing: [null, 45400] }
	},
	{
		code: 'UB010',
		focus: 'Makkah Tower',
		first: 'Medinah',
		label: '10 Days',
		start: 10,
		days: () => [
			['To Medinah', 'TAQ', 'DT'],
			['Medinah', 'TAQ', 'DT'],
			['To Makkah', 'MT'],
			['Makkah', 'MT'],
			...MASH,
			['To Makkah', 'MT'],
			['', 'DEP']
		],
		usd: { A: [12890, 14050, 16990], B: [12200, 13790, 16450], sharing: [null, 12200] },
		sar: { A: [47400, 51300, 62000], B: [44500, 50300, 60000], sharing: [null, 44500] }
	},
	{
		code: 'UB011',
		focus: 'Voco by IHG',
		first: 'Medinah',
		label: '14 Days',
		start: 7,
		days: () => [
			['To Medinah', 'DT'],
			...rep(2, ['Medinah', 'DT']),
			['To Makkah', 'VOCO'],
			...rep(3, ['Makkah', 'VOCO']),
			...MASH,
			['To Makkah', 'VOCO'],
			['Makkah', 'DEP']
		],
		usd: { A: [10450, 11500, 13425] },
		sar: { A: [38200, 42000, 49000] }
	},
	{
		code: 'UB012',
		focus: 'Voco by IHG',
		first: 'Makkah',
		label: '14 Days',
		start: 10,
		days: () => [
			['To Makkah', 'VOCO'],
			...rep(3, ['Makkah', 'VOCO']),
			...MASH,
			['To Makkah', 'VOCO'],
			['Makkah', 'VOCO'],
			['To Medinah', 'DT'],
			...rep(2, ['Medinah', 'DT']),
			['', 'DEP']
		],
		usd: { A: [10450, 11500, 13425] },
		sar: { A: [38200, 42000, 49000] }
	},
	{
		code: 'UB013',
		focus: 'Voco by IHG',
		first: 'Medinah',
		label: '10 Days',
		start: 10,
		short: true,
		days: () => [
			['To Medinah', 'DT'],
			['Medinah', 'DT'],
			['To Makkah', 'VOCO'],
			['Makkah', 'VOCO'],
			...MASH,
			['To Makkah', 'VOCO'],
			['Makkah', 'DEP']
		],
		usd: { A: [10450, 11500, 13425] },
		sar: { A: [38200, 42000, 49000] }
	},
	{
		code: 'UB014',
		focus: 'Flex 14',
		first: 'Makkah',
		label: 'Flex 14 Days',
		start: 10,
		days: () => [
			['To Makkah', 'PZ'],
			...rep(3, ['Makkah', 'PZ']),
			...MASH,
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			['To Medinah', 'TAQ', 'DT'],
			...rep(2, ['Medinah', 'TAQ', 'DT']),
			['', 'DEP']
		],
		usd: { A: [11650, 12750, 14520], B: [11100, 12200, 13560] },
		sar: { A: [42500, 46500, 53000], B: [40500, 44500, 49500] }
	},
	{
		code: 'UB015',
		focus: 'Flex 14',
		first: 'Medinah',
		label: 'Flex 14 Days',
		start: 7,
		days: () => [
			['To Medinah', 'TAQ', 'DT'],
			...rep(2, ['Medinah', 'TAQ', 'DT']),
			['To Makkah', 'PZ'],
			...rep(3, ['Makkah', 'PZ']),
			...MASH,
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			['', 'DEP']
		],
		usd: { A: [11650, 12750, 14520], B: [11100, 12200, 13560] },
		sar: { A: [42500, 46500, 53000], B: [40500, 44500, 49500] }
	},
	{
		code: 'UB016',
		focus: 'Flex 10',
		first: 'Medinah',
		label: 'Flex 10 Days',
		start: 10,
		days: () => [
			['To Medinah', 'TAQ', 'DT'],
			['Medinah', 'TAQ', 'DT'],
			['To Makkah', 'PZ'],
			['Makkah', 'PZ'],
			...MASH,
			['To Makkah', 'AZ'],
			['Makkah', 'DEP']
		],
		usd: { A: [11100, 11920, 12880], B: [10685, 11390, 12330] },
		sar: { A: [40500, 43500, 47000], B: [39000, 41500, 45000] }
	},
	{
		code: 'UB017',
		focus: 'Flex 09',
		first: 'Makkah',
		label: 'Flex 09 Days',
		start: 12,
		days: () => [
			['To Makkah', 'PZ'],
			['Makkah', 'PZ'],
			...MASH,
			['To Makkah', 'AZ'],
			['Medinah', 'ALQ'],
			['', 'DEP']
		],
		usd: { A: [10685, 11370, 12330] },
		sar: { A: [39000, 41500, 45000] }
	},
	{
		code: 'UB018',
		alt: 'UHS018',
		focus: 'Comfort 17',
		first: 'Medinah',
		label: 'Comfort 17 Days',
		start: 4,
		days: () => [
			['To Medinah', 'TAQ'],
			['Medinah', 'TAQ'],
			['Medinah', 'TAQ'],
			['To Makkah', 'DATIHG', 'FCT'],
			['Makkah', 'DATIHG', 'FCT'],
			['Makkah', 'DATIHG', 'FCT'],
			['Makkah', 'AZ'],
			['Makkah', 'AZ'],
			['Makkah', 'AZ'],
			['To Mina', 'AZ'],
			['Mina', 'MINA'],
			['Mina', 'ARAF'],
			['Mina', 'MINA'],
			['To Makkah', 'MINA'],
			['Makkah', 'AZ'],
			['Makkah', 'AZ'],
			['', 'DEP']
		],
		usd: { A: [null, 11170, 11790], B: [10520, 10800, 11250] },
		sar: { A: [null, 40800, 43000], B: [38400, 39300, 41000] }
	},
	{
		code: 'UB019',
		alt: 'UHS019',
		focus: 'Comfort 17',
		first: 'Makkah',
		label: 'Comfort 17 Days',
		start: 7,
		days: () => [
			['To Makkah', 'DATIHG', 'FCT'],
			...rep(2, ['Makkah', 'DATIHG', 'FCT']),
			...rep(4, ['Makkah', 'AZ']),
			...MASH,
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			['To Medinah', 'TAQ', 'DT'],
			...rep(2, ['Medinah', 'TAQ', 'DT']),
			['', 'DEP']
		],
		usd: { A: [null, 11900, 12800], B: [11100, 11480, 12250] },
		sar: { A: [null, 43400, 46700], B: [40500, 41900, 44700] }
	},
	{
		code: 'UB020',
		alt: 'UHS020',
		focus: 'Comfort 14',
		first: 'Medinah',
		label: 'Comfort 14 Days',
		start: 7,
		days: () => [
			['To Medinah', 'TAQ', 'DT'],
			...rep(2, ['Medinah', 'TAQ', 'DT']),
			['To Makkah', 'MTAT'],
			['Makkah', 'MTAT'],
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			...MASH,
			['To Makkah', 'AZ'],
			['', 'DEP']
		],
		usd: { A: [10950, 11230, 11500], B: [10410, 10685, 10950] },
		sar: { A: [40000, 41000, 42000], B: [38000, 39000, 40000] }
	},
	{
		code: 'UB021',
		alt: 'UHS021',
		focus: 'Comfort 14',
		first: 'Makkah',
		label: 'Comfort 14 Days',
		start: 10,
		days: () => [
			['To Makkah', 'MTAT'],
			['Makkah', 'MTAT'],
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			...MASH,
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			['To Medinah', 'TAQ', 'DT'],
			...rep(2, ['Medinah', 'TAQ', 'DT']),
			['', 'DEP']
		],
		usd: { A: [10950, 11230, 11500], B: [10410, 10685, 10950] },
		sar: { A: [40000, 41000, 42000], B: [38000, 39000, 40000] }
	},
	{
		code: 'UB022',
		focus: 'Value 13',
		first: 'Makkah',
		label: 'Value 13 Days',
		start: 10,
		flex: true,
		days: () => [
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			...MASH,
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			['To Medinah', 'TAQ', 'DT'],
			...rep(2, ['Medinah', 'TAQ', 'DT']),
			['', 'DEP']
		],
		usd: { A: [10410, 10685, 11230], B: [9725, 10000, 10275] },
		sar: { A: [38000, 39000, 41000], B: [35500, 36500, 37500] }
	},
	{
		code: 'UB023',
		focus: 'Value 14',
		first: 'Medinah',
		label: 'Value 14 Days',
		start: 7,
		days: () => [
			['To Medinah', 'TAQ', 'DT'],
			...rep(2, ['Medinah', 'TAQ', 'DT']),
			['To Makkah', 'AZ'],
			...rep(3, ['Makkah', 'AZ']),
			...MASH,
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			['', 'DEP']
		],
		usd: { A: [10410, 10685, 11230], B: [9725, 10000, 10275] },
		sar: { A: [38000, 39000, 41000], B: [35500, 36500, 37500] }
	},
	{
		code: 'UB024',
		focus: 'Value 10',
		first: 'Medinah',
		label: 'Value 10 Days',
		start: 10,
		// Day 1 hotel differs between the two brochures.
		days: (cur) => [
			['To Medinah', cur === 'USD' ? 'ALQ' : 'DT'],
			...rep(3, ['Makkah', 'AZ']),
			...MASH,
			['To Makkah', 'AZ'],
			['Makkah', 'DEP']
		],
		usd: { A: [9175, 9315, 9450] },
		sar: { A: [33500, 34000, 34500] }
	},
	{
		code: 'UB025',
		focus: 'Value 09',
		first: 'Makkah',
		label: 'Value 9-10 Days',
		start: 10,
		flex: true,
		notes:
			'Makkah nights can be reduced; package price remains the same. Transfer from Makkah to Medinah by car.',
		days: () => [
			['To Makkah', 'AZ'],
			['To Makkah', 'AZ'],
			['To Mina', 'MINA_AZ'],
			['Mina', 'ARAF_AZ'],
			['Mina', 'MINA_AZ'],
			['Mina', 'MINA_AZ'],
			['To Makkah', 'AZ'],
			['To Medinah', 'STAR4'],
			['', 'DEP']
		],
		usd: { A: [9175, 9315, 9450] },
		sar: { A: [33500, 34000, 34500] }
	},
	{
		code: 'UB026',
		focus: 'Value 20',
		first: 'Makkah',
		label: 'Value 20 Days',
		start: 10,
		flex: true,
		days: () => [
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			...MASH,
			['To Makkah', 'AZ'],
			['Makkah', 'AZ'],
			...rep(6, ['Makkah', 'ABRAJ']),
			['To Medinah', 'TAQH'],
			...rep(2, ['Medinah', 'TAQH']),
			['', 'DEP']
		],
		usd: { A: [11100, 11370, 11920] },
		sar: { A: [40500, 41500, 43500] }
	}
];

/** Series, shifting and Aziziya flags follow the brochure's table of contents. */
export function packageFlags(code) {
	const n = Number(code.slice(2));
	return {
		series:
			n <= 13
				? 'platinum_makkah_medinah'
				: n <= 21
					? 'platinum_aziziya_makkah_medinah'
					: 'platinum_aziziya_medinah',
		hasAziziya: n >= 14,
		// Non-shifting: UB001–013 and the Value 13/14/10/9 packages (UB022–025).
		isShifting: n >= 14 && n <= 21 ? true : n === 26
	};
}

const ALL = null; // add-on applies to every package
const range = (a, b) =>
	Array.from({ length: b - a + 1 }, (_, i) => `UB${String(a + i).padStart(3, '0')}`);

/**
 * Add-ons / supplements per currency. `price` = [USD, SAR]; null = not published
 * yet (tents, business class — to be supplied). room = [[room, USD, SAR], …].
 * All amounts are OUR COST.
 */
export const ADDONS = [
	{
		code: 'kaaba_view_platinum',
		name: 'Kaaba view supplement',
		group: 'Accommodation',
		kind: 'per_person',
		price: [2200, 8000],
		codes: range(1, 13),
		notes: 'Per person. Platinum (non-Aziziya) packages.'
	},
	{
		code: 'kaaba_view_aziziya',
		name: 'Kaaba view supplement',
		group: 'Accommodation',
		kind: 'per_person',
		price: [1050, 3800],
		codes: range(14, 26),
		notes: 'Per person. Aziziya packages.'
	},
	{
		code: 'aziziya_family_room',
		name: 'Aziziya family room (5 days of Hajj)',
		group: 'Accommodation',
		kind: 'per_person',
		price: [5500, 20000],
		codes: range(1, 13),
		notes: 'Family rooms in the Aziziya building for the 5 days of Hajj. Per person.'
	},
	{
		code: 'aziziya_family_room_supplement',
		name: 'Aziziya family room supplement',
		group: 'Accommodation',
		kind: 'per_person_by_room',
		codes: range(18, 26),
		room: [
			['Double', 1100, 4000],
			['Triple', 550, 2000]
		],
		notes: 'Per person. Already included in UB014–UB017.'
	},
	{
		code: 'extra_medinah_night',
		name: 'Additional night in Medinah',
		group: 'Accommodation',
		kind: 'per_night_by_room',
		codes: range(1, 13),
		room: [
			['Double', 850, 3000],
			['Triple', 600, 2200],
			['Quad', 600, 2190]
		],
		notes: 'Per night per person.'
	},
	{
		code: 'taxi_jeddah_makkah',
		name: 'Private car / taxi — Jeddah airport ↔ Makkah hotel',
		group: 'Transport',
		kind: 'per_person',
		price: [165, 600],
		codes: ALL,
		notes: 'Per person ("& v.v" — vice versa).'
	},
	{
		code: 'taxi_medinah',
		name: 'Private car / taxi — Medinah airport ↔ Medinah hotel',
		group: 'Transport',
		kind: 'per_person',
		price: [40, 150],
		codes: ALL,
		notes: 'Per person ("& v.v" — vice versa).'
	},
	{
		code: 'gmc_vehicle',
		name: 'VIP GMC for Mashaer days (8–13 Zil Hajj)',
		group: 'Transport',
		kind: 'pooled_vehicle',
		price: [9600, 35000],
		capacity: 6,
		codes: ALL,
		notes:
			'GMC M 2020–2023 (Land Cruiser), Urdu/English-speaking chauffeur, Mina–Arafat–Muzdalfah and back. Per vehicle, max 6 persons; cost is split across occupants.'
	},
	{
		code: 'tent_5_person',
		name: '5-person sharing tent with attached bathroom',
		group: 'Mina tent',
		kind: 'per_person',
		price: [null, null],
		codes: ALL,
		notes: 'Price to be supplied.'
	},
	{
		code: 'tent_8_person',
		name: '8-person sharing tent with attached bathroom',
		group: 'Mina tent',
		kind: 'per_person',
		price: [null, null],
		codes: ALL,
		notes: 'Price to be supplied.'
	},
	{
		code: 'tent_deluxe_family',
		name: 'Deluxe family tent with attached bathroom',
		group: 'Mina tent',
		kind: 'per_person',
		price: [null, null],
		codes: ALL,
		notes: 'Upgrade from the standard Platinum tent. Price to be supplied.'
	},
	{
		code: 'business_class',
		name: 'Business class ticket upgrade',
		group: 'Flight',
		kind: 'per_person',
		price: [null, null],
		codes: ALL,
		notes: 'Subject to availability. Price to be supplied.'
	},
	{
		code: 'qurbani',
		name: 'Qurbani assistance',
		group: 'Qurbani',
		kind: 'per_person',
		price: [200, 750],
		codes: ALL,
		estimate: true,
		notes: 'Vendor states "approx" charges.'
	}
];
