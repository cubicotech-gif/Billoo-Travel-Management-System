# Project Structure - Travel Agency Management System

## Complete Folder Structure

```
travel-agency-system/
│
├── backend/                          # Node.js + Express API
│   ├── src/
│   │   ├── config/                  # Configuration files
│   │   │   ├── database.ts          # MySQL connection config
│   │   │   ├── jwt.ts               # JWT config
│   │   │   └── upload.ts            # File upload config
│   │   │
│   │   ├── controllers/             # Route controllers
│   │   │   ├── auth.controller.ts
│   │   │   ├── passenger.controller.ts
│   │   │   ├── query.controller.ts
│   │   │   ├── service.controller.ts
│   │   │   ├── vendor.controller.ts
│   │   │   ├── invoice.controller.ts
│   │   │   ├── payment.controller.ts
│   │   │   ├── activity.controller.ts
│   │   │   ├── attachment.controller.ts
│   │   │   ├── notification.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── report.controller.ts
│   │   │   └── settings.controller.ts
│   │   │
│   │   ├── middleware/              # Express middleware
│   │   │   ├── auth.middleware.ts   # JWT verification
│   │   │   ├── role.middleware.ts   # Role-based access
│   │   │   ├── upload.middleware.ts # File upload validation
│   │   │   ├── error.middleware.ts  # Error handling
│   │   │   └── logger.middleware.ts # Request logging
│   │   │
│   │   ├── models/                  # Database models
│   │   │   ├── User.model.ts
│   │   │   ├── Passenger.model.ts
│   │   │   ├── Query.model.ts
│   │   │   ├── ServiceItem.model.ts
│   │   │   ├── Vendor.model.ts
│   │   │   ├── Invoice.model.ts
│   │   │   ├── Payment.model.ts
│   │   │   ├── Activity.model.ts
│   │   │   ├── Attachment.model.ts
│   │   │   ├── Notification.model.ts
│   │   │   └── Setting.model.ts
│   │   │
│   │   ├── routes/                  # API routes
│   │   │   ├── index.ts             # Route aggregator
│   │   │   ├── auth.routes.ts
│   │   │   ├── passenger.routes.ts
│   │   │   ├── query.routes.ts
│   │   │   ├── service.routes.ts
│   │   │   ├── vendor.routes.ts
│   │   │   ├── invoice.routes.ts
│   │   │   ├── payment.routes.ts
│   │   │   ├── activity.routes.ts
│   │   │   ├── attachment.routes.ts
│   │   │   ├── notification.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── report.routes.ts
│   │   │   └── settings.routes.ts
│   │   │
│   │   ├── services/                # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── passenger.service.ts
│   │   │   ├── query.service.ts
│   │   │   ├── service.service.ts
│   │   │   ├── vendor.service.ts
│   │   │   ├── invoice.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── pdf.service.ts       # PDF generation (invoices/vouchers)
│   │   │   ├── email.service.ts     # Email sending
│   │   │   ├── whatsapp.service.ts  # WhatsApp integration
│   │   │   └── audit.service.ts     # Audit logging
│   │   │
│   │   ├── utils/                   # Utility functions
│   │   │   ├── response.util.ts     # Standard API responses
│   │   │   ├── validation.util.ts   # Input validation
│   │   │   ├── hash.util.ts         # Password hashing
│   │   │   ├── token.util.ts        # JWT token generation
│   │   │   ├── number.util.ts       # Auto-number generation
│   │   │   └── date.util.ts         # Date formatting
│   │   │
│   │   ├── validators/              # Request validators (Joi/Zod)
│   │   │   ├── auth.validator.ts
│   │   │   ├── passenger.validator.ts
│   │   │   ├── query.validator.ts
│   │   │   ├── service.validator.ts
│   │   │   ├── vendor.validator.ts
│   │   │   ├── invoice.validator.ts
│   │   │   └── payment.validator.ts
│   │   │
│   │   ├── jobs/                    # Scheduled jobs (node-cron)
│   │   │   ├── deadline-alerts.job.ts
│   │   │   ├── payment-reminders.job.ts
│   │   │   ├── checkin-alerts.job.ts
│   │   │   └── overdue-invoices.job.ts
│   │   │
│   │   ├── templates/               # PDF/Email templates
│   │   │   ├── invoice.template.ts
│   │   │   ├── voucher.template.ts
│   │   │   └── email.template.ts
│   │   │
│   │   ├── types/                   # TypeScript type definitions
│   │   │   ├── express.d.ts         # Express type extensions
│   │   │   ├── user.types.ts
│   │   │   ├── passenger.types.ts
│   │   │   ├── query.types.ts
│   │   │   └── common.types.ts
│   │   │
│   │   ├── database/                # Database setup
│   │   │   ├── migrations/          # SQL migration files
│   │   │   │   ├── 001_create_tables.sql
│   │   │   │   ├── 002_create_triggers.sql
│   │   │   │   ├── 003_create_views.sql
│   │   │   │   └── 004_seed_data.sql
│   │   │   └── connection.ts        # Database connection pool
│   │   │
│   │   ├── app.ts                   # Express app setup
│   │   └── server.ts                # Server entry point
│   │
│   ├── uploads/                     # File upload directory
│   │   ├── passports/
│   │   ├── visas/
│   │   ├── invoices/
│   │   ├── vouchers/
│   │   ├── receipts/
│   │   └── temp/
│   │
│   ├── logs/                        # Application logs
│   │   ├── error.log
│   │   ├── combined.log
│   │   └── access.log
│   │
│   ├── .env                         # Environment variables
│   ├── .env.example                 # Example env file
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json                # TypeScript config
│   └── nodemon.json                 # Development auto-reload
│
├── frontend/                        # React + TypeScript App
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── assets/
│   │       ├── logo.png
│   │       └── images/
│   │
│   ├── src/
│   │   ├── api/                     # API client
│   │   │   ├── axios.config.ts      # Axios instance
│   │   │   ├── auth.api.ts
│   │   │   ├── passenger.api.ts
│   │   │   ├── query.api.ts
│   │   │   ├── service.api.ts
│   │   │   ├── vendor.api.ts
│   │   │   ├── invoice.api.ts
│   │   │   ├── payment.api.ts
│   │   │   ├── dashboard.api.ts
│   │   │   └── report.api.ts
│   │   │
│   │   ├── components/              # Reusable components
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── DatePicker.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Loader.tsx
│   │   │   │   ├── Alert.tsx
│   │   │   │   └── Pagination.tsx
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Layout.tsx
│   │   │   │
│   │   │   ├── forms/
│   │   │   │   ├── PassengerForm.tsx
│   │   │   │   ├── QueryForm.tsx
│   │   │   │   ├── ServiceItemForm.tsx
│   │   │   │   ├── VendorForm.tsx
│   │   │   │   ├── InvoiceForm.tsx
│   │   │   │   └── PaymentForm.tsx
│   │   │   │
│   │   │   ├── query/
│   │   │   │   ├── QueryCard.tsx
│   │   │   │   ├── QueryKanban.tsx
│   │   │   │   ├── QueryList.tsx
│   │   │   │   ├── QueryDetails.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   └── PriorityBadge.tsx
│   │   │   │
│   │   │   ├── passenger/
│   │   │   │   ├── PassengerCard.tsx
│   │   │   │   ├── PassengerProfile.tsx
│   │   │   │   ├── PassengerHistory.tsx
│   │   │   │   └── PassengerDocuments.tsx
│   │   │   │
│   │   │   ├── vendor/
│   │   │   │   ├── VendorCard.tsx
│   │   │   │   ├── VendorDetails.tsx
│   │   │   │   └── VendorBalance.tsx
│   │   │   │
│   │   │   ├── invoice/
│   │   │   │   ├── InvoiceCard.tsx
│   │   │   │   ├── InvoicePreview.tsx
│   │   │   │   └── InvoiceStatus.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   ├── PipelineChart.tsx
│   │   │   │   └── QuickActions.tsx
│   │   │   │
│   │   │   └── notifications/
│   │   │       ├── NotificationBell.tsx
│   │   │       └── NotificationItem.tsx
│   │   │
│   │   ├── pages/                   # Page components
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── ForgotPassword.tsx
│   │   │   │   └── ResetPassword.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.tsx
│   │   │   │
│   │   │   ├── queries/
│   │   │   │   ├── QueryList.tsx
│   │   │   │   ├── QueryCreate.tsx
│   │   │   │   ├── QueryEdit.tsx
│   │   │   │   └── QueryDetails.tsx
│   │   │   │
│   │   │   ├── passengers/
│   │   │   │   ├── PassengerList.tsx
│   │   │   │   ├── PassengerCreate.tsx
│   │   │   │   ├── PassengerEdit.tsx
│   │   │   │   └── PassengerProfile.tsx
│   │   │   │
│   │   │   ├── vendors/
│   │   │   │   ├── VendorList.tsx
│   │   │   │   ├── VendorCreate.tsx
│   │   │   │   ├── VendorEdit.tsx
│   │   │   │   └── VendorDetails.tsx
│   │   │   │
│   │   │   ├── invoices/
│   │   │   │   ├── InvoiceList.tsx
│   │   │   │   ├── InvoiceCreate.tsx
│   │   │   │   └── InvoiceView.tsx
│   │   │   │
│   │   │   ├── payments/
│   │   │   │   ├── PaymentList.tsx
│   │   │   │   └── PaymentCreate.tsx
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── ReportDashboard.tsx
│   │   │   │   ├── ProfitLoss.tsx
│   │   │   │   ├── Receivables.tsx
│   │   │   │   ├── Payables.tsx
│   │   │   │   └── AgentPerformance.tsx
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── Settings.tsx
│   │   │       ├── UserManagement.tsx
│   │   │       └── Templates.tsx
│   │   │
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useQuery.ts
│   │   │   ├── usePassenger.ts
│   │   │   ├── useVendor.ts
│   │   │   ├── useInvoice.ts
│   │   │   ├── useNotifications.ts
│   │   │   └── useDebounce.ts
│   │   │
│   │   ├── store/                   # State management (Zustand)
│   │   │   ├── authStore.ts
│   │   │   ├── queryStore.ts
│   │   │   ├── passengerStore.ts
│   │   │   ├── vendorStore.ts
│   │   │   └── notificationStore.ts
│   │   │
│   │   ├── utils/                   # Frontend utilities
│   │   │   ├── formatters.ts        # Date, currency formatting
│   │   │   ├── validators.ts        # Form validation
│   │   │   ├── constants.ts         # App constants
│   │   │   └── helpers.ts           # Helper functions
│   │   │
│   │   ├── types/                   # TypeScript types
│   │   │   ├── user.types.ts
│   │   │   ├── passenger.types.ts
│   │   │   ├── query.types.ts
│   │   │   ├── vendor.types.ts
│   │   │   └── api.types.ts
│   │   │
│   │   ├── styles/                  # CSS/Tailwind config
│   │   │   ├── globals.css
│   │   │   └── tailwind.css
│   │   │
│   │   ├── App.tsx                  # Main App component
│   │   ├── main.tsx                 # Entry point
│   │   ├── router.tsx               # React Router setup
│   │   └── vite-env.d.ts           # Vite types
│   │
│   ├── .env                         # Environment variables
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts               # Vite config
│   ├── tailwind.config.js           # Tailwind CSS config
│   └── postcss.config.js
│
├── shared/                          # Shared code (types, utils)
│   └── types/
│       ├── user.types.ts
│       ├── passenger.types.ts
│       └── common.types.ts
│
├── docs/                            # Documentation
│   ├── API.md                       # API documentation
│   ├── DEPLOYMENT.md                # Deployment guide
│   └── CONTRIBUTING.md              # Contribution guide
│
├── scripts/                         # Utility scripts
│   ├── deploy.sh                    # Deployment script
│   ├── backup-db.sh                 # Database backup
│   └── restore-db.sh                # Database restore
│
├── .htaccess                        # Apache config (for Namecheap)
├── README.md
├── REQUIREMENTS.md
├── DATABASE_SCHEMA.md
├── PROJECT_STRUCTURE.md
├── SETUP.md
├── .gitignore
└── LICENSE
```

