# Travel Agency Management System - Complete Requirements

## 1. Core Entities & Models

### 1.1 Passenger (Pax) Profile
**Purpose**: Central record for each passenger

**Fields**:
- `id` (UUID/Auto-increment)
- `full_name` (required)
- `phone` (required, unique)
- `whatsapp` (optional)
- `email` (optional)
- `date_of_birth` (optional)
- `nationality` (optional)
- `cnic` (Pakistan ID, optional)
- `passport_number` (optional)
- `passport_expiry` (optional)
- `reference_source` (how they found us)
- `profile_photo` (URL)
- `status` (Active/Inactive/Blacklisted)
- `assigned_agent_id` (foreign key)
- `created_at`, `updated_at`
- `created_by` (user_id)

**Relationships**:
- Has many Queries
- Has many Documents
- Has many Invoices
- Has many Payment Transactions
- Belongs to Agent (assigned)

**Features**:
- Search by name, phone, email, CNIC, passport
- Duplicate detection on phone/email
- Merge duplicate profiles
- View complete history
- Quick actions: Create query, Add payment, Upload doc, Send message

---

### 1.2 Query / Case
**Purpose**: Each inquiry or trip request from a passenger

**Fields**:
- `id` (UUID/Auto-increment)
- `query_number` (auto-generated: QRY-2025-0001)
- `pax_id` (foreign key to Passenger)
- `status` (enum: see status list below)
- `sub_status` (varchar, contextual to main status)
- `channel` (WhatsApp/Phone/Social/Walk-in/Referral/Email)
- `source_referrer` (name of referrer if applicable)
- `travel_type` (Umrah/Malaysia/Intl Tour/Flight only/Hotel only/Visa)
- `travel_start_date` (optional)
- `travel_end_date` (optional)
- `flexible_dates` (boolean)
- `number_of_passengers` (int, for group bookings)
- `assigned_agent_id` (foreign key)
- `deadline` (datetime - SLA target)
- `priority` (Low/Normal/High/Urgent)
- `initial_notes` (text)
- `profit_amount` (calculated)
- `total_quoted` (calculated from services)
- `total_cost` (calculated from services)
- `created_at`, `updated_at`
- `created_by`, `last_modified_by`

**Status Pipeline**:
1. **New Query** - Just created
   - Sub-statuses: Responded Y/N, Assigned Agent
2. **Working** - Searching vendors, requesting rates
   - Sub-statuses: Vendor Requested, Vendor Reply Pending, Vendor Replied
3. **Quoted** - Quote sent to passenger
   - Sub-statuses: Pax Response Pending, Negotiation, Rejected
4. **Finalized** - Pax accepted quote
5. **Booking** - Booking in progress
   - Sub-statuses: Booked, Pending, Failed
6. **Documents Collected** - Passport copies, visa docs received
7. **Issued/Delivered** - Vouchers & tickets created and sent
8. **Check-in Pending** - Travel date approaching
9. **Completed** - Travel done successfully
10. **Returned** - Customer came back (post-travel)
11. **Cancelled** - Booking cancelled
    - Sub-statuses: Refunded, Penalty Applied, No Refund

**Relationships**:
- Belongs to Passenger
- Has many Service Items
- Has many Activities/Notes
- Has many Attachments
- Belongs to Agent (assigned)

---

### 1.3 Service Item
**Purpose**: Individual service within a query (flight, hotel, etc.)

**Fields**:
- `id`
- `query_id` (foreign key)
- `service_type` (Flight/Hotel/Visa/Transport/Tour/Insurance/Other)
- `description` (text - e.g., "Return flight KHI-JED")
- `vendor_id` (foreign key, nullable)
- `vendor_price` (decimal - cost from vendor)
- `quoted_price` (decimal - price shown to pax)
- `markup` (calculated: quoted - vendor_price)
- `commission_percentage` (optional override)
- `availability_status` (Requested/Available/Not Available)
- `booking_status` (Not Booked/Booked/Failed/Cancelled)
- `booking_reference` (PNR, confirmation number, etc.)
- `booking_details` (JSON - flexible structure for different service types)
- `service_date` (start date of service)
- `service_end_date` (optional)
- `notes` (text)
- `created_at`, `updated_at`
- `created_by`

