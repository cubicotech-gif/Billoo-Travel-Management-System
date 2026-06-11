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

**Post-booking is a status field on the Booking, not a column:**
Pending Payment · Payment Done — Check-in Pending · Check-in Done — Payment
Pending · Partial Payment · Completed. Completed bookings can be hidden from the
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
- **Payment & check-in status:** Pending Payment · Payment Done — Check-in
  Pending · Check-in Done — Payment Pending · Partial Payment · Completed.

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
