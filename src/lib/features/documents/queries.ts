import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
	deleteDocument,
	listAllDocuments,
	listDocuments,
	updateDocument,
	uploadDocument,
	type Document,
	type DocumentEntity,
	type UploadArgs
} from './api';

const key = (entityType: DocumentEntity, entityId: string) =>
	['documents', entityType, entityId] as const;

const ALL_KEY = ['documents', 'all'] as const;

export function useDocuments(entityType: DocumentEntity, entityId: string) {
	return createQuery({
		queryKey: key(entityType, entityId),
		queryFn: () => listDocuments(entityType, entityId)
	});
}

export function useAllDocuments() {
	return createQuery({ queryKey: ALL_KEY, queryFn: listAllDocuments });
}

// Invalidate the entity's list *and* the board-wide ['documents','all'] cache
// (prefix match) so readiness badges on the dashboard/Operations stay live.
export function useUploadDocument(entityType: DocumentEntity, entityId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (args: UploadArgs) => uploadDocument(args),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: key(entityType, entityId) });
			client.invalidateQueries({ queryKey: ALL_KEY });
		}
	});
}

export function useUpdateDocument(entityType: DocumentEntity, entityId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: ({ id, patch }: { id: string; patch: { file_name?: string; expiry_date?: string | null } }) =>
			updateDocument(id, patch),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: key(entityType, entityId) });
			client.invalidateQueries({ queryKey: ALL_KEY });
		}
	});
}

export function useDeleteDocument(entityType: DocumentEntity, entityId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (doc: Document) => deleteDocument(doc),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: key(entityType, entityId) });
			client.invalidateQueries({ queryKey: ALL_KEY });
		}
	});
}