**Booking Details Structure** (JSON examples):

**Flight**:
```json
{
  "airline": "PIA",
  "flight_number": "PK300",
  "departure": {
    "airport": "KHI",
    "date": "2025-03-15",
    "time": "14:30"
  },
  "arrival": {
    "airport": "JED",
    "date": "2025-03-15",
    "time": "18:45"
  },
  "cabin_class": "Economy",
  "baggage": "30kg"
}
```

**Hotel**:
```json
{
  "hotel_name": "Hilton Makkah",
  "room_type": "Deluxe Double",
  "check_in": "2025-03-16",
  "check_out": "2025-03-20",
  "nights": 4,
  "meal_plan": "Breakfast included"
}
```

**Visa**:
```json
{
  "visa_type": "Tourist",
  "country": "Saudi Arabia",
  "processing_time": "3-5 days",
  "validity": "90 days",
  "status": "Applied"
}
```

**Relationships**:
- Belongs to Query
- Belongs to Vendor (optional)
- Has many Attachments (vendor invoices, vouchers)

---

### 1.4 Vendor
**Purpose**: External suppliers for services

**Fields**:
- `id`
- `name` (required)
- `service_tags` (JSON array: ["Flights", "Hotels", "Visa"])
- `contact_person`
- `phone`
- `whatsapp`
- `whatsapp_group_name`
- `email`
- `address`
- `city`
- `country`
- `payment_terms` (text - e.g., "Net 30")
- `currency` (USD/PKR/SAR)
- `bank_details` (JSON)
- `default_commission_percentage` (decimal)
- `rating` (1-5, optional)
- `notes`
- `status` (Active/Inactive)
- `created_at`, `updated_at`

**Relationships**:
- Has many Service Items
- Has many Vendor Invoices
- Has many Vendor Payments

**Features**:
- Filter by service type
- Filter by city/country
- View balance (total billed - total paid)
- Performance metrics

---

### 1.5 Invoice (Client)
**Purpose**: Invoice sent to passenger

**Fields**:
- `id`
- `invoice_number` (auto: INV-2025-0001)
- `query_id` (foreign key)
- `pax_id` (foreign key)
- `issue_date`
- `due_date`
- `status` (Draft/Sent/Paid/Partial/Overdue/Cancelled)
- `subtotal` (sum of service items)
- `tax_amount` (if applicable)
- `total_amount`
- `amount_paid` (sum of payments)
- `balance_due` (calculated)
- `line_items` (JSON - array of services)
- `notes`
- `terms_and_conditions` (text)
- `created_at`, `updated_at`
- `created_by`

**Relationships**:
- Belongs to Query
- Belongs to Passenger
- Has many Payment Transactions

---

### 1.6 Payment Transaction
**Purpose**: Track all money movements

**Fields**:
- `id`
- `transaction_number` (auto: TXN-2025-0001)
- `type` (Client Payment/Vendor Payment)
- `invoice_id` (foreign key, nullable for vendor payments)
- `pax_id` (foreign key, nullable)
- `vendor_id` (foreign key, nullable)
- `amount`
- `payment_method` (Cash/Bank Transfer/Cheque/Credit Card/Online)
- `payment_date`
- `reference_number` (cheque no, transaction ID, etc.)
- `receipt_attachment` (URL)
- `notes`
- `recorded_by` (user_id)
- `created_at`, `updated_at`

**Relationships**:
- Belongs to Invoice (if client payment)
- Belongs to Passenger (if client payment)
- Belongs to Vendor (if vendor payment)

---

### 1.7 Activity Log / Note
**Purpose**: Timestamped notes and activity on queries

