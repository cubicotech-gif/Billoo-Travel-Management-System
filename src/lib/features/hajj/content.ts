import type { HajjPackageRow } from './types';

// Client-facing wording for the Hajj proposal. Written for OUR brand: it names
// no vendor and carries no vendor codes or photos. The substance comes from the
// vendor's service pages and terms; edit here to change what clients read.

export const SEASON_LABEL = 'Hajj 2027 · 1448 AH';

/**
 * 50 / 50 plan. The balance date is fixed for the 2027 season. `due` is either
 * 'booking' (the day the booking is confirmed) or a fixed ISO date.
 */
export const PAYMENT_PLAN = [
	{ label: 'At the time of booking', percent: 50, due: 'booking' },
	{ label: 'By 15 November 2026', percent: 50, due: '2026-11-15' }
] as const;

export const PRICE_NOTE =
	'Prices are per person. Rates and hotels are subject to change (currency differences or Saudi regulation changes), even after booking.';

/** What every Hajj package includes. */
const COMMON_INCLUSIONS = [
	'Meet & assist at the Jeddah / Medinah Hajj terminal, and group transfer by bus from the airport to the hotel',
	'Makkah and Medinah hotels on half-board basis (breakfast and dinner), as per the itinerary',
	'Mina camp close to Jamarat for 8–12 Zil Hajj: air-conditioned tents (about 16 persons per tent), sofa-cum-bed (50–55 cm), pillow, bed sheet and blanket, private toilets (Indian and western)',
	'Full-board buffet meals in Mina and Arafat, with hot and cold drinks',
	'Air-conditioned camp in Arafat; floor mat and snack box in Muzdalifah',
	'Private luxury buses (2025 model, with bathroom) for the Mashaer days: Mina – Arafat – Muzdalifah – Mina',
	'Makkah ↔ Medinah transfer by train or bus',
	'Ziyarat in Medinah with guidance',
	'Hajj training programme and guidance in Pakistan and Saudi Arabia, a religious guide book, and a Mufti / Aalim for ritual guidance',
	'Assistance with Tawaf-e-Ziyarah and in performing Qurbani',
	'Microphone and speakers for religious talks and guidance'
];

/** Series-specific lines. */
const NON_AZIZIYA = [
	'Makkah hotel room retained from 8 to 12 Zil Hajj (without meals)',
	'Hotels in front of the Haram'
];
const WITH_AZIZIYA = [
	'Aziziya accommodation (A-class, air-conditioned building) with proper beds, pillow and blanket — about 4 persons per room',
	'Three full buffet meals daily with hot and cold drinks in the Aziziya building (except on Hajj days)',
	'Aziziya room retained from 8 to 12 Zil Hajj',
	'Scheduled shuttle service between Aziziya and the Haram (subject to Saudi laws and traffic)',
	'Daily religious talks, prayer areas for men and women, laundry machine and lift access in the Aziziya building'
];

export function inclusionsFor(pkg: Pick<HajjPackageRow, 'has_aziziya'>): string[] {
	return [...COMMON_INCLUSIONS, ...(pkg.has_aziziya ? WITH_AZIZIYA : NON_AZIZIYA)];
}

/** Standing exclusions; ticket and Qurbani lines are dropped when they are quoted. */
export function exclusions(opts: { ticketQuoted: boolean; qurbaniQuoted: boolean }): string[] {
	return [
		...(opts.ticketQuoted ? [] : ['Air ticket']),
		...(opts.qurbaniQuoted ? [] : ['Qurbani']),
		'Optional supplements not listed in this proposal (Kaaba view, additional nights, private car / taxi)',
		'Personal expenses, laundry and excess baggage'
	];
}

export const REQUIRED_DOCUMENTS = [
	'Passport copy (valid until 30 November 2027)',
	'Two photographs, 4 × 3 cm, white background',
	'CNIC copy',
	'Next of kin: ID card, contact number and relation',
	'Blood group',
	'Mehram details, for women travelling'
];

export const TERMS = [
	'Services are confirmed on receipt of the first instalment. The balance is due as per the payment plan; a booking may be cancelled if payments are not made on time.',
	'Prices are per person for the room sharing selected. Makkah and Medinah hotels have double rooms only; an extra bed is provided for triple and quad sharing.',
	'Rates, hotels and services are subject to change — including currency differences, new taxes and changes in Saudi regulations, Hajj quota or visa rules — even after booking.',
	'Any increase in Saudi government charges for the five days of Hajj, and any new taxes imposed, will be charged over and above the quoted price.',
	'We may provide a hotel of equal or better category. “Similar” means a hotel of comparable standard close to the Haram.',
	'During peak days (1–14 Zil Hajj) hotel check-in is after Isha prayers because of the number of arrivals; check-out time is 12 PM.',
	'During the Mashaer days, tents, accommodation, food, transport and bathrooms are provided and managed by the Saudi service provider under Saudi regulations. Air-conditioning is provided, but the required temperature cannot be guaranteed in extreme heat.',
	'Buses drop pilgrims at Muzdalifah and return for pick-up between 6 AM and 10 AM.',
	'Because Mina is close to Jamarat, no transport is provided for Tawaf-e-Ziyarah on 12 Zil Hajj. Assistance is provided to perform it.',
	'Only one suitcase per person is allowed for the Hajj journey. Excess luggage is at the pilgrim’s risk and expense. Liability for lost or stolen luggage is limited to a maximum of US$100 for tagged, locked suitcases.',
	'Attendance at Hajj training sessions is mandatory.',
	'Each pilgrim must hold a valid passport and provide the required documents. We complete all formalities with the Ministry of Religious Affairs, but are not responsible for delays or non-issuance of Hajj visas.',
	'A family representative who books for family or friends is responsible for the group’s commitments and communication.',
	'Cancellation: a US$350 per person service charge applies. After the cut-off date advised at booking, and once Hajj visas are issued, a cancellation is treated as a substitution — the pilgrim may nominate another person, or we may offer the package to a waiting applicant (subject to demand).',
	'No-show and date-change penalties on air tickets, where applicable, are borne by the pilgrim.',
	'All packages, policies and bookings are subject to final guidelines from the Governments of Saudi Arabia and Pakistan and to approval by the Ministry of Religious Affairs. Neither party is liable for delays or failure caused by events beyond its control (force majeure).'
];

export const AZIZIYA_NOTE = 'Aziziya accommodation is not comparable to hotel services.';
