# Billoo Travel — Product Specification

> This is the canonical product spec. The implementation should conform to this
> document. Architecture/conventions live in `CLAUDE.md`.

## 1. Overview

Every customer enquiry ("**query**") moves through a compact pipeline from first
contact to completed booking. Each query is attached to a **passenger profile**;
every quotation, booking, and uploaded document is recorded in that passenger's
history.

A package has four cost components: **Hotels, Transfer, Visa (all priced in
SAR)** and **Tickets (priced in PKR)**. A single **ROE (SAR→PKR)** converts the
SAR side into PKR for the final total. Rates come from a **daily-updated rate
database** maintained by an admin, with **cost and selling price set manually
per item**.

## 2. Core Entities

| Entity | Purpose |
|---|---|
| **Passenger** | The customer. Auto-created on their first query. Holds contact info + full history (queries, quotations, bookings, documents, payment status). |
| **Query (Lead)** | A single enquiry. Pipeline status, creating staff member, intake details, one or more quotations. |
| **Quotation** | A priced package proposal from the calculator. Multiple allowed per query. Stored as structured data + rendered WhatsApp text. |
| **Booking** | Created when a quotation is approved. Actual vendor costs, selling prices, auto profit/loss, generated documents, uploads. |
| **Rate Card (Daily Rates)** | Per-item **cost price + manually-set selling price**, tied to a vendor. Types: hotel, transfer, visa (SAR); airline (PKR). |
| **Vendor** | Supplier from whom each component is actually booked. |
| **Document** | Uploaded files (passenger + vendor docs), linked to a booking, surfaced on the passenger profile. |
| **Staff / User** | System users (e.g. Roohul, Danish, Maaz) used for attribution on every action. |

## 3. Pipeline (4 stages)

```
New Query  →  Working  ⇄  Quoted (Awaiting Client)
                              |
                    (client approves)
                              ↓
                          Booking   ── status: payment + check-in ──→ Completed
```

1. **New Query** — logged, not yet priced.
2. **Working** — building the quotation.
3. **Quoted (Awaiting Client)** — quotation sent, awaiting client reply.
4. **Booking** — vendor booking, documents, uploads.

**Transitions:** `New Query → Working`, `Working → Quoted`, `Quoted → Working`
(tweaks), `Quoted → Booking` (approved). Cancelled is a manual side-exit.

