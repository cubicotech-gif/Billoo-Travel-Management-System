# Database Schema - Travel Agency Management System

## Database: `travel_agency_db`

### Character Set: UTF-8 (utf8mb4)
### Engine: InnoDB
### Collation: utf8mb4_unicode_ci

---

## Complete SQL Schema

```sql
-- ====================================
-- 1. USERS TABLE
-- ====================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('Admin', 'Manager', 'Agent', 'Finance', 'Viewer') NOT NULL DEFAULT 'Agent',
    phone VARCHAR(20),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 2. PASSENGERS TABLE
-- ====================================
CREATE TABLE passengers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    email VARCHAR(100),
    date_of_birth DATE,
    nationality VARCHAR(50),
    cnic VARCHAR(20),
    passport_number VARCHAR(20),
    passport_expiry DATE,
    reference_source VARCHAR(100),
    profile_photo VARCHAR(255),
    status ENUM('Active', 'Inactive', 'Blacklisted') DEFAULT 'Active',
    assigned_agent_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_passport (passport_number),
    INDEX idx_cnic (cnic),
    INDEX idx_status (status),
    INDEX idx_full_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 3. VENDORS TABLE
-- ====================================
CREATE TABLE vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    service_tags JSON,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    whatsapp_group_name VARCHAR(100),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    country VARCHAR(50),
    payment_terms TEXT,
    currency VARCHAR(10) DEFAULT 'PKR',
    bank_details JSON,
    default_commission_percentage DECIMAL(5,2),
    rating DECIMAL(2,1),
    notes TEXT,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_city (city),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 4. QUERIES TABLE
-- ====================================
CREATE TABLE queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_number VARCHAR(20) UNIQUE NOT NULL,
    pax_id INT NOT NULL,
    status ENUM(
        'New Query',
        'Working',
        'Quoted',
        'Finalized',
        'Booking',
        'Documents Collected',
        'Issued/Delivered',
        'Check-in Pending',
        'Completed',
        'Returned',
        'Cancelled'
    ) NOT NULL DEFAULT 'New Query',
    sub_status VARCHAR(50),
    channel ENUM('WhatsApp', 'Phone', 'Social', 'Walk-in', 'Referral', 'Email') NOT NULL,
    source_referrer VARCHAR(100),
    travel_type ENUM('Umrah', 'Malaysia', 'Intl Tour', 'Flight only', 'Hotel only', 'Visa', 'Other') NOT NULL,
    travel_start_date DATE,
    travel_end_date DATE,
    flexible_dates BOOLEAN DEFAULT FALSE,
    number_of_passengers INT DEFAULT 1,
    assigned_agent_id INT,
    deadline DATETIME,
    priority ENUM('Low', 'Normal', 'High', 'Urgent') DEFAULT 'Normal',
    initial_notes TEXT,
    profit_amount DECIMAL(10,2) DEFAULT 0,
    total_quoted DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    last_modified_by INT,
    FOREIGN KEY (pax_id) REFERENCES passengers(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (last_modified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_query_number (query_number),
    INDEX idx_pax_id (pax_id),
    INDEX idx_status (status),
    INDEX idx_agent (assigned_agent_id),
    INDEX idx_travel_dates (travel_start_date, travel_end_date),
    INDEX idx_deadline (deadline),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 5. SERVICE ITEMS TABLE
-- ====================================
CREATE TABLE service_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_id INT NOT NULL,
    service_type ENUM('Flight', 'Hotel', 'Visa', 'Transport', 'Tour', 'Insurance', 'Other') NOT NULL,
    description TEXT,
    vendor_id INT,
    vendor_price DECIMAL(10,2) DEFAULT 0,
    quoted_price DECIMAL(10,2) DEFAULT 0,
    markup DECIMAL(10,2) GENERATED ALWAYS AS (quoted_price - vendor_price) STORED,
    commission_percentage DECIMAL(5,2),
    availability_status ENUM('Requested', 'Available', 'Not Available') DEFAULT 'Requested',
    booking_status ENUM('Not Booked', 'Booked', 'Failed', 'Cancelled') DEFAULT 'Not Booked',
    booking_reference VARCHAR(100),
    booking_details JSON,
    service_date DATE,
    service_end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_query_id (query_id),
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_service_type (service_type),
    INDEX idx_booking_status (booking_status),
    INDEX idx_service_date (service_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 6. INVOICES TABLE
-- ====================================
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    query_id INT NOT NULL,
    pax_id INT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('Draft', 'Sent', 'Paid', 'Partial', 'Overdue', 'Cancelled') DEFAULT 'Draft',
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    line_items JSON,
    notes TEXT,
    terms_and_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE,
    FOREIGN KEY (pax_id) REFERENCES passengers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_query_id (query_id),
    INDEX idx_pax_id (pax_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 7. PAYMENT TRANSACTIONS TABLE
-- ====================================
CREATE TABLE payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_number VARCHAR(20) UNIQUE NOT NULL,
    type ENUM('Client Payment', 'Vendor Payment') NOT NULL,
    invoice_id INT,
    pax_id INT,
    vendor_id INT,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('Cash', 'Bank Transfer', 'Cheque', 'Credit Card', 'Online') NOT NULL,
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100),
    receipt_attachment VARCHAR(255),
    notes TEXT,
    recorded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (pax_id) REFERENCES passengers(id) ON DELETE SET NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_transaction_number (transaction_number),
    INDEX idx_type (type),
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_pax_id (pax_id),
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 8. ACTIVITY LOGS TABLE
-- ====================================
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_id INT,
    pax_id INT,
    activity_type ENUM(
        'Note',
        'Status Change',
        'Payment',
        'Booking',
        'Document',
        'Email Sent',
        'WhatsApp Sent',
        'Other'
    ) NOT NULL,
    description TEXT NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE,
    FOREIGN KEY (pax_id) REFERENCES passengers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_query_id (query_id),
    INDEX idx_pax_id (pax_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 9. ATTACHMENTS TABLE
-- ====================================
CREATE TABLE attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('Passenger', 'Query', 'Service', 'Vendor', 'Invoice') NOT NULL,
    entity_id INT NOT NULL,
    file_type ENUM('Passport', 'Visa', 'Photo', 'Invoice', 'Voucher', 'Ticket', 'Receipt', 'Other') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    metadata JSON,
    version INT DEFAULT 1,
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_file_type (file_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 10. NOTIFICATIONS TABLE
-- ====================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM(
        'Query Assigned',
        'Deadline Approaching',
        'Deadline Overdue',
        'Vendor Reply',
        'Payment Due',
        'Check-in Upcoming',
        'Document Expiry',
        'System'
    ) NOT NULL,
    related_entity_type ENUM('Query', 'Invoice', 'Payment', 'Passenger') NOT NULL,
    related_entity_id INT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 11. SETTINGS TABLE
-- ====================================
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('text', 'number', 'boolean', 'json') DEFAULT 'text',
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 12. MESSAGE TEMPLATES TABLE
-- ====================================
CREATE TABLE message_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    template_type ENUM('Email', 'WhatsApp', 'SMS') NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    variables JSON,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_template_type (template_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 13. AUDIT LOGS TABLE
-- ====================================
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Triggers for Auto-Calculations

```sql
-- ====================================
-- TRIGGER: Update Query Totals
-- ====================================
DELIMITER $$

