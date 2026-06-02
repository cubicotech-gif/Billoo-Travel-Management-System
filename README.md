# Billoo Travel Management System

Internal console for managing **Umrah** travel **queries** and **finances**.
SvelteKit SPA backed by Supabase.

## Quick start

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key
npm run dev
```

Apply the database schema in `database/complete-schema.sql` to your Supabase
project (SQL editor), then create a user in Supabase Auth to log in.

## Scripts

- `npm run dev` — local dev server
- `npm run build` / `npm run preview` — production build (static) & preview
- `npm run check` — type & Svelte checks
- `npm run lint` / `npm run format` — lint & format
- `npm test` — unit tests

## Tech

SvelteKit (SPA, `adapter-static`) · Svelte 5 · TypeScript · Supabase ·
TanStack Query · Tailwind · dinero.js · Vitest.

See [`CLAUDE.md`](./CLAUDE.md) for architecture and conventions.
