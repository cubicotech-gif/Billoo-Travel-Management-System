/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// PWA service worker — makes the console installable and lets the app shell
// open instantly / offline. SvelteKit registers it automatically in production.
//
// What is cached: only the app itself (hashed JS/CSS chunks + static files) and
// the SPA index.html. Supabase traffic is cross-origin and never touched, so
// bookings, payments and finance figures are always live from the server.

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `billoo-${version}`;
const SHELL = '/';
const ASSETS = new Set([...build, ...files]);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll([...ASSETS, SHELL]);
			await sw.skipWaiting();
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== sw.location.origin) return;

	// Versioned build chunks + static files: cache-first (they never change
	// under the same URL).
	if (ASSETS.has(url.pathname)) {
		event.respondWith(
			(async () => {
				const cached = await caches.match(url.pathname);
				return cached ?? fetch(req);
			})()
		);
		return;
	}

	// Page navigations: network-first so a new deploy is picked up right away;
	// fall back to the cached SPA shell when offline (client routing takes over).
	if (req.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					const res = await fetch(req);
					if (res.ok) {
						const cache = await caches.open(CACHE);
						await cache.put(SHELL, res.clone());
					}
					return res;
				} catch {
					const cached = await caches.match(SHELL);
					return cached ?? Response.error();
				}
			})()
		);
	}
});
