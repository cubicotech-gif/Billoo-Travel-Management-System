# Billoo Travel Management System

A complete travel agency management system built with React, TypeScript, and Supabase.

## Features

- **Query Management**: Track travel inquiries from initial contact to completion
- **Passenger Profiles**: Manage passenger information and travel history
- **Vendor Management**: Track suppliers, rates, and balances
- **Invoice & Payments**: Generate invoices and track payments
- **Document Management**: Upload and manage travel documents
- **Dashboard Analytics**: Real-time statistics and reports
- **Role-Based Access**: Admin, Manager, Agent, Finance, Viewer roles

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router
- **State**: Zustand

## Setup Instructions

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Configure Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key

3. **Run Database Migrations**
   - Go to Supabase SQL Editor
   - Run the SQL from `database/schema.sql`

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Netlify
1. Push code to GitHub
2. Import project in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables

## Default Login
- Email: admin@billootravel.com
- Password: admin123

## License

MIT
