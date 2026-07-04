import { supabase } from '$lib/supabase';
import type { Database } from '$lib/database.types';

export type OrgSettings = Database['public']['Tables']['org_settings']['Row'];
export type OrgSettingsUpdate = Database['public']['Tables']['org_settings']['Update'];

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

/** The single org-settings row (branding for documents). */
export async function getOrgSettings(): Promise<OrgSettings> {
	return unwrap(await supabase.from('org_settings').select('*').eq('id', 1).single());
}

export async function updateOrgSettings(patch: OrgSettingsUpdate): Promise<OrgSettings> {
	return unwrap<OrgSettings>(
		await supabase.from('org_settings').update(patch).eq('id', 1).select().single()
	);
}

/** Read a File as a data URL (base64) so the logo embeds directly in printed PDFs. */
export function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error('Could not read the image'));
		reader.readAsDataURL(file);
	});
}
