# Billoo Travel Management System

Internal console for a travel agency that runs **Umrah** bookings. It tracks
customer **queries** through a booking pipeline and manages the **finances**
(multi-currency costs, selling prices, vendor payments, profit).

This is a **ground-up SvelteKit rewrite** (v2). The previous React/Vite app was
discarded. The Postgres data model in `database/` was kept because it is sound.

## Stack

- **SvelteKit** in **SPA mode** — `adapter-static` with an `index.html`
  fallback, `ssr = false`. No server runtime; deploys as static files.
- **Svelte 5** (runes: `$state`, `$derived`, `$props`, `$effect`).
- **TypeScript strict** (+ `noUncheckedIndexedAccess`).
- **Supabase** — Postgres, Auth, Realtime, Storage. Client in `src/lib/supabase.ts`.
- **TanStack Query (svelte)** — all server state. Hooks live per feature.
- **Tailwind** — styling. Small in-house UI kit in `src/lib/ui`.
- **dinero.js** — money. See the money rule below.
- **Vitest** (unit) + **Playwright** (e2e, to come).

## Money rule (non-negotiable)

All money math goes through `src/lib/money.ts`. **Never** add/multiply money
with raw JS numbers — floats drop pennies. Build a `Money` with `money(amount,
currency)`, operate with `add`/`subtract`/`multiply`/`sum`, convert at the edges
with `toNumber()` / `formatMoney()`. Postgres money columns are `NUMERIC`.

## Project layout

```
src/
  app.html, app.css, app.d.ts
  lib/
    supabase.ts            # typed Supabase client
    database.types.ts      # hand-maintained schema types (regen via supabase gen types)
    money.ts (+ test)      # the money layer
    query-client.ts        # TanStack Query client factory
    stores/auth.svelte.ts  # reactive auth (runes)
    ui/                    # Button, Card, Badge, ...
    features/<name>/       # one folder per domain area
      api.ts               #   typed Supabase calls
      queries.ts           #   TanStack Query hooks
      types.ts             #   row/insert/update types
      workflow.ts          #   (queries) the 10-stage lifecycle
  routes/
    +layout.ts             # ssr=false (SPA)
    +layout.svelte         # shell: query provider, auth guard, nav
    +page.svelte           # dashboard
    login/  queries/  passengers/  vendors/  finance/
```

Path aliases: `$features` → `src/lib/features`, `$ui` → `src/lib/ui`,
`$lib` → `src/lib` (built in).

## Product spec

The canonical product spec lives in **`docs/SPEC.md`** — read it for the full
domain (entities, pipeline, quotation calculator, daily rates, CRM, bookings,
documents). Build sequence is tracked there.

## The 4-stage query pipeline

Defined in `src/lib/features/queries/workflow.ts`:
**New Query → Working → Quoted → Booking** (Cancelled is a manual side-exit).
`Completed` is NOT a stage — it's a **booking status** (payment/check-in) on a
query in the Booking stage. The DB `queries.status` CHECK constraint is the
source of truth. Money is SAR for Hotels/Transfer/Visa and PKR for Tickets,
combined via a daily ROE — see `docs/SPEC.md`.

## Commands

| | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build (static) |
| `npm run check` | svelte-check + tsc (must be clean) |
| `npm run lint` | eslint (must be clean) |
| `npm test` | vitest unit tests |
| `npm run format` | prettier |

**Before committing:** `npm run check && npm run lint && npm test` should all pass.

## Environment

Copy `.env.example` → `.env` and set `PUBLIC_SUPABASE_URL` /
`PUBLIC_SUPABASE_ANON_KEY`. Read at runtime via `$env/dynamic/public`.

## Roadmap

- **Phase 0/1 (done):** SvelteKit shell, money layer, Queries wired end-to-end.
- **Phase 2 (in progress):** full Queries detail + services, Passengers, Vendors, Finance.
- **Phase 3:** Realtime notifications + PWA + Web Push.
- **Phase 4:** squash migrations to one baseline, e2e tests, **re-enable auth**.

## Auth (temporarily disabled)

To build/test the whole system without login friction, auth is **off**: the
layout renders the app directly, there's no login route, and the DB is opened to
the `anon` role via `database/dev-open-access.sql`. The auth store still lives at
`src/lib/stores/auth.svelte.ts`. Re-enable in Phase 4 by restoring the layout
guard + a login route and running the REVERT block in `dev-open-access.sql`.