CREATE TRIGGER update_query_totals_after_service_insert
AFTER INSERT ON service_items
FOR EACH ROW
BEGIN
    UPDATE queries
    SET 
        total_quoted = (
            SELECT COALESCE(SUM(quoted_price), 0)
            FROM service_items
            WHERE query_id = NEW.query_id
        ),
        total_cost = (
            SELECT COALESCE(SUM(vendor_price), 0)
            FROM service_items
            WHERE query_id = NEW.query_id
        ),
        profit_amount = (
            SELECT COALESCE(SUM(quoted_price - vendor_price), 0)
            FROM service_items
            WHERE query_id = NEW.query_id
        )
    WHERE id = NEW.query_id;
END$$

CREATE TRIGGER update_query_totals_after_service_update
AFTER UPDATE ON service_items
FOR EACH ROW
BEGIN
    UPDATE queries
    SET 
        total_quoted = (
            SELECT COALESCE(SUM(quoted_price), 0)
            FROM service_items
            WHERE query_id = NEW.query_id
        ),
        total_cost = (
            SELECT COALESCE(SUM(vendor_price), 0)
            FROM service_items
            WHERE query_id = NEW.query_id
        ),
        profit_amount = (
            SELECT COALESCE(SUM(quoted_price - vendor_price), 0)
            FROM service_items
            WHERE query_id = NEW.query_id
        )
    WHERE id = NEW.query_id;
END$$

