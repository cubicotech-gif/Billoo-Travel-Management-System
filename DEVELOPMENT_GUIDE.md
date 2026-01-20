# Development Guide for Claude Code

## 🎯 Project Overview

You are building a **Travel Agency Management System** - a complete web application that handles the full lifecycle of travel bookings from initial query to post-travel completion.

**Key Features**:
- Passenger (customer) profile management
- Query intake and status pipeline (11 stages)
- Multi-service booking (flights, hotels, visas, transport, tours)
- Vendor management and payments
- Invoice generation and payment tracking
- Document management (passports, vouchers, tickets)
- PDF generation (invoices, vouchers)
- Automated notifications and alerts
- Financial reports and analytics

---

## 📋 Build Order & Priority

### Phase 1: Foundation & Core (START HERE)

#### 1.1 Database Setup
**Priority**: CRITICAL - Do this FIRST
- [ ] Create all tables from `DATABASE_SCHEMA.md`
- [ ] Create triggers for auto-calculations
- [ ] Create views for dashboards
- [ ] Insert seed data (default admin, settings)

**Files to create**:
- `backend/src/database/migrations/001_create_tables.sql`
- `backend/src/database/migrations/002_create_triggers.sql`
- `backend/src/database/migrations/003_create_views.sql`
- `backend/src/database/migrations/004_seed_data.sql`
- `backend/src/database/connection.ts` - MySQL connection pool

**Code Guide**:
```typescript
// backend/src/database/connection.ts
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

---

#### 1.2 Backend Core Setup
**Priority**: CRITICAL
- [ ] Express app setup with middleware
- [ ] Environment configuration
- [ ] Error handling middleware
- [ ] Logger setup (Winston/Morgan)

**Files to create**:
- `backend/src/app.ts` - Express app configuration
- `backend/src/server.ts` - Server entry point
- `backend/src/config/database.ts` - DB config
- `backend/src/config/jwt.ts` - JWT config
- `backend/src/middleware/error.middleware.ts`
- `backend/src/middleware/logger.middleware.ts`
- `backend/src/utils/response.util.ts` - Standard API responses

**Example code structure**:
```typescript
// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);
app.use(errorHandler);

export default app;
```

---

#### 1.3 Authentication System
**Priority**: CRITICAL - Build before other features
- [ ] User model with database queries
- [ ] Password hashing (bcrypt)
- [ ] JWT token generation/verification
- [ ] Login/register endpoints
- [ ] Auth middleware (protect routes)
- [ ] Role-based access control

**Files to create**:
- `backend/src/models/User.model.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/routes/auth.routes.ts`
- `backend/src/middleware/auth.middleware.ts`
- `backend/src/middleware/role.middleware.ts`
- `backend/src/utils/hash.util.ts`
- `backend/src/utils/token.util.ts`

**Key Auth Endpoints**:
- `POST /api/auth/register` - Create new user (admin only)
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user info

---

### Phase 2: Core Entities (Build in this order)

#### 2.1 Passengers Module
**Priority**: HIGH - Foundation for everything else
- [ ] Passenger model (CRUD operations)
- [ ] Passenger controller
- [ ] Passenger routes
- [ ] Validation middleware
- [ ] Search and filter logic

**Files to create**:
- `backend/src/models/Passenger.model.ts`
- `backend/src/services/passenger.service.ts`
- `backend/src/controllers/passenger.controller.ts`
- `backend/src/routes/passenger.routes.ts`
- `backend/src/validators/passenger.validator.ts`

**Endpoints**:
- `GET /api/passengers` - List with pagination, search, filters
- `GET /api/passengers/:id` - Get single passenger
- `POST /api/passengers` - Create passenger
- `PUT /api/passengers/:id` - Update passenger
- `DELETE /api/passengers/:id` - Delete passenger
- `GET /api/passengers/search?q=phone|name|email` - Search

---

#### 2.2 Vendors Module
**Priority**: HIGH
- [ ] Vendor model
- [ ] Vendor controller
- [ ] Vendor routes
- [ ] Service tags filtering
- [ ] Vendor balance calculation

**Files**: Follow same pattern as Passengers
**Endpoints**: Same CRUD pattern

---

#### 2.3 Queries Module
**Priority**: CRITICAL - Core business logic
- [ ] Query model with status pipeline
- [ ] Query controller
- [ ] Query routes
- [ ] Status change logic with validation
- [ ] Auto-number generation (QRY-2025-0001)
- [ ] Activity logging on status changes

**Files to create**:
- `backend/src/models/Query.model.ts`
- `backend/src/services/query.service.ts`
- `backend/src/controllers/query.controller.ts`
- `backend/src/routes/query.routes.ts`
- `backend/src/utils/number.util.ts` - Auto-numbering

**Special Endpoints**:
- `PATCH /api/queries/:id/status` - Change status
- `GET /api/queries/pipeline` - Get queries grouped by status (Kanban)
- `GET /api/queries/stats` - Count by status

---

#### 2.4 Service Items Module
**Priority**: HIGH
- [ ] Service item model
- [ ] Link to vendors
- [ ] Calculate markup automatically
- [ ] Booking status management

**Key Logic**:
- When service created/updated, trigger recalculates query totals
- Validate vendor exists and offers that service type

---

#### 2.5 Invoices & Payments
**Priority**: HIGH
- [ ] Invoice model with auto-number
- [ ] Payment transaction model
- [ ] Invoice generation logic
- [ ] Payment recording
- [ ] Balance calculations (using triggers)

**Critical Logic**:
- Invoice balance updates via database trigger when payment added
- Invoice status auto-updates (Paid/Partial/Overdue)

---

### Phase 3: Document Management & PDF

#### 3.1 File Upload
**Priority**: MEDIUM
- [ ] Multer middleware configuration
- [ ] File upload controller
- [ ] File type and size validation
- [ ] Attachment model
- [ ] File storage organization (passports/, invoices/, etc.)

**Files to create**:
- `backend/src/config/upload.ts`
- `backend/src/middleware/upload.middleware.ts`
- `backend/src/models/Attachment.model.ts`
- `backend/src/controllers/attachment.controller.ts`

**Upload Structure**:
```
uploads/
  passports/
  visas/
  invoices/
  vouchers/
  receipts/
