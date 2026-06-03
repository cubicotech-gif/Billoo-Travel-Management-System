import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
	deleteDocument,
	listDocuments,
	uploadDocument,
	type Document,
	type DocumentEntity,
	type UploadArgs
} from './api';

const key = (entityType: DocumentEntity, entityId: string) =>
	['documents', entityType, entityId] as const;

export function useDocuments(entityType: DocumentEntity, entityId: string) {
	return createQuery({
		queryKey: key(entityType, entityId),
		queryFn: () => listDocuments(entityType, entityId)
	});
}

export function useUploadDocument(entityType: DocumentEntity, entityId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (args: UploadArgs) => uploadDocument(args),
		onSuccess: () => client.invalidateQueries({ queryKey: key(entityType, entityId) })
	});
}

export function useDeleteDocument(entityType: DocumentEntity, entityId: string) {
	const client = useQueryClient();
	return createMutation({
		mutationFn: (doc: Document) => deleteDocument(doc),
		onSuccess: () => client.invalidateQueries({ queryKey: key(entityType, entityId) })
	});
}