CREATE TRIGGER update_query_totals_after_service_delete
AFTER DELETE ON service_items
FOR EACH ROW
BEGIN
    UPDATE queries
    SET 
        total_quoted = (
            SELECT COALESCE(SUM(quoted_price), 0)
            FROM service_items
            WHERE query_id = OLD.query_id
        ),
        total_cost = (
            SELECT COALESCE(SUM(vendor_price), 0)
            FROM service_items
            WHERE query_id = OLD.query_id
        ),
        profit_amount = (
            SELECT COALESCE(SUM(quoted_price - vendor_price), 0)
            FROM service_items
            WHERE query_id = OLD.query_id
        )
    WHERE id = OLD.query_id;
END$$

DELIMITER ;
```

```sql
-- ====================================
-- TRIGGER: Update Invoice Paid Amount
-- ====================================
DELIMITER $$

CREATE TRIGGER update_invoice_paid_after_payment_insert
AFTER INSERT ON payment_transactions
FOR EACH ROW
BEGIN
    IF NEW.type = 'Client Payment' AND NEW.invoice_id IS NOT NULL THEN
        UPDATE invoices
        SET amount_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payment_transactions
            WHERE invoice_id = NEW.invoice_id AND type = 'Client Payment'
        )
        WHERE id = NEW.invoice_id;
        
        -- Update invoice status
        UPDATE invoices
        SET status = CASE
            WHEN balance_due = 0 THEN 'Paid'
            WHEN balance_due < total_amount THEN 'Partial'
            WHEN due_date < CURDATE() AND balance_due > 0 THEN 'Overdue'
            ELSE status
        END
        WHERE id = NEW.invoice_id;
    END IF;
END$$

CREATE TRIGGER update_invoice_paid_after_payment_delete
AFTER DELETE ON payment_transactions
FOR EACH ROW
BEGIN
    IF OLD.type = 'Client Payment' AND OLD.invoice_id IS NOT NULL THEN
        UPDATE invoices
        SET amount_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payment_transactions
            WHERE invoice_id = OLD.invoice_id AND type = 'Client Payment'
        )
        WHERE id = OLD.invoice_id;
        
        -- Update invoice status
        UPDATE invoices
        SET status = CASE
            WHEN balance_due = 0 THEN 'Paid'
            WHEN balance_due < total_amount THEN 'Partial'
            WHEN due_date < CURDATE() AND balance_due > 0 THEN 'Overdue'
            ELSE 'Sent'
        END
        WHERE id = OLD.invoice_id;
    END IF;
END$$

DELIMITER ;
```

---

## Indexes for Performance

All important indexes are already included in the table creation statements above.

---

## Views for Common Queries

```sql
-- ====================================
-- VIEW: Dashboard Statistics
-- ====================================
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM queries WHERE status = 'New Query') AS new_queries,
    (SELECT COUNT(*) FROM queries WHERE DATE(travel_start_date) = CURDATE()) AS bookings_today,
    (SELECT COUNT(*) FROM invoices WHERE status IN ('Sent', 'Partial', 'Overdue') AND balance_due > 0) AS payments_due,
    (SELECT COUNT(*) FROM queries WHERE status = 'Check-in Pending' AND travel_start_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)) AS checkins_next_7_days,
    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE MONTH(issue_date) = MONTH(CURDATE()) AND YEAR(issue_date) = YEAR(CURDATE())) AS revenue_this_month,
    (SELECT COALESCE(SUM(profit_amount), 0) FROM queries WHERE status IN ('Completed', 'Returned') AND MONTH(updated_at) = MONTH(CURDATE()) AND YEAR(updated_at) = YEAR(CURDATE())) AS profit_this_month;

-- ====================================
-- VIEW: Vendor Balances
-- ====================================
CREATE OR REPLACE VIEW vendor_balances AS
SELECT
    v.id AS vendor_id,
    v.name AS vendor_name,
    COALESCE(SUM(si.vendor_price), 0) AS total_billed,
    COALESCE(SUM(pt.amount), 0) AS total_paid,
    COALESCE(SUM(si.vendor_price), 0) - COALESCE(SUM(pt.amount), 0) AS balance
FROM vendors v
LEFT JOIN service_items si ON v.id = si.vendor_id AND si.booking_status = 'Booked'
LEFT JOIN payment_transactions pt ON v.id = pt.vendor_id AND pt.type = 'Vendor Payment'
GROUP BY v.id, v.name;

-- ====================================
-- VIEW: Passenger Summary
-- ====================================
CREATE OR REPLACE VIEW passenger_summary AS
SELECT
    p.id AS passenger_id,
    p.full_name,
    p.phone,
    p.email,
    COUNT(DISTINCT q.id) AS total_queries,
    COUNT(DISTINCT CASE WHEN q.status = 'Completed' THEN q.id END) AS completed_trips,
    COALESCE(SUM(i.total_amount), 0) AS total_spent,
    COALESCE(SUM(i.amount_paid), 0) AS total_paid,
    COALESCE(SUM(i.balance_due), 0) AS outstanding_balance