```

---

#### 3.2 PDF Generation
**Priority**: MEDIUM
- [ ] PDFKit setup
- [ ] Invoice template
- [ ] Voucher template
- [ ] PDF generation service

**Files to create**:
- `backend/src/services/pdf.service.ts`
- `backend/src/templates/invoice.template.ts`
- `backend/src/templates/voucher.template.ts`

**Endpoints**:
- `GET /api/invoices/:id/pdf` - Generate and download invoice PDF
- `GET /api/queries/:id/voucher` - Generate booking voucher PDF

---

### Phase 4: Notifications & Automation

#### 4.1 Activity Logs
**Priority**: MEDIUM
- [ ] Activity log model
- [ ] Auto-log on changes (middleware)
- [ ] Audit service

**Files to create**:
- `backend/src/models/Activity.model.ts`
- `backend/src/services/audit.service.ts`

---

#### 4.2 Notifications
**Priority**: MEDIUM
- [ ] Notification model
- [ ] Notification service
- [ ] Real-time notifications (optional: Socket.IO)

**Files to create**:
- `backend/src/models/Notification.model.ts`
- `backend/src/services/notification.service.ts`

---

#### 4.3 Email Service
**Priority**: LOW (Optional)
- [ ] Nodemailer setup
- [ ] Email templates
- [ ] Send invoice/voucher emails

**Files to create**:
- `backend/src/services/email.service.ts`
- `backend/src/templates/email.template.ts`

---

#### 4.4 Scheduled Jobs (Cron)
**Priority**: LOW
- [ ] Deadline alerts job
- [ ] Payment reminder job
- [ ] Check-in alert job
- [ ] Overdue invoice job

**Files to create**:
- `backend/src/jobs/deadline-alerts.job.ts`
- `backend/src/jobs/payment-reminders.job.ts`

---

### Phase 5: Dashboard & Reports

#### 5.1 Dashboard API
**Priority**: MEDIUM
- [ ] Dashboard statistics (use views from DB)
- [ ] Chart data endpoints

**Files to create**:
- `backend/src/controllers/dashboard.controller.ts`
- `backend/src/services/dashboard.service.ts`

**Endpoints**:
- `GET /api/dashboard/stats` - Widget counts
- `GET /api/dashboard/revenue-trend` - Last 6 months revenue
- `GET /api/dashboard/pipeline` - Queries by status

---

#### 5.2 Reports
**Priority**: LOW
- [ ] Profit/loss report
- [ ] Receivables report
- [ ] Vendor aging report
- [ ] Agent performance report

**Files to create**:
- `backend/src/controllers/report.controller.ts`
- `backend/src/services/report.service.ts`

---

### Phase 6: Frontend Development

#### 6.1 Frontend Core Setup
**Priority**: CRITICAL
- [ ] React app with Vite
- [ ] React Router setup
- [ ] Tailwind CSS configuration
- [ ] Axios client with interceptors
- [ ] React Query setup
- [ ] Zustand stores (auth, notifications)

**Files to create**:
- `frontend/src/main.tsx` - Entry point
- `frontend/src/App.tsx` - Main app component
- `frontend/src/router.tsx` - Routes configuration
- `frontend/src/api/axios.config.ts` - Axios instance
- `frontend/src/store/authStore.ts` - Auth state
- `frontend/src/styles/globals.css` - Tailwind imports

---

#### 6.2 Authentication Pages
**Priority**: CRITICAL
- [ ] Login page
- [ ] Forgot password page
- [ ] Reset password page
- [ ] Protected route wrapper

**Files to create**:
- `frontend/src/pages/auth/Login.tsx`
- `frontend/src/pages/auth/ForgotPassword.tsx`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/components/layout/ProtectedRoute.tsx`