**Fields**:
- `id`
- `query_id` (foreign key)
- `pax_id` (foreign key, optional)
- `activity_type` (Note/Status Change/Payment/Booking/Document/Email Sent/WhatsApp Sent)
- `description` (text)
- `old_value` (for status changes, price changes)
- `new_value`
- `created_by` (user_id)
- `created_at`

**Relationships**:
- Belongs to Query
- Optionally belongs to Passenger
- Belongs to User (creator)

---

### 1.8 Attachment / Document
**Purpose**: Store files related to queries or passengers

**Fields**:
- `id`
- `entity_type` (Passenger/Query/Service/Vendor)
- `entity_id` (foreign key to entity)
- `file_type` (Passport/Visa/Photo/Invoice/Voucher/Ticket/Other)
- `file_name`
- `file_path` (URL or path)
- `file_size` (bytes)
- `mime_type`
- `metadata` (JSON - e.g., passport expiry, document number)
- `version` (int - for versioning)
- `uploaded_by` (user_id)
- `uploaded_at`

**Features**:
- Versioning for passport updates
- Bulk upload
- Download as ZIP
- Preview images/PDFs

---

### 1.9 User (Agent/Staff)
**Purpose**: System users with different roles

**Fields**:
- `id`
- `username` (unique)
- `email` (unique)
- `password_hash`
- `full_name`
- `role` (Admin/Manager/Agent/Finance/Viewer)
- `phone`
- `status` (Active/Inactive)
- `last_login`
- `created_at`, `updated_at`

**Roles & Permissions**:
- **Admin**: Full access, manage users, settings, templates
- **Manager**: View/edit all queries, reassign, approve invoices, reports
- **Agent**: Create queries, edit assigned queries, notes, docs, quotes
- **Finance**: Manage invoices/payments, vendor bills, profit reports
- **Viewer**: Read-only access

---

## 2. Feature Requirements

### 2.1 Authentication & Authorization
- Login with email/username and password
- JWT token-based authentication
- Role-based access control (RBAC)
- Password reset via email
- Session timeout after inactivity
- Audit log for login attempts

### 2.2 Dashboard
**Widgets**:
- New Queries count (clickable)
- Bookings Today count
- Payments Due count
- Vendor Replies Pending
- Check-ins next 7 days
- Revenue this month
- Profit/Loss this month

**Charts**:
- Queries by status (pie chart)
- Revenue trend (line chart, last 6 months)
- Top vendors by volume (bar chart)
- Conversion rate (funnel chart)

**Quick Actions**:
- Create New Query button
- Global search (pax name, phone, PNR, invoice)

### 2.3 Query Intake Form
**Flow**:
1. Select Channel (dropdown)
2. Search existing passenger OR create new
3. If creating new, fill: Name, Phone, WhatsApp, Email
4. Fill query details: Travel type, dates, number of pax, priority
5. Assign agent (default to current user)
6. Set deadline
7. Add initial notes
8. Save → Creates query in "New Query" status

**Validations**:
- Phone or WhatsApp required
- Travel type required
- Deadline must be future date

### 2.4 Pipeline Views
**Kanban Board**:
- Columns for each status (New, Working, Quoted, etc.)
- Drag and drop to change status
- Card shows: Pax name, query number, agent, deadline, priority flag
- Click card to open full details

**List View**:
- Table with columns: Query #, Pax Name, Status, Agent, Travel Date, Deadline, Actions
- Sortable columns
- Inline quick actions (status change, assign agent)

**Table View**:
- Full data table with all fields
- Export to CSV

**Filters** (applicable to all views):
- Date range (created, travel date)
- Status
- Agent
- Channel
- Travel type
- Priority
- Payment status
- Overdue deadline toggle

