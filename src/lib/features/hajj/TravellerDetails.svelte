<script lang="ts">
	import { untrack } from 'svelte';
	import { AlertTriangle, CheckCircle2 } from 'lucide-svelte';
	import { Input, Select } from '$ui';
	import type { Passenger } from '$features/passengers/types';
	import { useUpdateHajjTraveller } from './queries';
	import { travellerIssues } from './readiness';
	import type { HajjTraveller, HajjTravellerUpdate } from './types';

	// Hajj application details for one traveller (what the booking form asks for),
	// with a checklist of what is still missing. Name, CNIC, passport, DOB and
	// gender live on the passenger profile and are only checked here.
	interface Props {
		queryId: string;
		traveller: HajjTraveller;
		passenger: Passenger | undefined;
		/** The other travellers in the family (for the mehram link). */
		others: { id: string; name: string }[];
	}
	let { queryId, traveller, passenger, others }: Props = $props();

	const update = untrack(() => useUpdateHajjTraveller(queryId));
	const save = (patch: HajjTravellerUpdate) => $update.mutate({ id: traveller.id, patch });

	const issues = $derived(travellerIssues(traveller, passenger ?? null));

	const yesNo = [
		{ value: '', label: '—' },
		{ value: 'yes', label: 'Yes' },
		{ value: 'no', label: 'No' }
	];
	const triState = (v: boolean | null | undefined) => (v == null ? '' : v ? 'yes' : 'no');
	const fromTri = (v: string) => (v === '' ? null : v === 'yes');
	const text = (e: Event) => ((e.currentTarget as HTMLInputElement).value.trim() || null);

	const bloodGroups = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({
		value: v,
		label: v || '—'
	}));
	const marital = ['', 'Single', 'Married', 'Widowed', 'Divorced'].map((v) => ({ value: v, label: v || '—' }));
	const fiqah = ['', 'Hanafi', 'Shafi’i', 'Maliki', 'Hanbali', 'Other'].map((v) => ({ value: v, label: v || '—' }));
	const mehramOptions = $derived([
		{ value: '', label: '— none —' },
		...others.map((o) => ({ value: o.id, label: o.name }))
	]);
</script>

<div class="space-y-4">
	{#if issues.length}
		<ul class="flex flex-wrap gap-1.5">
			{#each issues as i (i.key)}
				<li class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
					<AlertTriangle class="h-3 w-3" /> {i.text}
				</li>
			{/each}
		</ul>
		<p class="text-[11px] text-slate-400">
			Name, CNIC, passport, date of birth and gender are edited on the passenger’s profile.
		</p>
	{:else}
		<p class="inline-flex items-center gap-1 text-xs font-medium text-green-600">
			<CheckCircle2 class="h-3.5 w-3.5" /> Ready for booking
		</p>
	{/if}

	<div class="grid gap-3 sm:grid-cols-3">
		<Select label="Marital status" value={traveller.marital_status ?? ''} options={marital} onchange={(v) => save({ marital_status: v || null })} />
		<Select label="Blood group" value={traveller.blood_group ?? ''} options={bloodGroups} onchange={(v) => save({ blood_group: (v || null) as HajjTravellerUpdate['blood_group'] })} />
		<Select label="Fiqah" value={traveller.fiqah ?? ''} options={fiqah} onchange={(v) => save({ fiqah: v || null })} />
		<Input label="Profession" value={traveller.profession ?? ''} onblur={(e) => save({ profession: text(e) })} />
		<Select label="Performed Hajj in last 5 years?" value={triState(traveller.performed_hajj_5y)} options={yesNo} onchange={(v) => save({ performed_hajj_5y: fromTri(v) })} />
		<Select label="Hajj-e-Badal?" value={triState(traveller.hajj_e_badal)} options={yesNo} onchange={(v) => save({ hajj_e_badal: fromTri(v) })} />
		<Select label="Perform Hajj as a group worker?" value={triState(traveller.group_worker)} options={yesNo} onchange={(v) => save({ group_worker: fromTri(v) })} />
		<Select label="Diabetic patient?" value={triState(traveller.is_diabetic)} options={yesNo} onchange={(v) => save({ is_diabetic: fromTri(v) })} />
		<Select label="Smoker?" value={triState(traveller.is_smoker)} options={yesNo} onchange={(v) => save({ is_smoker: fromTri(v) })} />
	</div>

	<div>
		<h5 class="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Mehram</h5>
		<div class="grid gap-3 sm:grid-cols-2">
			<Select label="Mehram (a traveller on this quote)" value={traveller.mehram_traveller_id ?? ''} options={mehramOptions} onchange={(v) => save({ mehram_traveller_id: v || null })} />
			<Input label="Relation" value={traveller.mehram_relation ?? ''} placeholder="e.g. husband, father" onblur={(e) => save({ mehram_relation: text(e) })} />
		</div>
	</div>

	<div>
		<h5 class="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Next of kin / nominee</h5>
		<div class="grid gap-3 sm:grid-cols-4">
			<Input label="Name" value={traveller.kin_name ?? ''} onblur={(e) => save({ kin_name: text(e) })} />
			<Input label="Contact no." value={traveller.kin_phone ?? ''} onblur={(e) => save({ kin_phone: text(e) })} />
			<Input label="CNIC" value={traveller.kin_cnic ?? ''} onblur={(e) => save({ kin_cnic: text(e) })} />
			<Input label="Relation" value={traveller.kin_relation ?? ''} onblur={(e) => save({ kin_relation: text(e) })} />
		</div>
	</div>
</div>
