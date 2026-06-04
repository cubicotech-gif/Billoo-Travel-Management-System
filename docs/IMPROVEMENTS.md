# Billoo Travel — Experience & Feature Upgrade (backlog)

> Stack note: this portal is the **SvelteKit** rebuild (Svelte 5, Supabase,
> Tailwind, Vitest), not the old Next.js/React app. The items below are adapted
> to that stack. Supabase Storage + RLS for docs; PDFs generated client-side.

## Core principle
The system should **produce artifacts and reuse data it already has** — not add
more empty fields. Richness = the system doing work for the user.

## Workstreams

### 1. Passenger profile + persistent document vault
- Per-passenger document vault (Supabase Storage), types: passport, CNIC, visa,
  photo, vaccination, mahram/relationship, other. Each: file, type, issue date,
  **expiry date**, uploaded_at.
- **Expiry alerts**: passport/visa within 6 months flagged prominently on the
  profile and on any query/booking including that passenger.
- **Returning-customer reuse**: search by name/WhatsApp/passport; selecting pulls
  saved profile + documents into the new query (no re-entry).
- Booking history on the profile.

### 2. Stage-specific views (kill the repeated generic block)
Each stage gets a purpose-built working surface (query record + timeline stay
separate): Enquiry (intake) · Quotation (builder) · Follow-up (outreach log) ·
Confirmed/Booked (lock + deposit + voucher) · Documentation (vault checklist) ·
Payment (schedule + receipts) · Travel (manifest/vouchers) · Completed (archive).

### 3. Booking confirmation & completion experience
- Completion checklist (deposit received, services locked, docs present); block/
  flag if missing.
- **Branded confirmation/voucher PDF** (booking ref, pax, trip, services, payment
  summary, contact) with **Send on WhatsApp** + download; mark sent (green tick).
- Short client confirmation summary to acknowledge (names, trip, passport/visa).

### 4. WhatsApp-first contact
- WhatsApp number as primary contact (phone secondary/optional).
- **Click-to-chat** (`https://wa.me/<number>`) everywhere a contact appears.
- Templated stage messages (quote sent, deposit reminder, confirmed, doc request,
  balance due) pre-filled, one-tap send.

### 5. Richer query header (fix "blank/not rich")
- Rich summary header: client + WhatsApp, trip type, pax, est. value, source,
  owner, stage, **days-in-stage**.
- Progressive disclosure: empty fields collapse to quiet "+ Add ___", never a
  wall of blank inputs.
- Completion indicators ("Documents 2/4", "Deposit pending").

## Cross-cutting
- Auto booking reference (e.g. `BLO-2026-0142`).
- Stage aging / stuck-deal alerts (configurable per stage).
- Payment schedule (deposit + balance, due dates, reminders, per-payment PDF
  receipt) — not a single paid/unpaid flag.
- Group / manifest support (multiple pax per booking, manifest + rooming list,
  group docs).
- Activity log: every status change, upload, payment, message auto-logged.

## Immediate priorities (this round)
1. **P1 fixes + de-dupe** — SAR formatting, airline rates re-wired, remove the
   duplicate legacy Services block.
2. **Booking ↔ docs detail** — carry hotel dates + room types into the booking;
   show on voucher/itinerary; guard duplicate bookings.
3. **Editable quotations** — reopen a saved quote into the builder.
