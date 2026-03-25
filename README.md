# Billoo Travel Management System

A travel agency management system built with React, TypeScript, and Supabase.

## Features

- **10-Stage Query Workflow**: Track travel inquiries from initial contact through proposal, booking, delivery, to completion
- **Proposal System**: Versioned proposals with customer response tracking and WhatsApp quotation generation
- **Vendor Management**: Supplier profiles, ledger, accounting, and payment tracking with multi-currency support
- **Passenger Profiles**: Passport details, document expiry alerts, and travel history
- **Invoice & Payments**: Invoice generation with line items and payment tracking
- **Document Management**: Upload and manage travel documents with expiry alerts
- **Communication Log**: Track calls, emails, SMS, and WhatsApp per query
- **Dashboard Analytics**: Real-time statistics, trends, and reporting with charts
- **Multi-Currency**: PKR, SAR, USD, AED, EUR, GBP with conversion
- **Role-Based Access**: Admin, Manager, Agent, Finance, Viewer roles
- **Export**: Export queries, passengers, vendors, and invoices to Excel/PDF

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Charts**: Recharts
- **Routing**: React Router v6
- **Icons**: Lucide React

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key

3. **Run database schema**
   - Go to Supabase SQL Editor
   - Run `database/complete-schema.sql`

4. **Start dev server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Deployment (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Project Structure

```
src/
  pages/           12 page components (Dashboard, Queries, Vendors, etc.)
  components/      60+ reusable components
    queries/       Query workflow components (stages, booking, proposals)
  lib/             Utilities & API functions
    api/           Supabase API functions (proposals, booking)
  store/           Zustand auth store
  types/           TypeScript type definitions
database/
  complete-schema.sql   Single authoritative database schema (17 tables)
supabase/
  migrations/      Incremental migration history
```

## License

MIT