### 2.5 Passenger Profile Page
**Tabs**:
1. **Overview**: Current trip summary, quick stats (total spent, trips count)
2. **Queries & Cases**: List of all queries (active and past)
3. **Active Trip**: If booking exists, show all service items with details
4. **Documents**: Upload/view passport, visas, photos
5. **Notes & Activity**: Timestamped log of all activities
6. **Invoices & Payments**: List of invoices and payment history
7. **History**: Past completed trips

**Header Actions**:
- Create New Query
- Duplicate Last Query (for repeat bookings)
- Add Payment
- Upload Document
- Send Message (WhatsApp/Email template)
- Edit Profile

### 2.6 Service Item Management
**Add Service Flow**:
1. Select service type (Flight/Hotel/Visa/etc.)
2. Enter description
3. Search and select vendor (filtered by service type)
4. Enter vendor price
5. Enter quoted price (auto-calculate markup)
6. Set availability status
7. Save

**Booking Details Entry**:
- For each service type, custom form fields
- Flight: Airline, flight number, departure/arrival airports, dates, times, PNR
- Hotel: Hotel name, room type, check-in/out dates, nights, meal plan
- Visa: Visa type, country, processing time, validity
- Transport: Pickup/drop locations, vehicle type, date/time
- Tour: Tour name, itinerary, inclusions

**Vendor Response Tracking**:
- Mark as "Requested from Vendor"
- Record vendor reply date
- Update availability and pricing

### 2.7 Vendor Management
**Vendor Directory**:
- List view with search and filters
- Add/Edit vendor form
- View vendor details page

**Vendor Details Page**:
- Contact information
- Services offered (tags)
- Current balance (billed vs paid)
- List of all bookings with this vendor
- Payment history
- Rating/feedback

**Balance Calculation**:
- Sum of all service items booked from this vendor (vendor_price)
- Minus sum of all payments made to vendor
- Show outstanding balance

### 2.8 Booking & Delivery
**Booking Form** (per service):
- Enter booking reference (PNR, confirmation number)
- Fill detailed booking info (flight segments, hotel details, etc.)
- Upload vendor invoice
- Change booking status to "Booked"
- Generate voucher button (after all services booked)

**Voucher Generation**:
- Select template (Agency branded)
- Auto-populate: Pax name, services, dates, booking references
- Preview PDF
- Download or Email to pax
- Save copy to documents

**Invoice Generation**:
- Auto-calculate line items from service quoted prices
- Add taxes if applicable
- Set due date
- Preview and edit
- Mark as "Sent"
- Download or Email to pax

### 2.9 Payments & Finance
**Record Client Payment**:
- Select invoice
- Enter amount, payment method, reference
- Upload receipt
- Save → Auto-update invoice balance and status

**Record Vendor Payment**:
- Select vendor
- Enter amount, payment method, reference
- Link to specific services (optional)
- Upload receipt
- Save → Update vendor balance

**Financial Reports**:
- **Profit/Loss Report**: Total revenue - total costs - expenses
- **Receivables Report**: Outstanding client invoices
- **Payables Report**: Outstanding vendor payments
- **Cash Flow Report**: Inflows vs outflows by date
- **Vendor Aging Report**: Overdue vendor payments
- **Agent Performance**: Queries, conversions, revenue by agent

**Filters**: Date range, agent, travel type, vendor

### 2.10 Notifications & Alerts
**Alert Types**:
1. **New Query Assigned**: Notify agent
2. **Deadline Approaching**: 48h and 24h before deadline
3. **Deadline Overdue**: Daily reminder
4. **Vendor Reply**: Notify assigned agent
5. **Payment Due**: 3 days before, on due date, overdue
6. **Check-in Upcoming**: 7 days, 3 days, 1 day before travel
7. **Document Expiry**: Passport expiring within 6 months

**Notification Channels**:
- In-app notifications (bell icon)
- Email
- WhatsApp (via API, optional)
- SMS (optional)

**Template Messages**:
- Quote template
- Payment reminder
- Booking confirmation
- Voucher delivery message
- Travel reminders

