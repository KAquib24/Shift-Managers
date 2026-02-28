-- =========================================
-- DATABASE
-- =========================================
CREATE DATABASE IF NOT EXISTS workforce;
USE workforce;

-- =========================================
-- COMPANIES
-- =========================================
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_code VARCHAR(10) UNIQUE NOT NULL,
    industry VARCHAR(100),
    size VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    founder_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (company_code)
);

-- =========================================
-- USERS
-- =========================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('founder','admin','employee') DEFAULT 'employee',
    is_active BOOLEAN DEFAULT FALSE,
    company_code VARCHAR(10),
    company_id INT,
    approved_by INT,
    approved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_company (company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- =========================================
-- SHIFTS
-- =========================================
CREATE TABLE IF NOT EXISTS shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    employee_id INT NOT NULL,
    created_by INT,
    title VARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('scheduled','in_progress','completed','cancelled','late','absent') DEFAULT 'scheduled',
    notes TEXT,
    location VARCHAR(255),
    department VARCHAR(100),
    clock_in_time DATETIME,
    clock_out_time DATETIME,
    actual_hours INT,
    is_late BOOLEAN DEFAULT FALSE,
    late_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_employee (employee_id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

-- =========================================
-- SHIFT TEMPLATES
-- =========================================
CREATE TABLE IF NOT EXISTS shift_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    title VARCHAR(255),
    start_time VARCHAR(50),
    end_time VARCHAR(50),
    days_of_week VARCHAR(50),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- =========================================
-- LEAVE REQUESTS
-- =========================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    company_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
    reviewed_by INT,
    reviewed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- =========================================
-- EMPLOYEE REPORTS
-- =========================================
CREATE TABLE IF NOT EXISTS employee_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    company_id INT NOT NULL,
    generated_by INT NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    report_format VARCHAR(20) DEFAULT 'excel',
    status VARCHAR(20) DEFAULT 'pending',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    summary_data JSON,
    daily_breakdown JSON,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INT,
    total_days_in_month INT DEFAULT 0,
    attendance_days INT DEFAULT 0,
    leave_days INT DEFAULT 0,
    absent_days INT DEFAULT 0,
    total_hours FLOAT DEFAULT 0,
    total_minutes INT DEFAULT 0,
    average_hours_per_day FLOAT DEFAULT 0,
    late_arrivals INT DEFAULT 0,
    overtime_days INT DEFAULT 0,
    total_late_minutes INT DEFAULT 0,
    month INT NOT NULL,
    year INT NOT NULL,
    month_name VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_at DATETIME,
    downloaded_at DATETIME,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- =========================================
-- REPORT TEMPLATES
-- =========================================
CREATE TABLE IF NOT EXISTS report_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    created_by INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50),
    report_format VARCHAR(20) DEFAULT 'excel',
    config JSON,
    include_daily_breakdown BOOLEAN DEFAULT TRUE,
    include_summary BOOLEAN DEFAULT TRUE,
    include_employee_details BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- =========================================
-- SCHEDULED REPORTS
-- =========================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    created_by INT NOT NULL,
    template_id INT,
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50),
    report_format VARCHAR(20) DEFAULT 'excel',
    frequency VARCHAR(50),
    day_of_week INT,
    day_of_month INT,
    email_recipients JSON,
    last_run_at DATETIME,
    next_run_at DATETIME,
    last_report_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- =========================================
-- DEMO DATA
-- =========================================
INSERT INTO companies (name, company_code, founder_id)
VALUES ('Demo Company','DEMO123',1)
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO users (email, password_hash, full_name, role, is_active, company_id)
VALUES ('admin@demo.com',
'$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4fQyR/lW2u',
'Admin User',
'admin',
TRUE,
1)
ON DUPLICATE KEY UPDATE email=email;