---

## File Naming Conventions

### Backend (TypeScript)
- **Files**: PascalCase for models/classes, camelCase for others
- **Examples**: `User.model.ts`, `auth.service.ts`, `query.controller.ts`

### Frontend (React + TypeScript)
- **Components**: PascalCase (`Button.tsx`, `QueryCard.tsx`)
- **Pages**: PascalCase (`Dashboard.tsx`, `PassengerList.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`, `useQuery.ts`)
- **Utils**: camelCase (`formatters.ts`, `validators.ts`)
- **Types**: camelCase with `.types.ts` suffix (`user.types.ts`)

---

## Directory Purpose

| Directory | Purpose |
|-----------|---------|
| `backend/src/controllers` | Handle HTTP requests, call services, return responses |
| `backend/src/services` | Business logic layer, interact with models |
| `backend/src/models` | Database interaction (queries, CRUD operations) |
| `backend/src/routes` | Define API endpoints and link to controllers |
| `backend/src/middleware` | Authentication, validation, error handling |
| `backend/src/validators` | Input validation schemas (Joi/Zod) |
| `backend/src/utils` | Reusable helper functions |
| `backend/src/jobs` | Background tasks (cron jobs) |
| `backend/uploads` | Uploaded files storage |
| `frontend/src/components` | Reusable UI components |
| `frontend/src/pages` | Full page components |
| `frontend/src/api` | API client functions |
| `frontend/src/hooks` | Custom React hooks |
| `frontend/src/store` | Global state management |
| `frontend/src/utils` | Frontend utilities |
| `shared` | Code shared between frontend and backend |

---

## Build Output Structure (Production)

```
dist/
├── backend/                 # Compiled backend
│   ├── src/
│   └── server.js           # Entry point
│
└── frontend/               # Built frontend
    ├── assets/
    ├── index.html
    └── *.js, *.css
```

---

## Environment-Specific Files

### Development
- `backend/.env` - Backend dev environment
- `frontend/.env` - Frontend dev environment
- `nodemon.json` - Auto-reload config

### Production
- `backend/.env.production`
- `frontend/.env.production`
- `.htaccess` - Server config

---

This structure follows best practices for:
- **Separation of Concerns**: Clear separation between frontend, backend, shared code
- **Scalability**: Modular structure easy to extend
- **Maintainability**: Logical grouping of related files
- **TypeScript**: Full type safety across the stack
- **DRY Principle**: Shared types and utilities

