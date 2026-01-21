# Billoo Travel Management System (Next.js + Supabase)

Modern travel agency management system built with Next.js 14, Supabase, and Tailwind CSS.

## 🚀 Tech Stack

- **Frontend Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Deployment:** Vercel
- **Charts:** Recharts

## ✨ Features

- ✅ **User Authentication** - Secure login with Supabase Auth
- ✅ **Dashboard** - Real-time statistics and analytics
- ✅ **Query Management** - Create, view, and manage travel queries
- ✅ **Status Tracking** - Track queries through different stages
- ✅ **Responsive Design** - Works on all devices
- ✅ **Auto-deployment** - Push to GitHub, deploys automatically

## 📦 Project Structure

```
nextjs-app/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx         # Login page (/)
│   │   ├── dashboard/       # Dashboard page
│   │   ├── queries/         # Queries page
│   │   ├── api/             # API routes
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Global styles
│   ├── components/          # Reusable components
│   │   └── Navbar.tsx
│   ├── lib/                 # Utilities
│   │   └── supabase.ts      # Supabase client
│   └── types/               # TypeScript types
│       └── database.types.ts
├── supabase/
│   └── schema.sql          # Database schema
├── public/                 # Static files
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── DEPLOYMENT_GUIDE.md     # Deployment instructions
```

## 🏃 Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone the repository

```bash
git clone <repo-url>
cd Billoo-Travel-Management-System/nextjs-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/schema.sql` in Supabase SQL Editor
3. Create an admin user in Supabase Authentication

### 4. Configure environment variables

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Login

- Email: `admin@billoo.com`
- Password: (what you set in Supabase)

## 🚀 Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete deployment instructions.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Click the button above
2. Connect your GitHub repository
3. Set root directory to `nextjs-app`
4. Add environment variables
5. Deploy!

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🗄️ Database Schema

### Tables

**users**
- Extends Supabase auth.users
- Stores profile information (full_name, role)

**queries**
- Travel queries and bookings
- Links to users table
- Tracks status and travel details

See `supabase/schema.sql` for complete schema.

## 🔐 Authentication

Uses Supabase Authentication with:
- Email/Password login
- Session management
- Protected routes
- Row Level Security (RLS)

## 🎨 Customization

### Colors

Edit `tailwind.config.js`:

```js
colors: {
  primary: {
    // Change these values
    500: '#3b82f6',
    600: '#2563eb',
    // ...
  }
}
```

### Branding

- Logo: Edit `src/app/page.tsx` and `src/components/Navbar.tsx`
- Title: Edit `src/app/layout.tsx` metadata

## 📊 API Routes

All API routes are in `src/app/api/`:

- `GET /api/queries` - Get all queries
- `POST /api/queries` - Create new query
- `PATCH /api/queries/[id]/status` - Update query status
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🔒 Security Features

- ✅ Row Level Security (RLS) enabled
- ✅ Server-side authentication
- ✅ Protected API routes
- ✅ Input validation
- ✅ SQL injection prevention (Supabase)
- ✅ XSS protection (React/Next.js)

## 🌐 Environment Variables

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=       # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Your Supabase anon key

# Optional
NEXT_PUBLIC_APP_URL=            # Your app URL (for production)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## 📄 License

Proprietary - Cubico Technologies

## 🆘 Support

For issues or questions:
- Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Open an issue on GitHub
- Contact: admin@billoo.com

## 🎯 Roadmap

- [ ] User management interface
- [ ] Passenger profiles
- [ ] Vendor management
- [ ] Invoice generation
- [ ] Email notifications
- [ ] Document uploads
- [ ] Advanced reporting
- [ ] Mobile app (React Native)

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)

---

**Version:** 2.0.0
**Last Updated:** 2026-01-21
**Status:** Production Ready ✅
