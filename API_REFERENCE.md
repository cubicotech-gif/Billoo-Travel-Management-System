# API Reference - Travel Agency Management System

Base URL: `http://localhost:3001/api` (Development)
Production: `https://yourdomain.com/api`

## Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## 1. Authentication Endpoints

### POST /api/auth/register
Create new user (Admin only)

**Request Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string",
  "role": "Admin|Manager|Agent|Finance|Viewer",
  "phone": "string"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "Agent"
  }
}
```

---

### POST /api/auth/login
User login

**Request Body**:
```json
{
  "email": "admin@travelagency.com",
  "password": "Admin@123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@travelagency.com",
      "full_name": "System Administrator",
      "role": "Admin"
    }
  }
}
```

---

### GET /api/auth/me
Get current user info

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@travelagency.com",
    "full_name": "System Administrator",
    "role": "Admin"
  }
}
```

---

### POST /api/auth/logout
Logout (client-side token removal)

**Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 2. Passengers

### GET /api/passengers
Get all passengers with pagination

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20)
- `search` (search by name, phone, email)
- `status` (Active|Inactive|Blacklisted)

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "full_name": "Ahmed Khan",
      "phone": "+92-300-1234567",
      "email": "ahmed@example.com",
      "status": "Active",
      "assigned_agent_id": 2,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### GET /api/passengers/:id
Get single passenger

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "full_name": "Ahmed Khan",
    "phone": "+92-300-1234567",
    "whatsapp": "+92-300-1234567",
    "email": "ahmed@example.com",
    "date_of_birth": "1990-05-15",
    "nationality": "Pakistani",
    "cnic": "42101-1234567-1",
    "passport_number": "AB1234567",
    "passport_expiry": "2027-12-31",
    "reference_source": "Facebook",
    "status": "Active",
    "assigned_agent": {
      "id": 2,
      "full_name": "Agent Name"
    },
    "stats": {
      "total_queries": 5,
      "completed_trips": 3,
      "total_spent": 500000,
      "outstanding_balance": 0
    }
  }
}
```

---

### POST /api/passengers
Create new passenger

**Request Body**:
```json
{
  "full_name": "Ahmed Khan",
  "phone": "+92-300-1234567",
  "whatsapp": "+92-300-1234567",
  "email": "ahmed@example.com",
  "date_of_birth": "1990-05-15",
  "nationality": "Pakistani",
  "cnic": "42101-1234567-1",
  "passport_number": "AB1234567",
  "passport_expiry": "2027-12-31",
  "reference_source": "Facebook",
  "assigned_agent_id": 2
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Passenger created successfully",
  "data": { /* passenger object */ }
}
```

---

### PUT /api/passengers/:id
Update passenger

**Request Body**: Same as POST (partial update allowed)

**Response** (200):
```json
{
  "success": true,
  "message": "Passenger updated successfully",
  "data": { /* updated passenger */ }
}
```

---

### DELETE /api/passengers/:id
Delete passenger (soft delete or hard delete based on implementation)

**Response** (200):
```json
{
  "success": true,
  "message": "Passenger deleted successfully"
}
```

---

## 3. Vendors

### GET /api/vendors
Get all vendors

**Query Parameters**:
- `page`, `limit`
- `service_type` (Flight|Hotel|Visa|Transport|Tour)
- `city`
- `status` (Active|Inactive)

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Skyways Travel",
      "service_tags": ["Flights", "Hotels"],
      "contact_person": "Ali Ahmed",
      "phone": "+92-300-9876543",
      "city": "Karachi",
      "status": "Active",
      "balance": 150000
    }
  ]
}
```

---

