import type { Passenger } from '$features/passengers/types';
import type { HajjTravellerRow } from './types';

// What is still missing before a traveller can be booked for Hajj: the profile
// facts the vendor's booking form asks for. Pure — the UI lists these as chips.

/** Passports must be valid until this date for the 2027 season. */
export const PASSPORT_VALID_UNTIL = '2027-11-30';
/** Hajj pilgrims must be at least this old on the Hajj dates. */
export const MIN_HAJJ_AGE = 12;
/** Age is measured on the day Hajj begins. */
export const HAJJ_DAY = '2027-05-15';

export interface Issue {
	key: string;
	text: string;
}

type TravellerFacts = Pick<
	HajjTravellerRow,
	'blood_group' | 'mehram_traveller_id' | 'kin_name' | 'kin_phone'
>;
type PassengerFacts = Pick<
	Passenger,
	'gender' | 'cnic' | 'passport_number' | 'passport_expiry' | 'date_of_birth'
> | null;

function ageOn(dob: string, on: string): number {
	const b = new Date(`${dob}T00:00:00Z`);
	const d = new Date(`${on}T00:00:00Z`);
	let age = d.getUTCFullYear() - b.getUTCFullYear();
	const beforeBirthday =
		d.getUTCMonth() < b.getUTCMonth() ||
		(d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate());
	if (beforeBirthday) age -= 1;
	return age;
}

export function travellerIssues(t: TravellerFacts, p: PassengerFacts): Issue[] {
	const out: Issue[] = [];
	const add = (key: string, text: string) => out.push({ key, text });

	if (!p) {
		add('profile', 'Passenger profile missing');
		return out;
	}
	if (!p.gender) add('gender', 'Gender not set');
	if (!p.cnic) add('cnic', 'CNIC missing');
	if (!p.date_of_birth) add('dob', 'Date of birth missing');
	else if (ageOn(p.date_of_birth, HAJJ_DAY) < MIN_HAJJ_AGE)
		add('age', `Under ${MIN_HAJJ_AGE} — Hajj pilgrims must be ${MIN_HAJJ_AGE}+`);

	if (!p.passport_number) add('passport', 'Passport number missing');
	if (!p.passport_expiry) add('passport_expiry', 'Passport expiry missing');
	else if (p.passport_expiry < PASSPORT_VALID_UNTIL)
		add('passport_validity', 'Passport expires before 30 Nov 2027');

	if (!t.blood_group) add('blood', 'Blood group missing');
	if (p.gender === 'female' && !t.mehram_traveller_id) add('mehram', 'Mehram not set');
	if (!t.kin_name || !t.kin_phone) add('kin', 'Next of kin missing');
	return out;
}
