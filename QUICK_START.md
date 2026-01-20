# Quick Start Guide - For Claude Code AI

## 🚀 Immediate Action Plan

You are about to build a **Travel Agency Management System**. This guide tells you EXACTLY what to do first.

---

## Step 1: Understand the Project (5 minutes)

Read these files IN ORDER:
1. ✅ `README.md` - Project overview
2. ✅ `TECH_STACK.md` - Technology explanation
3. ✅ `REQUIREMENTS.md` - Feature specifications
4. ✅ `DATABASE_SCHEMA.md` - Database structure
5. ✅ `DEVELOPMENT_GUIDE.md` - How to build

---

## Step 2: Setup Project Structure (Now)

### Create Backend Folders

```bash
cd backend

# Create all necessary directories
mkdir -p src/config
mkdir -p src/controllers
mkdir -p src/middleware
mkdir -p src/models
mkdir -p src/routes
mkdir -p src/services
mkdir -p src/utils
mkdir -p src/validators
mkdir -p src/jobs
mkdir -p src/templates
mkdir -p src/types
mkdir -p src/database/migrations
mkdir -p uploads/{passports,visas,invoices,vouchers,receipts,temp}
mkdir -p logs

# Install dependencies
npm install
```

### Create Frontend Folders

```bash
cd frontend

# Create all necessary directories
mkdir -p src/api
mkdir -p src/components/{common,layout,forms,query,passenger,vendor,invoice,dashboard,notifications}
mkdir -p src/pages/{auth,dashboard,queries,passengers,vendors,invoices,payments,reports,settings}
mkdir -p src/hooks
mkdir -p src/store
mkdir -p src/utils
mkdir -p src/types
mkdir -p src/styles
mkdir -p public/assets

# Install dependencies
npm install
```

---

## Step 3: Database Setup (FIRST PRIORITY)

### 3.1 Create Migration Files

Create these files EXACTLY as shown in `DATABASE_SCHEMA.md`:

**File**: `backend/src/database/migrations/001_create_tables.sql`
```sql
-- Copy ALL table creation SQL from DATABASE_SCHEMA.md
-- This includes: users, passengers, vendors, queries, service_items,
-- invoices, payment_transactions, activity_logs, attachments,
-- notifications, settings, message_templates, audit_logs
```

**File**: `backend/src/database/migrations/002_create_triggers.sql`
```sql
-- Copy ALL trigger SQL from DATABASE_SCHEMA.md
-- This includes: update_query_totals triggers,
-- update_invoice_paid triggers
```

**File**: `backend/src/database/migrations/003_create_views.sql`
```sql
-- Copy ALL view SQL from DATABASE_SCHEMA.md
-- This includes: dashboard_stats, vendor_balances, passenger_summary
```

**File**: `backend/src/database/migrations/004_seed_data.sql`
```sql
-- Copy seed data SQL from DATABASE_SCHEMA.md
-- This includes: default admin user, settings, message templates
```

### 3.2 Create Database Connection

**File**: `backend/src/database/connection.ts`
```typescript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'travel_agency_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });
```

### 3.3 Run Migrations

Create a migration script:

**File**: `backend/scripts/migrate.ts`
```typescript
import { pool } from '../src/database/connection';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, '../src/database/migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }
      
      console.log(`✅ ${file} completed`);
    }

    console.log('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
```

Add to `package.json`:
```json
{
  "scripts": {
    "migrate": "ts-node scripts/migrate.ts"
  }
}
```

Run migrations:
```bash
npm run migrate
```

---

## Step 4: Build Authentication System (CRITICAL)

Everything depends on auth. Build this FIRST.

### 4.1 Create Environment File

**File**: `backend/.env`
```env
NODE_ENV=development
PORT=3001

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=travel_agency_db
DB_PORT=3306

JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-please-change-this
JWT_EXPIRE=7d

UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

FRONTEND_URL=http://localhost:5173
```

### 4.2 Create Core Utils

**File**: `backend/src/utils/response.util.ts`
```typescript
import { Response } from 'express';

export const successResponse = (
  res: Response,
  data: any,
  message: string = 'Success',
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const errorResponse = (
  res: Response,
  message: string = 'Error',
  statusCode: number = 400,
  errors?: any[]
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};
```

