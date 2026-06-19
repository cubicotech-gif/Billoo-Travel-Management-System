<script lang="ts">
	import { untrack } from 'svelte';
	import { Send, Trash2, MessageSquare } from 'lucide-svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { useReplies, useAddReply, useDeleteReply } from './queries';
	import type { Quotation } from '$features/quotations/types';

	// The Quoted-stage workspace: a chat log of everything that happens after we
	// send a quote — the client's replies, our notes, and any suggestions.
	let { queryId, latest }: { queryId: string; latest: Quotation | null } = $props();

	const replies = untrack(() => useReplies(queryId));
	const addReply = untrack(() => useAddReply(queryId));
	const deleteReply = untrack(() => useDeleteReply(queryId));

	let draft = $state('');

	function send() {
		const body = draft.trim();
		if (!body) return;
		$addReply.mutate(
			{ query_id: queryId, body, author: auth.user?.email ?? null },
			{ onSuccess: () => (draft = '') }
		);
	}

	function onKeydown(e: KeyboardEvent) {
		// Enter sends; Shift+Enter for a newline.
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function fmt(iso: string): string {
		return new Date(iso).toLocaleString(undefined, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function fmtDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<div class="flex h-[calc(100vh-14rem)] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
	<div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
		<div class="flex items-center gap-2">
			<MessageSquare class="h-4 w-4 text-brand-500" />
			<h2 class="text-sm font-semibold text-slate-700">Conversation</h2>
		</div>
		{#if latest}
			<span class="text-xs text-slate-400">
				Quote v{latest.version} sent {fmtDate(latest.created_at)}
			</span>
		{/if}
	</div>

	<!-- thread -->
	<div class="flex-1 space-y-2 overflow-y-auto px-4 py-3">
		{#if $replies.isLoading}
			<p class="text-sm text-slate-400">Loading…</p>
		{:else if ($replies.data ?? []).length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center text-sm text-slate-400">
				<MessageSquare class="mb-2 h-8 w-8 text-slate-200" />
				<p>No messages yet.</p>
				<p class="text-xs">Log the client's replies and any suggestions here after quoting.</p>
			</div>
		{:else}
			{#each $replies.data ?? [] as r (r.id)}
				<div class="group flex flex-col rounded-lg bg-slate-50 px-3 py-2">
					<div class="flex items-start justify-between gap-2">
						<p class="whitespace-pre-wrap text-sm text-slate-700">{r.body}</p>
						<button
							type="button"
							onclick={() => $deleteReply.mutate(r.id)}
							class="shrink-0 text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
							aria-label="Delete message"
						>
							<Trash2 class="h-3.5 w-3.5" />
						</button>
					</div>
					<span class="mt-1 text-[10px] text-slate-400">{fmt(r.created_at)}{r.author ? ` · ${r.author}` : ''}</span>
				</div>
			{/each}
		{/if}
	</div>

	<!-- composer -->
	<div class="border-t border-slate-100 p-3">
		<div class="flex items-end gap-2">
			<textarea
				bind:value={draft}
				onkeydown={onKeydown}
				rows="2"
				placeholder="Log a reply, note, or suggestion…  (Enter to send)"
				class="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
			></textarea>
			<button
				type="button"
				disabled={!draft.trim() || $addReply.isPending}
				onclick={send}
				class="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
			>
				<Send class="h-4 w-4" /> Send
			</button>
		</div>
	</div>
</div>