### GET /api/vendors/:id
Get single vendor with balance details

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Skyways Travel",
    "service_tags": ["Flights", "Hotels"],
    "contact_person": "Ali Ahmed",
    "phone": "+92-300-9876543",
    "whatsapp": "+92-300-9876543",
    "email": "info@skyways.com",
    "address": "123 Main St, Karachi",
    "city": "Karachi",
    "payment_terms": "Net 30",
    "currency": "PKR",
    "status": "Active",
    "balance_details": {
      "total_billed": 500000,
      "total_paid": 350000,
      "outstanding": 150000
    }
  }
}
```

---

### POST /api/vendors
Create vendor

**Request Body**:
```json
{
  "name": "Skyways Travel",
  "service_tags": ["Flights", "Hotels"],
  "contact_person": "Ali Ahmed",
  "phone": "+92-300-9876543",
  "whatsapp": "+92-300-9876543",
  "email": "info@skyways.com",
  "city": "Karachi",
  "payment_terms": "Net 30",
  "currency": "PKR"
}
```

---

## 4. Queries

### GET /api/queries
Get all queries

**Query Parameters**:
- `page`, `limit`
- `status` (filter by status)
- `assigned_agent_id`
- `travel_type`
- `priority`
- `from_date`, `to_date` (created_at range)

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "query_number": "QRY-2025-0001",
      "passenger": {
        "id": 1,
        "full_name": "Ahmed Khan",
        "phone": "+92-300-1234567"
      },
      "status": "Working",
      "channel": "WhatsApp",
      "travel_type": "Umrah",
      "travel_start_date": "2025-03-15",
      "assigned_agent": {
        "id": 2,
        "full_name": "Agent Name"
      },
      "deadline": "2025-02-01T23:59:59Z",
      "priority": "High",
      "total_quoted": 150000,
      "total_cost": 120000,
      "profit_amount": 30000,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### GET /api/queries/:id
Get single query with all details

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "query_number": "QRY-2025-0001",
    "passenger": { /* full passenger object */ },
    "status": "Working",
    "sub_status": "Vendor Reply Pending",
    "channel": "WhatsApp",
    "travel_type": "Umrah",
    "travel_start_date": "2025-03-15",
    "travel_end_date": "2025-03-25",
    "number_of_passengers": 2,
    "assigned_agent": { /* agent object */ },
    "deadline": "2025-02-01T23:59:59Z",
    "priority": "High",
    "initial_notes": "Family trip for Umrah",
    "service_items": [
      {
        "id": 1,
        "service_type": "Flight",
        "description": "Return flight KHI-JED",
        "vendor": { /* vendor object */ },
        "vendor_price": 60000,
        "quoted_price": 75000,
        "markup": 15000,
        "booking_status": "Booked",
        "booking_reference": "PK300-ABC123"
      }
    ],
    "activity_log": [
      {
        "id": 1,
        "activity_type": "Status Change",
        "description": "Status changed from New Query to Working",
        "created_by": { /* user */ },
        "created_at": "2025-01-15T11:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/queries
Create new query

**Request Body**:
```json
{
  "pax_id": 1,
  "channel": "WhatsApp",
  "travel_type": "Umrah",
  "travel_start_date": "2025-03-15",
  "travel_end_date": "2025-03-25",
  "number_of_passengers": 2,
  "assigned_agent_id": 2,
  "deadline": "2025-02-01T23:59:59Z",
  "priority": "High",
  "initial_notes": "Family trip for Umrah"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Query created successfully",
  "data": {
    "id": 1,
    "query_number": "QRY-2025-0001",
    /* ... full query object */
  }
}
```

---

### PATCH /api/queries/:id/status
Change query status

**Request Body**:
```json
{
  "status": "Quoted",
  "sub_status": "Pax Response Pending",
  "notes": "Quote sent via WhatsApp"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Status updated successfully",
  "data": { /* updated query */ }
}
```

---

### GET /api/queries/pipeline
Get queries grouped by status (for Kanban view)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "New Query": [ /* array of queries */ ],
    "Working": [ /* array of queries */ ],
    "Quoted": [ /* array of queries */ ],
    "Finalized": [ /* array of queries */ ],
    // ... other statuses
  }
}
```

---

## 5. Service Items

### GET /api/queries/:queryId/services
Get all service items for a query

---

### POST /api/queries/:queryId/services
Add service item to query

**Request Body**:
```json
{
  "service_type": "Flight",
  "description": "Return flight KHI-JED",
  "vendor_id": 1,
  "vendor_price": 60000,
  "quoted_price": 75000,
  "service_date": "2025-03-15",
  "booking_details": {
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
    }
  }
}
```

---

### PUT /api/services/:id
Update service item

---

### PATCH /api/services/:id/booking
Update booking status and details

**Request Body**:
```json
{
  "booking_status": "Booked",
  "booking_reference": "PK300-ABC123",
  "booking_details": { /* updated details */ }
}
```

---

## 6. Invoices

### GET /api/invoices
Get all invoices

**Query Parameters**:
- `status` (Draft|Sent|Paid|Partial|Overdue)
- `pax_id`
- `from_date`, `to_date`

---