**Post-booking is a status field on the Booking, not a column.** Once a booking
is *marked complete* the status is driven automatically by money (recorded
payments vs the package total minus any discount) and the trip's final date,
with a manual override available:
Pending Payment (still building) · Payment Done — Check-in Left (paid, trip
ahead) · Payment Pending — Check-in Left (balance due, trip ahead) · Payment
Pending — Travel Done (trip over but still owed) · Completed (paid in full AND
the trip's final date has passed). Completed bookings can be hidden from the
active board.

## 4. Stage Detail

### Stage 1 — New Query (Intake)
- **Trigger:** WhatsApp, phone, or walk-in.
- **Passenger:** choose existing OR add new (auto-saved, account created).
- **Created by:** staff selector (Roohul / Danish / Maaz / …), recorded on the query.
- **Flexible capture — 3 modes, any combination** (structured fields not hard-required):
  - (a) Quick note — free text.
  - (b) Pasted plan — the customer's own WhatsApp plan.
  - (c) Structured fields — below.
- **Structured intake:** passenger name*, WhatsApp*, adults/children/infants,
  package type (Umrah/Tour/Leisure), total duration (days), nights in
  Makkah/Madinah, hotel/distance preference, client preferences, customer's own
  plan, quick note.
- **Initial response tracking:** Responded? · response text · initial quotation text.
- **Actions:** Save → New Query. Edit/delete. Forward to Working.

### Stage 2 — Working (Quotation Builder / Package Builder)
Reads from **Daily Rates**.
- **Currency:** Hotels/Transfer/Visa in **SAR**; Tickets in **PKR**; one **ROE (SAR→PKR)**.
- **Per-item pricing:** each rate item has a **cost** (vendor) and a **manual
  selling** price. Quotation uses selling; **margin (sell − cost) shown to staff**.
- **Smart auto-save (low-friction):** hotels, transfers, ticket fares and visa
  entered manually are saved to the rate database on quote save, **vendor-wise**
  and **per hotel room-type (occupancy)**. Fuzzy name matching prevents
  duplicates. Selecting a saved hotel auto-populates its most recent rates
  (overwritable; the new rates are saved too). Vendors typed inline are
  find-or-created. Each saved rate is **valid 3 days**; a one-click
  “Update today” on the Daily Rates page refreshes an item's rate.
- **Flexible itinerary (stays):** the itinerary is a free-ordered **sequence of
  stays** — each stay = city + hotel + check-in/out + nights + rooms. No fixed
  city order. **Dates chain**: a stay's check-in defaults to the previous stay's
  check-out but is **editable** (pin/override, with re-link); reorder re-chains
  automatically. Supports **split-stays** (one city
  across 2–3 hotels) and **return visits** (non-consecutive stays in the same
  city/hotel — never merged). Nights auto-calc; **total vs requested** shown.
- **Breakfast:** per stay — **none**, **included** (bundled/compulsory in the
  room rate: shown as “Breakfast Included”, no extra charge), or **separate**
  (charged **per person per night**, cost + sell). Persons default to room
  occupancy Σ(occupancy × qty) but can be **manually overridden** (e.g. breakfast
  for 2 of 4).
- **Hotels — SAR, per room per night:** Rooms from occupancy: `rooms = ceil(persons
  ÷ occupancy)`, editable. Nights from check-in/out (or enter nights → dates,
  default check-in = today + 1 month). `hotel = room rate × nights × rooms`.
- **Transfer — SAR, per vehicle:** `transfer = vehicle rate × vehicles`.
- **Visa — SAR:** `persons = adults + children + infants` (infant = adult rate);
  `visa = rate × persons`.
- **Tickets — PKR (no ROE):** adult fare from rates; child & infant entered
  manually. `tickets = adult×adults + child×children + infant×infants`.
- **Total:**
  ```
  SAR subtotal (sell) = hotels + transfer + visa
  Package total (PKR) = SAR subtotal × ROE + tickets (PKR)
  Profit (PKR)        = total sell − total cost   (same formula on cost prices)
  ```
- **Per-person:** *Simple* = total ÷ (adults + children [+ infants]). *Advanced*
  = shared costs (hotels, transfers) ÷ adults, while children are charged only
  for the items they actually use (visa, tickets) at their own rates — an
  editable breakdown picks which buckets children share.
- **Output:** auto total → WhatsApp template (copy-paste) → save to passenger
  history. "Add another quotation" → alternatives, each saved. Edit/delete per
  quotation (drafts: hard delete; sent: edit = new version, delete = archive).

### Stage 3 — Quoted (Awaiting Client)
- Quotation shared, awaiting decision. Changes → back to Working. Approve → Booking.
- Every quotation is saved, so staff always see what was offered.

### Stage 4 — Booking
- Approved quotation **auto-populates** the booking; editable (actuals can differ).
- Per component select **actual vendor** + record **cost** + **selling** → auto
  profit/loss per item and overall.
- **Auto-generate:** Voucher (PDF) + Itinerary (PDF), saved to passenger history.
- **Document uploads:** passenger docs (passports, tickets) + vendor docs
  (receipts, vouchers). Attach to booking, appear on passenger profile.
  Add/replace/delete.
- **Per-service proof:** mark each service booked, then either upload a new
  proof/voucher OR link a document already filed (query docs or the passenger
  vault) — the linked doc satisfies the proof for that service.
- **Payments:** record client payments (amount + date) from the booking — they
  reduce the balance and surface on the passenger profile. An order-level
  discount lowers what's owed. Edit / delete / remove any payment.
- **Payment & check-in status (auto, with override):** Pending Payment · Payment
  Done — Check-in Left · Payment Pending — Check-in Left · Payment Pending —
  Travel Done · Completed. The system files the booking into the right bucket on
  every payment/date change; staff can pin a manual override.

## 5. Daily Rates / Admin Module
- Dedicated admin page, updated each morning.
- Per item record vendor(s), **cost**, **manual selling** (margin = sell − cost,
  no % markup). Hotels/transfer/visa in SAR; airlines in PKR.
- Quotations use that day's rates. Ad-hoc inline custom items allowed (saved).
- Full add/edit/delete on rate items and vendors.

## 6. Passenger CRM / History
- Auto-created on first query. Records all queries, quotations, bookings,
  documents, payment status. New query → existing or new passenger.
  Edit/delete (soft-delete to preserve history).

## 7. Cross-Cutting

| Entity | Add | Edit | Delete |
|---|---|---|---|
| Query | ✓ | ✓ | ✓ (soft) |
| Quotation | ✓ | draft: direct · sent: new version | archive |
| Booking | from approved quote | ✓ | ✓ (soft) |
| Passenger | ✓ | ✓ | ✓ (soft) |
| Rate item / Vendor | ✓ | ✓ | ✓ |
| Document | ✓ | replace | ✓ |

- **History integrity:** sent quotations & bookings are version-preserved;
  "delete" = soft-delete/archive (recoverable). Drafts hard-delete.
- **Staff attribution:** every query records its creator; ideally each stage action.
- **Templates:** WhatsApp quotation, voucher PDF, itinerary PDF.

## Build sequence

A. Pipeline → 4 stages + booking status (done first).
B. Vendors + Daily Rates admin.
C. Passenger CRM + New Query intake (3 modes, staff selector).
D. Quotation calculator + WhatsApp template + multi-quote history.
E. Booking (actuals, profit/loss, payment/check-in).
F. Documents (uploads) + voucher/itinerary PDFs.

## 8. Hajj Packages

Hajj is a package type that goes through the **same query intake and the same 4
stages**, but its **Working** stage uses a **Hajj package builder** instead of
the stay-based Umrah quote builder. Hajj sells from a **fixed catalogue** of
dated, vendor-priced packages.

### Catalogue
- The vendor publishes **two separate price lists — USD and SAR** (2027/1448:
  UB001–UB026 in each). They are kept as **two catalogues and never merged**,
  even where the products look the same.
- A package has a fixed itinerary (day-by-day, AD + Hijri dates), so a package
  *is* a departure. It has **hotel Option A / Option B** (some packages have only
  one) and a **per-person price per room sharing** (Quad / Triple / Double, and
  "Sharing" on a few). Prices are **our cost**; the selling price is set per quote.
- The vendor pays a **fixed commission per person, per package** (same for every
  room type and add-on). Not in the brochures — entered later; money we **receive
  later** from the vendor. Stored on the package, in the catalogue's currency.
- Source data lives in `scripts/hajj-2027/data.mjs`; `node scripts/hajj-2027/generate.mjs`
  writes `database/seeds/hajj-2027-catalogue.sql` and `docs/hajj-2027-price-check.md`.

### Travellers
- **One query per family**; **one traveller row per person**, each linked to a
  passenger profile (own passport, documents, price). Travellers are linked as a
  family. Everyone is 12+ (no child/infant pricing).
- By default the whole family takes the same package, option and room type, but
  any traveller may take a **different package or hotel option**.
- Currency follows the traveller's package. A mixed family shows **two totals**:
  SAR → PKR at the ROE (default **77**, editable per quote) and USD unconverted.

### Pricing and add-ons
- The package price is the base. Add-ons **only add** to it (nothing is removed).
  The base price may be sold below cost; **add-ons may be sold higher, never lower**
  than their cost.
- Add-ons (see `hajj_addons`): Kaaba view, Aziziya family room, extra Medinah
  nights, airport taxis, **GMC private vehicle**, Qurbani assistance, Mina tent
  upgrades (5-person, 8-person, deluxe family), business-class upgrade. Tent and
  business-class prices are supplied by us (not in the brochures).
- **Tickets** are not in any package. We sell them ourselves in PKR (adult fares,
  our own cost and selling price), as for Umrah.
- **GMC pool:** one vehicle costs a fixed amount (max 6 people) and its cost is
  **divided by the headcount** in the vehicle. A family that takes GMC shares one
  vehicle among its own members only; single travellers pool **across clients and
  across packages** (Mashaer days are the same for everyone). A quote shows the
  full vehicle price; the final split is settled at booking, counting only
  travellers in the Booking stage. Vehicles may mix travellers whose packages
  are in different currencies.
- **Tent upgrades** are charged **per person** (e.g. a 5-person tent surcharge is
  paid by each of the 5 travellers).

### Output
- A designed **printable proposal (PDF)** and a **WhatsApp text** version, under
  **our own brand only** — no vendor name, no photos. Package details come from
  the catalogue; terms and the 50/50 payment plan are included.
- Payment plan: **50% at booking, 50% by 15 November 2026**; cancellation before
  the cut-off forfeits a US$350 per person service charge (per the vendor).

### Hajj traveller data (beyond a normal passenger)
Mehram (and the lady's mehram link), blood group, fiqah, Hajj performed in the
last 5 years, Hajj-e-Badal, group worker, nominee / emergency contact,
diabetic / smoker, profession. Passport must be valid to 30 Nov 2027.

### Booking, money and commission
- **Finance bridge:** payments, finance, receivables and the booking lifecycle are PKR-based and read
  `queries.selling_price` and a `bookings` row. A Hajj quote writes those (SAR × ROE + tickets + USD ×
  a **USD → PKR rate** held on the quote), so they work unchanged. USD is only counted once that rate
  is set (the builder warns). The client-facing proposal still shows USD unconverted. Trip dates are
  the earliest start / latest end of the travellers' packages. The `bookings` row is created on
  entering the Booking stage.
- **Commission** is a fixed amount per person per package (`hajj_packages.commission_per_person`,
  edited on the **Hajj** page). Books carry **cost net of commission**, so profit includes it. What
  the vendor has actually paid is recorded as receipts; outstanding = expected (confirmed travellers)
  − received, per currency.
- **GMC settlement:** when a query enters (or leaves) the Booking stage, the shared GMC is settled
  across all confirmed clients — a family on its own vehicle, singles pooling across clients and
  packages in confirmation order, `capacity` (6) per vehicle, USD and SAR pools apart. The result is
  stored on the line (`pool_cost / pool_sharers / pool_vehicle`) and every affected booking is
  re-synced. A quote that isn't confirmed never lowers another client's price.
- **Payment schedule:** entering Booking creates the 50/50 schedule (50% due that day, 50% due
  15 Nov 2026). While nothing is paid and it is still the auto-generated plan, it follows the total
  (e.g. when the GMC share drops); once a payment is recorded it is left alone.
- **Traveller details** (mehram, blood group, fiqah, next of kin, …) are captured per traveller, with a
  readiness checklist (passport valid to 30 Nov 2027, age 12+, mehram for women, …).

### Documents
- Hajj queries get Hajj versions of the **invoice**, **voucher** (booking confirmation) and
  **itinerary** at the same URLs (`/queries/[id]/invoice|voucher|itinerary`); other queries keep the
  regular ones. The payment **receipt** is already payment-based and needs no change.
- All three are client-facing: our brand only, **no vendor name or package code**, selling prices only
  (never cost, margin or commission). The itinerary is price-free.
- **Invoice:** each pilgrim's package and add-ons, SAR → PKR at the ROE and USD → PKR at the quote's
  USD rate (USD charges are listed separately until a rate is set), then discount, payments received,
  balance and the upcoming 50/50 instalments.
- **Voucher:** pilgrims with passport numbers, hotels and nights per package, Mina camp category,
  additional services, inclusions, optional day-by-day and total payable, travel notes.
- **Itinerary:** pilgrims and the day-by-day schedule per package, with travel notes.

### Build sequence (Hajj)
1. Catalogue tables + 2027 seed (`20260637_hajj_catalogue.sql`, done).
2. Hajj package builder in the Working stage (`20260638_hajj_quote.sql`, done): one quote per
   query, one traveller per person, per-traveller package / option / room / add-ons, totals per
   currency. Quoted and Booking show a read-only summary for now.
3. Proposal document (print/PDF + WhatsApp) — done: `/queries/[id]/hajj-proposal`. Selling prices
   only, our brand only; client wording lives in `src/lib/features/hajj/content.ts`.
4. Booking bridge, GMC settlement across clients, commission, 50/50 schedule, traveller details
   (`20260639_hajj_booking.sql`, done).
5. Hajj invoice, voucher and itinerary (done). Still open: vendor payments (what we owe the vendor);
   per-vendor commission accounts.