FROM passengers p
LEFT JOIN queries q ON p.id = q.pax_id
LEFT JOIN invoices i ON q.id = i.query_id
GROUP BY p.id, p.full_name, p.phone, p.email;
```

---

## Sample Data (Seed)

```sql
-- ====================================
-- INSERT DEFAULT ADMIN USER
-- ====================================
-- Password: Admin@123 (hashed with bcrypt)
INSERT INTO users (username, email, password_hash, full_name, role, status)
VALUES ('admin', 'admin@travelagency.com', '$2b$10$example_hash_here', 'System Administrator', 'Admin', 'Active');

-- ====================================
-- INSERT DEFAULT SETTINGS
-- ====================================
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('agency_name', 'Elite Travel Agency', 'text', 'Name of the travel agency'),
('agency_logo', '/assets/logo.png', 'text', 'Path to agency logo'),
('agency_phone', '+92-300-1234567', 'text', 'Agency contact phone'),
('agency_email', 'info@travelagency.com', 'text', 'Agency contact email'),
('agency_address', '123 Main Street, Karachi, Pakistan', 'text', 'Agency address'),
('default_currency', 'PKR', 'text', 'Default currency'),
('tax_rate', '0', 'number', 'Tax rate percentage'),
('invoice_prefix', 'INV', 'text', 'Invoice number prefix'),
('query_prefix', 'QRY', 'text', 'Query number prefix'),
('transaction_prefix', 'TXN', 'text', 'Transaction number prefix'),
('terms_and_conditions', 'Standard terms and conditions...', 'text', 'Default T&C for invoices');

-- ====================================
-- INSERT SAMPLE MESSAGE TEMPLATES
-- ====================================
INSERT INTO message_templates (template_name, template_type, subject, body, variables, status) VALUES
('Quote Template', 'Email', 'Your Travel Quote - {query_number}', 'Dear {pax_name},\n\nThank you for your inquiry. Please find your travel quote attached.\n\nTotal: {total_amount}\n\nBest regards,\n{agency_name}', '["pax_name", "query_number", "total_amount", "agency_name"]', 'Active'),
('Payment Reminder', 'WhatsApp', NULL, 'Hi {pax_name}, this is a reminder that your payment of {balance_due} is due on {due_date}. Please make payment at your earliest convenience. Thank you!', '["pax_name", "balance_due", "due_date"]', 'Active'),
('Booking Confirmation', 'Email', 'Booking Confirmed - {query_number}', 'Dear {pax_name},\n\nYour booking has been confirmed!\n\nBooking Reference: {booking_reference}\nTravel Date: {travel_date}\n\nVoucher attached.\n\nBest regards,\n{agency_name}', '["pax_name", "query_number", "booking_reference", "travel_date", "agency_name"]', 'Active');
```

---

## Entity Relationship Diagram (ERD)

```
users (1) ----< (M) passengers (assigned_agent_id)
users (1) ----< (M) queries (assigned_agent_id, created_by)
users (1) ----< (M) activity_logs (created_by)
users (1) ----< (M) attachments (uploaded_by)
users (1) ----< (M) notifications (user_id)

passengers (1) ----< (M) queries (pax_id)
passengers (1) ----< (M) invoices (pax_id)
passengers (1) ----< (M) payment_transactions (pax_id)
passengers (1) ----< (M) activity_logs (pax_id)

queries (1) ----< (M) service_items (query_id)
queries (1) ----< (M) invoices (query_id)
queries (1) ----< (M) activity_logs (query_id)

vendors (1) ----< (M) service_items (vendor_id)
vendors (1) ----< (M) payment_transactions (vendor_id)

invoices (1) ----< (M) payment_transactions (invoice_id)
```

---

## Data Types Reference

- **INT**: Integer (up to ~2 billion)
- **VARCHAR(n)**: Variable character string (max n characters)
- **TEXT**: Long text (up to 65,535 characters)
- **DECIMAL(10,2)**: Decimal number (10 digits total, 2 after decimal)
- **DATE**: Date (YYYY-MM-DD)
- **DATETIME**: Date and time (YYYY-MM-DD HH:MM:SS)
- **TIMESTAMP**: Auto-updating timestamp
- **BOOLEAN**: True/False (stored as TINYINT)
- **ENUM**: Fixed set of values
- **JSON**: JSON data (MySQL 5.7+)

---

This schema is optimized for MySQL 8.0+ running on Namecheap hosting with InnoDB engine.
