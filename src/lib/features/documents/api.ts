import { supabase } from '$lib/supabase';
import type { Database, DocumentType } from '$lib/database.types';

export type Document = Database['public']['Tables']['documents']['Row'];
export type { DocumentType };
export type DocumentEntity = Document['entity_type'];

/** Passenger identity/eligibility docs (the reusable vault). */
export const PASSENGER_DOCUMENT_TYPES: DocumentType[] = [
	'passport',
	'cnic',
	'visa',
	'photo',
	'vaccination',
	'mahram',
	'other'
];

/** Booking/trip docs attached to a query. */
export const QUERY_DOCUMENT_TYPES: DocumentType[] = [
	'ticket',
	'voucher',
	'invoice',
	'receipt',
	'passport',
	'visa',
	'other'
];

export const DOCUMENT_TYPES: DocumentType[] = PASSENGER_DOCUMENT_TYPES;

/** Document types that carry a meaningful expiry (eligibility-critical). */
export const EXPIRABLE_TYPES: DocumentType[] = ['passport', 'visa', 'vaccination'];

export type ExpiryStatus = 'expired' | 'soon' | 'ok';

/** 'soon' = within 6 months — the Hajj/Umrah passport-validity rule. */
export function expiryStatus(date: string | null): ExpiryStatus | null {
	if (!date) return null;
	const days = (new Date(date).getTime() - Date.now()) / 86_400_000;
	if (days < 0) return 'expired';
	if (days < 183) return 'soon';
	return 'ok';
}

const BUCKET = 'documents';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
	if (result.error) throw new Error(result.error.message);
	if (result.data === null) throw new Error('No data returned');
	return result.data;
}

export async function listDocuments(
	entityType: DocumentEntity,
	entityId: string
): Promise<Document[]> {
	return unwrap(
		await supabase
			.from('documents')
			.select('*')
			.eq('entity_type', entityType)
			.eq('entity_id', entityId)
			.order('created_at', { ascending: false })
	);
}

/** Every document, for board-wide readiness checks (avoids per-card fetches). */
export async function listAllDocuments(): Promise<Document[]> {
	return unwrap(await supabase.from('documents').select('*'));
}

export interface UploadArgs {
	file: File;
	entityType: DocumentEntity;
	entityId: string;
	documentType: DocumentType;
	expiryDate?: string | null;
}

/** Upload to Storage (private bucket) then record the metadata row. */
export async function uploadDocument(args: UploadArgs): Promise<Document> {
	const safeName = args.file.name.replace(/[^\w.-]+/g, '_');
	const path = `${args.entityType}/${args.entityId}/${Date.now()}_${safeName}`;

	const up = await supabase.storage.from(BUCKET).upload(path, args.file, { upsert: false });
	if (up.error) throw new Error(up.error.message);

	return unwrap<Document>(
		await supabase
			.from('documents')
			.insert({
				entity_type: args.entityType,
				entity_id: args.entityId,
				document_type: args.documentType,
				file_name: args.file.name,
				file_url: path,
				file_size: args.file.size,
				mime_type: args.file.type || null,
				expiry_date: args.expiryDate || null
			})
			.select()
			.single()
	);
}

/** Short-lived signed URL for viewing/downloading a private file. */
export async function signedUrl(path: string): Promise<string> {
	const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
	if (error) throw new Error(error.message);
	return data.signedUrl;
}

export async function deleteDocument(doc: Document): Promise<void> {
	await supabase.storage.from(BUCKET).remove([doc.file_url]);
	const { error } = await supabase.from('documents').delete().eq('id', doc.id);
	if (error) throw new Error(error.message);
}