### GET /api/invoices/:id
Get single invoice

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-2025-0001",
    "passenger": { /* passenger object */ },
    "query": { /* query object */ },
    "issue_date": "2025-01-20",
    "due_date": "2025-02-20",
    "status": "Sent",
    "line_items": [
      {
        "service_type": "Flight",
        "description": "Return flight KHI-JED",
        "quantity": 2,
        "unit_price": 75000,
        "total": 150000
      }
    ],
    "subtotal": 150000,
    "tax_amount": 0,
    "total_amount": 150000,
    "amount_paid": 50000,
    "balance_due": 100000
  }
}
```

---

### POST /api/invoices
Create invoice from query

**Request Body**:
```json
{
  "query_id": 1,
  "pax_id": 1,
  "due_date": "2025-02-20",
  "notes": "Payment terms: 50% advance, 50% before departure",
  "line_items": [
    {
      "service_type": "Flight",
      "description": "Return flight KHI-JED (2 pax)",
      "quantity": 2,
      "unit_price": 75000,
      "total": 150000
    }
  ]
}
```

---

### GET /api/invoices/:id/pdf
Generate and download invoice PDF

**Response**: PDF file download

---

## 7. Payments

### GET /api/payments
Get all payment transactions

**Query Parameters**:
- `type` (Client Payment|Vendor Payment)
- `pax_id`
- `vendor_id`
- `from_date`, `to_date`

---

### POST /api/payments
Record a payment

**Request Body** (Client Payment):
```json
{
  "type": "Client Payment",
  "invoice_id": 1,
  "pax_id": 1,
  "amount": 50000,
  "payment_method": "Bank Transfer",
  "payment_date": "2025-01-22",
  "reference_number": "TXN123456",
  "notes": "Advance payment received"
}
```

**Request Body** (Vendor Payment):
```json
{
  "type": "Vendor Payment",
  "vendor_id": 1,
  "amount": 60000,
  "payment_method": "Bank Transfer",
  "payment_date": "2025-01-22",
  "reference_number": "CHQ001",
  "notes": "Payment for PK300 booking"
}
```

---

## 8. Attachments

### POST /api/attachments
Upload file

**Request**: Multipart form-data
```
entity_type: Passenger|Query|Service|Vendor
entity_id: 1
file_type: Passport|Visa|Photo|Invoice|Voucher
file: [file upload]
metadata: {"passport_expiry": "2027-12-31"}
```

**Response** (201):
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": 1,
    "file_name": "passport_ahmed_khan.pdf",
    "file_path": "/uploads/passports/123456_passport.pdf",
    "file_type": "Passport",
    "file_size": 524288,
    "uploaded_at": "2025-01-20T10:00:00Z"
  }
}
```

---

### GET /api/attachments/:id
Download file

**Response**: File download

---

## 9. Dashboard

### GET /api/dashboard/stats
Get dashboard statistics

**Response** (200):
```json
{
  "success": true,
  "data": {
    "new_queries": 12,
    "bookings_today": 5,
    "payments_due": 8,
    "checkins_next_7_days": 15,
    "revenue_this_month": 2500000,
    "profit_this_month": 500000
  }
}
```

---

### GET /api/dashboard/revenue-trend
Get revenue trend (last 6 months)

**Response** (200):
```json
{
  "success": true,
  "data": [
    { "month": "Aug 2024", "revenue": 1800000, "profit": 350000 },
    { "month": "Sep 2024", "revenue": 2100000, "profit": 420000 },
    { "month": "Oct 2024", "revenue": 2300000, "profit": 460000 },
    { "month": "Nov 2024", "revenue": 2600000, "profit": 520000 },
    { "month": "Dec 2024", "revenue": 2800000, "profit": 560000 },
    { "month": "Jan 2025", "revenue": 2500000, "profit": 500000 }
  ]
}
```

---

### GET /api/dashboard/pipeline
Get query counts by status

**Response** (200):
```json
{
  "success": true,
  "data": [
    { "status": "New Query", "count": 12 },
    { "status": "Working", "count": 25 },
    { "status": "Quoted", "count": 18 },
    { "status": "Finalized", "count": 8 },
    { "status": "Booking", "count": 10 },
    { "status": "Completed", "count": 150 }
  ]
}
```

---

## 10. Reports

### GET /api/reports/profit-loss
Profit & Loss report

**Query Parameters**:
- `from_date`, `to_date`
- `agent_id`
- `travel_type`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "total_revenue": 2500000,
    "total_cost": 2000000,
    "gross_profit": 500000,
    "expenses": 50000,
    "net_profit": 450000,
    "profit_margin": "18%",
    "breakdown_by_type": [
      { "travel_type": "Umrah", "revenue": 1500000, "profit": 300000 },
      { "travel_type": "Malaysia", "revenue": 800000, "profit": 160000 }
    ]
  }
}
```

---

### GET /api/reports/receivables
Outstanding client payments

---

### GET /api/reports/payables
Outstanding vendor payments

---

### GET /api/reports/agent-performance
Agent performance metrics

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "agent": { "id": 2, "full_name": "Agent One" },
      "queries_created": 50,
      "queries_converted": 35,
      "conversion_rate": "70%",
      "total_revenue": 1200000,
      "total_profit": 240000
    }
  ]
}
```

---

## 11. Notifications

### GET /api/notifications
Get notifications for current user

**Query Parameters**:
- `is_read` (true|false)
- `type`

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Deadline Approaching",
      "message": "Query QRY-2025-0001 deadline is in 24 hours",
      "type": "Deadline Approaching",
      "related_entity_type": "Query",
      "related_entity_id": 1,
      "is_read": false,
      "created_at": "2025-01-20T10:00:00Z"
    }
  ]
}
```

---

### PATCH /api/notifications/:id/read
Mark notification as read

---

## 12. Settings

### GET /api/settings
Get all settings

---

### PUT /api/settings/:key
Update a setting

**Request Body**:
```json
{
  "value": "Elite Travel Agency"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [ /* validation errors if applicable */ ]
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- 100 requests per 15 minutes per IP
- Exceeding limit returns `429 Too Many Requests`

---

This API reference should be used as a guide for implementing all backend endpoints.