---

#### 6.3 Layout Components
**Priority**: HIGH
- [ ] Header with navigation
- [ ] Sidebar with menu
- [ ] Layout wrapper
- [ ] Footer

**Files to create**:
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/Layout.tsx`
- `frontend/src/components/layout/Footer.tsx`

---

#### 6.4 Common Components
**Priority**: HIGH - Reusable components
- [ ] Button
- [ ] Input
- [ ] Select
- [ ] DatePicker
- [ ] Modal
- [ ] Table
- [ ] Card
- [ ] Badge
- [ ] Loader
- [ ] Alert
- [ ] Pagination

**Files to create**:
All in `frontend/src/components/common/`

**Design System**:
- Primary color: Blue (#2563eb)
- Use Tailwind utility classes
- Accessible (ARIA attributes)
- Responsive

---

#### 6.5 Dashboard Page
**Priority**: HIGH
- [ ] Statistics widgets
- [ ] Charts (using Recharts)
- [ ] Quick actions
- [ ] Recent activity

**Files to create**:
- `frontend/src/pages/dashboard/Dashboard.tsx`
- `frontend/src/components/dashboard/StatsCard.tsx`
- `frontend/src/components/dashboard/RevenueChart.tsx`
- `frontend/src/api/dashboard.api.ts`

---

#### 6.6 Passenger Pages
**Priority**: HIGH
- [ ] Passenger list page (table with search/filter)
- [ ] Create passenger form
- [ ] Edit passenger form
- [ ] Passenger profile page (tabs: overview, queries, documents, history)

**Files to create**:
- `frontend/src/pages/passengers/PassengerList.tsx`
- `frontend/src/pages/passengers/PassengerCreate.tsx`
- `frontend/src/pages/passengers/PassengerEdit.tsx`
- `frontend/src/pages/passengers/PassengerProfile.tsx`
- `frontend/src/components/forms/PassengerForm.tsx`
- `frontend/src/api/passenger.api.ts`
- `frontend/src/hooks/usePassenger.ts`

---

#### 6.7 Query Pages
**Priority**: CRITICAL
- [ ] Query list page (table view)
- [ ] Query Kanban board (drag-drop by status)
- [ ] Create query form
- [ ] Query details page (full info, service items, activity log)

**Files to create**:
- `frontend/src/pages/queries/QueryList.tsx`
- `frontend/src/pages/queries/QueryCreate.tsx`
- `frontend/src/pages/queries/QueryDetails.tsx`
- `frontend/src/components/query/QueryKanban.tsx`
- `frontend/src/components/query/QueryCard.tsx`
- `frontend/src/components/forms/QueryForm.tsx`

**Key Features**:
- Kanban: Use @hello-pangea/dnd for drag-drop
- Filters: Status, agent, date range, priority
- Inline status change

---

#### 6.8 Vendor Pages
**Priority**: MEDIUM
- [ ] Vendor list
- [ ] Create/edit vendor
- [ ] Vendor details with balance

**Files to create**:
- `frontend/src/pages/vendors/VendorList.tsx`
- `frontend/src/pages/vendors/VendorCreate.tsx`
- `frontend/src/pages/vendors/VendorDetails.tsx`

---

#### 6.9 Invoice & Payment Pages
**Priority**: MEDIUM
- [ ] Invoice list
- [ ] Create invoice form (auto-populated from query)
- [ ] Invoice preview modal
- [ ] Payment recording form

**Files to create**:
- `frontend/src/pages/invoices/InvoiceList.tsx`
- `frontend/src/pages/invoices/InvoiceCreate.tsx`
- `frontend/src/pages/payments/PaymentCreate.tsx`
- `frontend/src/components/invoice/InvoicePreview.tsx`

---

#### 6.10 Reports Pages
**Priority**: LOW
- [ ] Report dashboard with filters
- [ ] Profit/loss report
- [ ] Receivables report
- [ ] Payables report

**Files to create**:
- `frontend/src/pages/reports/ReportDashboard.tsx`
- `frontend/src/pages/reports/ProfitLoss.tsx`

---

### Phase 7: Polish & Optimization

- [ ] Loading states everywhere
- [ ] Error handling (toast notifications)
- [ ] Form validation feedback
- [ ] Responsive design testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] User testing

---

## 🛠️ Coding Standards

### Backend (TypeScript + Express)

**Model Pattern** (Database queries):
```typescript
// backend/src/models/Passenger.model.ts
import { pool } from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Passenger extends RowDataPacket {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  // ... other fields
}