**File**: `backend/src/utils/hash.util.ts`
```typescript
import bcrypt from 'bcrypt';

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

**File**: `backend/src/utils/token.util.ts`
```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export const generateToken = (payload: any): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};
```

### 4.3 Create User Model

**File**: `backend/src/models/User.model.ts`
```typescript
import { pool } from '../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface User extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'Admin' | 'Manager' | 'Agent' | 'Finance' | 'Viewer';
  phone?: string;
  status: 'Active' | 'Inactive';
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<User[]>(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] || null;
  }

  static async findById(id: number): Promise<User | null> {
    const [rows] = await pool.query<User[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }

  static async create(userData: Partial<User>): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users SET ?',
      [userData]
    );
    return result.insertId;
  }

  static async updateLastLogin(id: number): Promise<void> {
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [id]
    );
  }
}
```

### 4.4 Create Auth Service

**File**: `backend/src/services/auth.service.ts`
```typescript
import { UserModel, User } from '../models/User.model';
import { hashPassword, comparePassword } from '../utils/hash.util';
import { generateToken } from '../utils/token.util';

export class AuthService {
  async login(email: string, password: string) {
    const user = await UserModel.findByEmail(email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.status !== 'Active') {
      throw new Error('Account is inactive');
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    await UserModel.updateLastLogin(user.id);

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword
    };
  }

  async getCurrentUser(userId: number) {
    const user = await UserModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
```

### 4.5 Create Auth Controller

**File**: `backend/src/controllers/auth.controller.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { successResponse, errorResponse } from '../utils/response.util';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return errorResponse(res, 'Email and password are required', 400);
      }

      const result = await authService.login(email, password);
      
      return successResponse(res, result, 'Login successful');
    } catch (error: any) {
      return errorResponse(res, error.message, 401);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const user = await authService.getCurrentUser(userId);
      
      return successResponse(res, user);
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  async logout(req: Request, res: Response) {
    return successResponse(res, null, 'Logged out successfully');
  }
}
```

### 4.6 Create Auth Middleware

**File**: `backend/src/middleware/auth.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token.util';
import { errorResponse } from '../utils/response.util';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    (req as any).user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};
```

**File**: `backend/src/middleware/role.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response.util';

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }

    next();
  };
};
```

### 4.7 Create Auth Routes

**File**: `backend/src/routes/auth.routes.ts`
```typescript
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/login', controller.login.bind(controller));
router.get('/me', authMiddleware, controller.getCurrentUser.bind(controller));
router.post('/logout', authMiddleware, controller.logout.bind(controller));

export default router;
```

### 4.8 Create Express App

**File**: `backend/src/app.ts`
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;
```

**File**: `backend/src/server.ts`
```typescript
import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📡 API URL: http://localhost:${PORT}/api`);
});
```

### 4.9 Test Authentication

Start server:
```bash
npm run dev
```

Test with curl:
```bash
# Health check
curl http://localhost:3001/api/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@travelagency.com","password":"Admin@123"}'

# Get current user (use token from login)
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Step 5: Build Other Modules (In Order)

Once auth is working, build in this order:

1. ✅ **Passengers Module** - See DEVELOPMENT_GUIDE.md Section 2.1
2. ✅ **Vendors Module** - See DEVELOPMENT_GUIDE.md Section 2.2
3. ✅ **Queries Module** - See DEVELOPMENT_GUIDE.md Section 2.3
4. ✅ **Service Items Module** - See DEVELOPMENT_GUIDE.md Section 2.4
5. ✅ **Invoices & Payments** - See DEVELOPMENT_GUIDE.md Section 2.5

Each module follows same pattern:
- Model (database queries)
- Service (business logic)
- Controller (HTTP handlers)
- Routes (API endpoints)
- Validators (input validation)

---

## Step 6: Build Frontend (After Backend Core is Working)

Follow DEVELOPMENT_GUIDE.md Section 6.

Start with:
1. Auth pages (Login)
2. Layout components (Header, Sidebar)
3. Dashboard
4. Passenger pages
5. Query pages

---

## 🎯 Success Criteria

You've completed Step 4 when:
- ✅ Database has all tables
- ✅ Can login with default admin
- ✅ `/api/health` returns `{"status": "ok"}`
- ✅ `/api/auth/login` returns token
- ✅ `/api/auth/me` returns user info with valid token

---

## 📚 Reference Files

While coding, keep these open:
- `API_REFERENCE.md` - All API endpoints
- `DATABASE_SCHEMA.md` - All tables and fields
- `DEVELOPMENT_GUIDE.md` - Code patterns and examples

---

**START NOW**: Begin with Step 3 (Database Setup). Everything builds from there.