### 2.11 Search & Filters
**Global Search** (top bar):
- Search by: Pax name, phone, email, query number, PNR, invoice number
- Real-time suggestions
- Search results page with grouped results (Passengers, Queries, Invoices)

**Advanced Filters** (on list pages):
- Combine multiple filters (AND logic)
- Save filter presets
- Quick filters: "My Queries", "Overdue", "Payment Pending", "Check-in This Week"

### 2.12 Bulk Operations
**Select Multiple Queries**:
- Bulk assign agent
- Bulk status update
- Bulk send message
- Export selected to CSV

### 2.13 Audit Logs
**Log All Changes**:
- Who made the change
- When
- What was changed (field name)
- Old value → New value
- Reason (if provided)

**Audit Log Viewer**:
- Filter by entity type, entity ID, user, date range
- Export audit logs
- Search within logs

### 2.14 Settings & Admin
**General Settings**:
- Agency name, logo, contact
- Default currency
- Tax rate
- Invoice/Query number formats
- Terms and conditions template

**Email/WhatsApp Templates**:
- Create reusable message templates
- Variables: {pax_name}, {query_number}, {travel_date}, etc.

**User Management**:
- Add/Edit/Deactivate users
- Assign roles
- Reset passwords

**Status Configuration**:
- Customize status names
- Reorder statuses
- Enable/disable sub-statuses

**Permissions Matrix**:
- Define what each role can do (Create, Read, Update, Delete) for each module

---

## 3. Non-Functional Requirements

### 3.1 Performance
- Page load time < 2 seconds
- Search results < 1 second
- Support 50+ concurrent users
- Handle 10,000+ passenger profiles

### 3.2 Security
- HTTPS only
- Password hashing (bcrypt)
- SQL injection prevention (parameterized queries)
- XSS protection
- CSRF tokens
- File upload validation (type, size)
- Regular backups

### 3.3 Usability
- Mobile-responsive design
- Intuitive navigation
- Keyboard shortcuts for common actions
- Undo functionality for critical actions
- Help tooltips

### 3.4 Reliability
- 99% uptime
- Automatic database backups (daily)
- Error logging and monitoring
- Graceful error handling with user-friendly messages

### 3.5 Scalability
- Database indexing for performance
- Pagination for large data sets
- Lazy loading for images/documents
- API rate limiting

---

## 4. Integration Requirements (Optional/Future)

### 4.1 WhatsApp Business API
- Send booking confirmations
- Send payment reminders
- Receive query messages
- Template message approval

### 4.2 Email Service
- SMTP configuration
- Automated emails for invoices, reminders
- Email tracking (opened, clicked)

### 4.3 Payment Gateway
- Stripe/PayPal for online payments
- Payment links in invoices

### 4.4 GDS/Flight API
- Future integration for live flight search
- Auto-populate flight details

### 4.5 SMS Gateway
- Send OTP for password reset
- Critical alerts

---

## 5. Data Migration & Seeding

### 5.1 Seed Data
- Default admin user
- Sample vendors
- Status list
- Service types
- Sample passengers and queries for testing

### 5.2 Import Tools
- CSV import for passengers
- CSV import for vendors
- Bulk data import from Excel

---

## 6. Reporting & Analytics

### 6.1 Standard Reports
- Daily Sales Report
- Monthly Revenue Report
- Agent Performance Report
- Vendor Performance Report
- Profit/Loss Statement
- Outstanding Payments Report
- Travel Manifest (upcoming travels)

### 6.2 Custom Reports
- Date range selector
- Group by: Agent, Vendor, Travel Type, Status
- Export to PDF, Excel, CSV

---

## 7. Mobile Considerations

- Fully responsive design (works on tablets and phones)
- Touch-friendly UI elements
- Mobile-optimized forms
- Progressive Web App (PWA) capabilities for offline access (future)

---

This document serves as the complete specification for the Travel Agency Management System. All features listed here should be implemented in the project.
