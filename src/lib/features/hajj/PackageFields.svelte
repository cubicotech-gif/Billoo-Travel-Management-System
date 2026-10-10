<script lang="ts">
	import { Select } from '$ui';
	import { formatAmount } from '$lib/money';
	import { availableOptions, availableRooms, baseCost } from './calc';
	import { formatSpan, packageLabel } from './catalogue';
	import { pickCatalogue, pickOption, pickPackage, type Selection } from './selection';
	import type { HajjCatalogue, HajjOptionCode, HajjPackage, HajjRoomType } from './types';

	// Price list → package → hotel option → room sharing, always kept valid
	// (see selection.ts). Reports the new selection upward; holds no state.
	interface Props {
		selection: Selection;
		packages: HajjPackage[];
		catalogues: HajjCatalogue[];
		onchange: (next: Selection) => void;
	}
	let { selection, packages, catalogues, onchange }: Props = $props();

	const catalogue = $derived(catalogues.find((c) => c.id === selection.catalogueId));
	const pkg = $derived(packages.find((p) => p.id === selection.packageId));

	const catalogueOptions = $derived(
		catalogues.map((c) => ({
			value: c.id,
			label: `${c.currency} price list${c.mina_category ? ` · Mina ${c.mina_category}` : ''}`
		}))
	);
	const packageOptions = $derived(
		packages
			.filter((p) => p.catalogue_id === selection.catalogueId)
			.map((p) => ({
				value: p.id,
				label: `${packageLabel(p)} · ${formatSpan(p.start_date, p.end_date)}`
			}))
	);
	const optionOptions = $derived(
		availableOptions(pkg).map((o) => ({ value: o, label: `Hotel option ${o}` }))
	);
	const roomOptions = $derived(
		availableRooms(pkg, selection.option).map((r) => {
			const c = baseCost(pkg, selection.option, r);
			const cur = catalogue?.currency ?? 'USD';
			return { value: r, label: c === null ? r : `${r} · ${formatAmount(c, cur)}` };
		})
	);

	const apply = (next: Selection | null) => next && onchange(next);
</script>

<div class="grid gap-3 sm:grid-cols-2">
	<Select
		label="Price list"
		value={selection.catalogueId}
		options={catalogueOptions}
		onchange={(v) => apply(pickCatalogue(packages, selection, v))}
	/>
	<Select
		label="Package"
		value={selection.packageId}
		options={packageOptions}
		onchange={(v) => apply(pickPackage(packages, selection, v))}
	/>
	<Select
		label="Hotel option"
		value={selection.option}
		options={optionOptions}
		onchange={(v) => apply(pickOption(packages, selection, v as HajjOptionCode))}
	/>
	<Select
		label="Room sharing (cost per person)"
		value={selection.room}
		options={roomOptions}
		onchange={(v) => apply({ ...selection, room: v as HajjRoomType })}
	/>
</div>