export class PassengerModel {
  static async getAll(limit: number, offset: number): Promise<Passenger[]> {
    const [rows] = await pool.query<Passenger[]>(
      'SELECT * FROM passengers LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows;
  }

  static async getById(id: number): Promise<Passenger | null> {
    const [rows] = await pool.query<Passenger[]>(
      'SELECT * FROM passengers WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async create(data: Partial<Passenger>): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO passengers SET ?',
      [data]
    );
    return result.insertId;
  }

  static async update(id: number, data: Partial<Passenger>): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE passengers SET ? WHERE id = ?',
      [data, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM passengers WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}
```

**Service Pattern** (Business logic):
```typescript
// backend/src/services/passenger.service.ts
import { PassengerModel, Passenger } from '../models/Passenger.model';

export class PassengerService {
  async getAllPassengers(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const passengers = await PassengerModel.getAll(limit, offset);
    const total = await PassengerModel.count();
    
    return {
      data: passengers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getPassengerById(id: number) {
    const passenger = await PassengerModel.getById(id);
    if (!passenger) {
      throw new Error('Passenger not found');
    }
    return passenger;
  }

  async createPassenger(data: Partial<Passenger>) {
    // Validate
    if (!data.full_name || !data.phone) {
      throw new Error('Name and phone are required');
    }

    // Check for duplicate phone
    const existing = await PassengerModel.findByPhone(data.phone);
    if (existing) {
      throw new Error('Passenger with this phone already exists');
    }

    const id = await PassengerModel.create(data);
    return this.getPassengerById(id);
  }
}
```

**Controller Pattern** (HTTP handlers):
```typescript
// backend/src/controllers/passenger.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PassengerService } from '../services/passenger.service';
import { successResponse, errorResponse } from '../utils/response.util';

const passengerService = new PassengerService();

export class PassengerController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await passengerService.getAllPassengers(page, limit);
      
      return successResponse(res, result, 'Passengers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const passenger = await passengerService.createPassenger(req.body);
      return successResponse(res, passenger, 'Passenger created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
```

**Route Pattern**:
```typescript
// backend/src/routes/passenger.routes.ts
import { Router } from 'express';
import { PassengerController } from '../controllers/passenger.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validatePassenger } from '../validators/passenger.validator';

const router = Router();
const controller = new PassengerController();

router.get('/', authMiddleware, controller.getAll);
router.get('/:id', authMiddleware, controller.getById);
router.post('/', authMiddleware, roleMiddleware(['Admin', 'Manager', 'Agent']), validatePassenger, controller.create);
router.put('/:id', authMiddleware, roleMiddleware(['Admin', 'Manager', 'Agent']), validatePassenger, controller.update);
router.delete('/:id', authMiddleware, roleMiddleware(['Admin']), controller.delete);

export default router;
```

---

### Frontend (React + TypeScript)

**API Client**:
```typescript
// frontend/src/api/passenger.api.ts
import axios from './axios.config';

export interface Passenger {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
}

export const passengerAPI = {
  getAll: async (page = 1, limit = 10) => {
    const { data } = await axios.get(`/passengers?page=${page}&limit=${limit}`);
    return data;
  },

  getById: async (id: number) => {
    const { data } = await axios.get(`/passengers/${id}`);
    return data;
  },

  create: async (passenger: Partial<Passenger>) => {
    const { data } = await axios.post('/passengers', passenger);
    return data;
  },

  update: async (id: number, passenger: Partial<Passenger>) => {
    const { data } = await axios.put(`/passengers/${id}`, passenger);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await axios.delete(`/passengers/${id}`);
    return data;
  },
};
```

**React Query Hook**:
```typescript
// frontend/src/hooks/usePassenger.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { passengerAPI, Passenger } from '@/api/passenger.api';
import { toast } from 'react-hot-toast';

export const usePassengers = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['passengers', page, limit],
    queryFn: () => passengerAPI.getAll(page, limit),
  });
};

export const usePassenger = (id: number) => {
  return useQuery({
    queryKey: ['passenger', id],
    queryFn: () => passengerAPI.getById(id),
    enabled: !!id,
  });
};

export const useCreatePassenger = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: passengerAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passengers'] });
      toast.success('Passenger created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create passenger');
    },
  });
};
```

**React Component**:
```typescript
// frontend/src/pages/passengers/PassengerList.tsx
import React, { useState } from 'react';
import { usePassengers } from '@/hooks/usePassenger';
import { Button } from '@/components/common/Button';
import { Table } from '@/components/common/Table';
import { Loader } from '@/components/common/Loader';
import { useNavigate } from 'react-router-dom';

