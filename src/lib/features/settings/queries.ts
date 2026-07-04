import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { getOrgSettings, updateOrgSettings, type OrgSettingsUpdate } from './api';

const KEY = ['org-settings'] as const;

export function useOrgSettings() {
	return createQuery({ queryKey: KEY, queryFn: getOrgSettings });
}

export function useUpdateOrgSettings() {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (patch: OrgSettingsUpdate) => updateOrgSettings(patch),
		onSuccess: () => client.invalidateQueries({ queryKey: KEY })
	});
}
