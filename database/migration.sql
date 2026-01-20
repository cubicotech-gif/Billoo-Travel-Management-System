-- Billoo Travel Management System - Database Migration
-- Version: 1.0 (MVP)
-- Date: 2026-01-20

-- Drop tables if they exist (for fresh install)
DROP TABLE IF EXISTS queries;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Agent') DEFAULT 'Agent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create queries table
CREATE TABLE queries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  query_number VARCHAR(50) UNIQUE NOT NULL,
  passenger_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  travel_type ENUM('Umrah', 'Malaysia', 'Flight', 'Hotel', 'Other') NOT NULL,
  status ENUM('New', 'Working', 'Quoted', 'Finalized', 'Cancelled') DEFAULT 'New',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_query_number (query_number),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (email, password, full_name, role) VALUES
('admin@billoo.com', '$2b$10$YQjZXK5V7eJkOY5iKx5uP.FZqH8Z8hT5lZGqX5zQxYqN5JZxYqX5u', 'Admin User', 'Admin');

-- Note: The password hash above is for 'admin123'
-- In production, change this password immediately after first login

-- Insert sample queries (optional - for testing)
INSERT INTO queries (query_number, passenger_name, phone, email, travel_type, status, created_by) VALUES
('QRY-20260120-001', 'Muhammad Ahmed', '+92-300-1234567', 'ahmed@example.com', 'Umrah', 'New', 1),
('QRY-20260120-002', 'Fatima Khan', '+92-321-9876543', 'fatima@example.com', 'Malaysia', 'Working', 1),
('QRY-20260120-003', 'Ali Hassan', '+92-333-5555555', 'ali@example.com', 'Flight', 'Quoted', 1);

-- Success message
SELECT 'Database migration completed successfully!' AS message;
