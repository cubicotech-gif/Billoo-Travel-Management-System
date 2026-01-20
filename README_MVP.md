# Billoo Travel Management System - MVP

A modern, full-stack travel agency management system built with React, TypeScript, Node.js, and MySQL.

## 🎯 MVP Features

This is the **Minimum Viable Product (MVP)** version with core features:

- ✅ **User Authentication** - Secure JWT-based login system
- ✅ **Dashboard** - Real-time statistics and query status distribution
- ✅ **Query Management** - Create, view, and update travel queries
- ✅ **Status Tracking** - Track queries through different stages (New → Working → Quoted → Finalized)
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type-safe JavaScript
- **MySQL** - Relational database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **Zustand** - State management
- **Axios** - HTTP client
- **Recharts** - Charts and visualizations
- **React Router** - Client-side routing

## 📦 Project Structure

```
Billoo-Travel-Management-System/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── config/      # Database configuration
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Auth middleware
│   │   ├── models/      # Data models
│   │   ├── routes/      # API routes
│   │   └── index.ts     # Entry point
│   └── package.json
│
├── frontend/            # React application
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Page components
│   │   ├── store/      # State management
│   │   └── types/      # TypeScript types
│   └── package.json
│
├── database/           # Database schema
│   └── migration.sql
│
├── DEPLOYMENT_GUIDE.md  # Namecheap deployment guide
├── LOCAL_SETUP.md       # Local development setup
└── README_MVP.md        # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Billoo-Travel-Management-System
   ```

2. **Setup Database**
   ```bash
   mysql -u root -p
   CREATE DATABASE billoo_travel_db;
   USE billoo_travel_db;
   SOURCE database/migration.sql;
   ```

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   npm run dev
   ```

4. **Setup Frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Login: admin@billoo.com / admin123

📖 **For detailed setup instructions, see [LOCAL_SETUP.md](./LOCAL_SETUP.md)**

## 🌐 Deployment to Namecheap

Follow the comprehensive deployment guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

**Quick deployment steps:**
1. Setup MySQL database in cPanel
2. Deploy backend with Node.js
3. Build and deploy frontend to public_html
4. Configure SSL and .htaccess
5. Access your live application!

## 📊 Database Schema (MVP)

### Users Table
- id, email, password, full_name, role, created_at

### Queries Table
- id, query_number, passenger_name, phone, email, travel_type, status, created_by, created_at

## 🔐 Security Features

- ✅ JWT token-based authentication
- ✅ Bcrypt password hashing
- ✅ Protected API routes
- ✅ CORS configuration
- ✅ Input validation
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (React auto-escaping)

## 📱 Features Breakdown

### 1. Authentication
- Login with email/password
- JWT token generation
- Automatic token refresh
- Secure logout

### 2. Dashboard
- Total queries count
- Queries created today
- Queries created this week
- Status distribution pie chart
- Recent queries list

### 3. Query Management
- Create new queries with:
  - Passenger name
  - Phone number
  - Email (optional)
  - Travel type (Umrah, Malaysia, Flight, Hotel, Other)
- View all queries in a table
- Update query status
- Filter and search (coming soon)

## 🎨 UI/UX Features

- Clean, modern interface
- Responsive design for all devices
- Color-coded query statuses
- Interactive charts
- Easy navigation
- Loading states
- Error handling
- User feedback messages

## 📈 Future Enhancements (Post-MVP)

- 🔜 Passenger management module
- 🔜 Vendor management
- 🔜 Invoice generation
- 🔜 Payment tracking
- 🔜 Document upload
- 🔜 Email notifications
- 🔜 Advanced reporting
- 🔜 Search and filters
- 🔜 User management
- 🔜 Audit logs
- 🔜 WhatsApp integration

## 🧪 Testing

```bash
# Backend tests (when available)
cd backend
npm test

# Frontend tests (when available)
cd frontend
npm test
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Queries
- `GET /api/queries` - Get all queries
- `POST /api/queries` - Create new query
- `GET /api/queries/:id` - Get query by ID
- `PATCH /api/queries/:id/status` - Update query status

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 👥 Team

Developed by **Cubico Technologies**

## 📞 Support

For issues or questions:
- Create an issue in the repository
- Contact: admin@billoo.com

---

## ✅ MVP Deployment Checklist

### Local Testing
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Database migration successful
- [ ] Login works
- [ ] Dashboard displays stats
- [ ] Can create queries
- [ ] Can update query status

### Production Deployment
- [ ] Database created on Namecheap
- [ ] Backend deployed and running
- [ ] Frontend built and deployed
- [ ] SSL certificate installed
- [ ] .htaccess configured
- [ ] Application accessible via domain
- [ ] All features working on production
- [ ] Admin password changed

---

**Version:** 1.0.0 (MVP)
**Last Updated:** 2026-01-20
**Status:** Ready for Deployment 🚀
