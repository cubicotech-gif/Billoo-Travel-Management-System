import { describe, expect, it } from 'vitest';
import { travellerIssues } from './readiness';

const complete = {
	traveller: {
		blood_group: 'O+',
		mehram_traveller_id: null,
		kin_name: 'Ali',
		kin_phone: '0300'
	} as const,
	passenger: {
		gender: 'male',
		cnic: '42101-1234567-1',
		passport_number: 'AB1234567',
		passport_expiry: '2030-01-01',
		date_of_birth: '1980-03-04'
	} as const
};

const keys = (t: object, p: object | null) =>
	travellerIssues(
		{ ...complete.traveller, ...t } as never,
		p === null ? null : ({ ...complete.passenger, ...p } as never)
	).map((i) => i.key);

describe('travellerIssues', () => {
	it('is empty for a fully captured man', () => {
		expect(keys({}, {})).toEqual([]);
	});

	it('flags a missing passenger profile and stops there', () => {
		expect(keys({}, null)).toEqual(['profile']);
	});

	it('flags the Hajj details the booking form needs', () => {
		expect(keys({ blood_group: null, kin_name: null }, {})).toEqual(['blood', 'kin']);
		expect(keys({ kin_phone: '' }, {})).toEqual(['kin']);
	});

	it('requires a mehram for a woman, and only for a woman', () => {
		expect(keys({}, { gender: 'female' })).toEqual(['mehram']);
		expect(keys({ mehram_traveller_id: 't1' }, { gender: 'female' })).toEqual([]);
		expect(keys({}, { gender: 'male' })).toEqual([]);
	});

	it('checks the passport is valid until 30 Nov 2027', () => {
		expect(keys({}, { passport_expiry: '2027-11-29' })).toEqual(['passport_validity']);
		expect(keys({}, { passport_expiry: '2027-11-30' })).toEqual([]);
		expect(keys({}, { passport_expiry: null })).toEqual(['passport_expiry']);
		expect(keys({}, { passport_number: null })).toEqual(['passport']);
	});

	it('flags a pilgrim under 12 on the Hajj dates', () => {
		expect(keys({}, { date_of_birth: '2016-06-01' })).toEqual(['age']); // 10
		expect(keys({}, { date_of_birth: '2015-05-14' })).toEqual([]); // turns 12 the day before Hajj
		expect(keys({}, { date_of_birth: '2015-05-16' })).toEqual(['age']); // turns 12 the day after
		expect(keys({}, { date_of_birth: null })).toEqual(['dob']);
	});

	it('flags missing identity fields', () => {
		expect(keys({}, { cnic: null, gender: null })).toEqual(['gender', 'cnic']);
	});
});