export const PassengerList: React.FC = () => {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { data, isLoading, error } = usePassengers(page, 20);

  if (isLoading) return <Loader />;
  if (error) return <div>Error loading passengers</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Passengers</h1>
        <Button onClick={() => navigate('/passengers/create')}>
          Add Passenger
        </Button>
      </div>

      <Table
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'full_name', label: 'Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
        ]}
        data={data.data}
        onRowClick={(row) => navigate(`/passengers/${row.id}`)}
      />

      {/* Pagination component here */}
    </div>
  );
};
```

---

## 🚀 Getting Started Checklist

- [ ] Read all documentation files (README, REQUIREMENTS, DATABASE_SCHEMA, TECH_STACK)
- [ ] Understand the data model and relationships
- [ ] Set up database (create tables, triggers, views, seed data)
- [ ] Build authentication system FIRST
- [ ] Build backend module by module (Passengers → Vendors → Queries → Services → Invoices)
- [ ] Build frontend page by page (Auth → Dashboard → Passengers → Queries)
- [ ] Test each module before moving to next
- [ ] Deploy to Namecheap following SETUP.md

---

## ⚠️ Critical Rules

1. **Always use parameterized queries** - Prevent SQL injection
2. **Hash passwords with bcrypt** - Never store plain passwords
3. **Validate all inputs** - On both frontend and backend
4. **Use TypeScript types** - For all data structures
5. **Handle errors gracefully** - Try-catch everywhere, user-friendly messages
6. **Log all changes** - Activity logs for auditing
7. **Test authentication** - Before building protected features
8. **Follow the MVC pattern** - Model → Service → Controller → Route
9. **Use environment variables** - Never hard-code credentials
10. **Write clean, readable code** - Comments for complex logic

---

## 📚 Additional Resources

- MySQL Documentation: https://dev.mysql.com/doc/
- Express Guide: https://expressjs.com/
- React Documentation: https://react.dev/
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Tailwind CSS: https://tailwindcss.com/docs

---

**You have everything you need to build this system. Start with Phase 1, follow the order, and build incrementally. Good luck!** 🚀
