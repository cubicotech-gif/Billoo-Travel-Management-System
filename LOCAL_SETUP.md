# Local Development Setup Guide

This guide will help you set up the Billoo Travel Management System on your local machine for development.

## 📋 Prerequisites

- Node.js v18+ ([Download](https://nodejs.org/))
- MySQL 8.0+ ([Download](https://dev.mysql.com/downloads/))
- Git
- A code editor (VS Code recommended)

---

## 🚀 Quick Start

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Billoo-Travel-Management-System
```

### Step 2: Database Setup

1. **Start MySQL Server**
   ```bash
   # macOS/Linux
   sudo systemctl start mysql

   # Windows - MySQL should auto-start or use Services
   ```

2. **Create Database**
   ```bash
   mysql -u root -p
   ```

   In MySQL console:
   ```sql
   CREATE DATABASE billoo_travel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```

3. **Import Schema**
   ```bash
   mysql -u root -p billoo_travel_db < database/migration.sql
   ```

### Step 3: Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env file**
   ```bash
   cp .env.example .env
   ```

4. **Edit .env file**
   ```env
   PORT=3001
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=billoo_travel_db

   # JWT Configuration
   JWT_SECRET=dev-secret-key-change-in-production
   JWT_EXPIRES_IN=7d

   # CORS Configuration
   CORS_ORIGIN=http://localhost:5173
   ```

5. **Start the backend server**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   ✅ Database connected successfully
   🚀 Server is running on port 3001
   ```

### Step 4: Frontend Setup

1. **Open a new terminal and navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env file**
   ```bash
   cp .env.example .env
   ```

4. **Edit .env file**
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

5. **Start the frontend development server**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   VITE v5.0.8  ready in 500 ms

   ➜  Local:   http://localhost:5173/
   ```

### Step 5: Access the Application

1. **Open your browser**
   - Navigate to: `http://localhost:5173`

2. **Login with default credentials**
   - Email: `admin@billoo.com`
   - Password: `admin123`

3. **Test the features**
   - View Dashboard
   - Create a new query
   - Update query status

---

## 🛠️ Development Workflow

### Backend Development

```bash
cd backend

# Start development server (auto-reload on changes)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests (when available)
npm test
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

---

## 📁 Project Structure

```
Billoo-Travel-Management-System/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── query.controller.ts
│   │   │   └── dashboard.controller.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   └── query.model.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── query.routes.ts
│   │   │   └── dashboard.routes.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── components/
│   │   │   └── Navbar.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Queries.tsx
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
│
└── database/
    └── migration.sql
```

---

## 🔧 Troubleshooting

### Database Connection Error

**Error:** `ER_ACCESS_DENIED_ERROR`

**Solution:**
- Verify MySQL credentials in `backend/.env`
- Ensure MySQL server is running
- Check if user has correct permissions

```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON billoo_travel_db.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find and kill the process using port 3001
# Linux/macOS
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Frontend API Connection Error

**Error:** `Network Error` or `CORS Error`

**Solution:**
- Ensure backend is running on port 3001
- Verify `VITE_API_URL` in `frontend/.env`
- Check `CORS_ORIGIN` in `backend/.env` matches frontend URL

### Module Not Found

**Error:** `Cannot find module 'xyz'`

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 🧪 Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@billoo.com","password":"admin123"}'

# Get queries (replace TOKEN with actual token)
curl http://localhost:3001/api/queries \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Import the API endpoints
2. Set base URL: `http://localhost:3001/api`
3. Login to get token
4. Add token to Authorization header for protected routes

---

## 📝 Sample Data

The database migration includes sample data:
- 1 Admin user
- 3 Sample queries

To add more test data, use the application UI or insert directly:

```sql
INSERT INTO queries (query_number, passenger_name, phone, email, travel_type, status, created_by)
VALUES ('QRY-20260120-004', 'Test Passenger', '+92-300-0000000', 'test@example.com', 'Umrah', 'New', 1);
```

---

## 🎯 Next Steps

1. **Customize the application**
   - Modify colors in `frontend/tailwind.config.js`
   - Add new features
   - Enhance UI components

2. **Add more features**
   - User management
   - Reports and analytics
   - Email notifications

3. **Setup version control**
   ```bash
   git add .
   git commit -m "Initial setup"
   git push
   ```

---

## 📚 Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Vite Documentation](https://vitejs.dev/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

**Happy Coding! 🚀**
