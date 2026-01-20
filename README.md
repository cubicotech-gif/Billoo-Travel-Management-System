# Travel Agency Management System

A complete travel agency management system handling the full lifecycle from query intake to post-travel completion, with integrated vendor management, accounts, and automated workflows.

## 🎯 Project Overview

This system manages:
- **Query to Conversion Pipeline**: Track every passenger from initial inquiry through booking, delivery, travel, and completion
- **Passenger Profiles**: Centralized database of all passengers with complete history
- **Multi-Service Bookings**: Flights, Hotels, Visas, Transport, Tours, Insurance
- **Vendor Management**: Supplier directory, pricing, invoices, and balance tracking
- **Finance & Accounts**: Client invoices, vendor payments, profit/loss tracking
- **Document Management**: Passports, vouchers, tickets, vendor invoices
- **Automated Workflows**: Notifications, SLA alerts, status transitions
- **Role-Based Access**: Admin, Manager, Agent, Finance, Viewer roles

## 🚀 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for data fetching
- **Zustand** for state management
- **React Hook Form** for forms
- **Recharts** for analytics dashboards

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **MySQL** database (Namecheap hosting)
- **JWT** for authentication
- **Multer** for file uploads
- **Node-Cron** for scheduled tasks
- **PDFKit** for invoice/voucher generation

### Hosting & Deployment
- **Namecheap Shared/VPS Hosting**
- **MySQL Database** (cPanel)
- **Node.js** support via cPanel
- **SSL Certificate** (Let's Encrypt)

## 📁 Project Structure

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for complete folder organization.

## 📊 Database Schema

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete table structures and relationships.

## 🔧 Setup & Installation

See [SETUP.md](./SETUP.md) for detailed deployment instructions on Namecheap.

## 📋 Requirements & Features

See [REQUIREMENTS.md](./REQUIREMENTS.md) for complete feature specifications.

## 🏗️ Development Phases

### Phase 1: Core Foundation (Week 1-2)
- [ ] Database setup and migrations
- [ ] Authentication system (login/register/roles)
- [ ] Passenger profile management
- [ ] Query intake form
- [ ] Basic dashboard

### Phase 2: Pipeline & Services (Week 3-4)
- [ ] Status pipeline (Kanban view)
- [ ] Service items module
- [ ] Vendor directory
- [ ] Service-to-Vendor linking
- [ ] Notes and activity logs

### Phase 3: Booking & Documents (Week 5-6)
- [ ] Booking details entry
- [ ] Document upload system
- [ ] PDF voucher generation
- [ ] Invoice generation
- [ ] Email delivery system

### Phase 4: Finance & Payments (Week 7-8)
- [ ] Client payment tracking
- [ ] Vendor payment tracking
- [ ] Profit/loss calculations
- [ ] Financial reports
- [ ] Payment reminders

### Phase 5: Automation & Polish (Week 9-10)
- [ ] Notification system
- [ ] SLA/deadline alerts
- [ ] WhatsApp integration (optional)
- [ ] Advanced search and filters
- [ ] Audit logs
- [ ] Bulk operations

## 🔐 Environment Variables

Create `.env` files for both frontend and backend:

```env
# Backend .env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=travel_agency_db
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d
UPLOAD_PATH=/home/username/uploads
MAX_FILE_SIZE=5242880

# Email (optional)
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_email_password

# WhatsApp API (optional - future integration)
WHATSAPP_API_KEY=
WHATSAPP_API_URL=

# Frontend .env
VITE_API_URL=https://yourdomain.com/api
```

## 🎨 Design System

- **Primary Color**: Blue (#2563eb)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Danger**: Red (#ef4444)
- **Neutral**: Gray scale

## 👥 Default Users

After setup, default admin account:
- **Username**: admin@travelagency.com
- **Password**: Admin@123 (CHANGE IMMEDIATELY)

## 📞 Support

For issues or questions, contact: roohul@cubicotechnologies.com

## 📄 License

Proprietary - Cubico Technologies

---

**Built with ❤️ by Cubico Technologies**
