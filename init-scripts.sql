CREATE DATABASE IF NOT EXISTS auth_db;
CREATE DATABASE IF NOT EXISTS vendor_db;
CREATE DATABASE IF NOT EXISTS notification_db;
CREATE DATABASE IF NOT EXISTS meal_plan_db;

-- =====================================
-- 1. AUTH SERVICE DATABASE
-- =====================================
USE auth_db;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS vendor_admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    permissions VARCHAR(255) DEFAULT 'super',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 2. VENDOR SERVICE DATABASE
-- =====================================
USE vendor_db;
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY, -- Replicated from auth_db
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);
CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 3. NOTIFICATION SERVICE DATABASE
-- =====================================
USE notification_db;
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY, -- Replicated from auth_db
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);
CREATE TABLE IF NOT EXISTS notification_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 4. MEAL PLAN SERVICE DATABASE
-- =====================================
USE meal_plan_db;
CREATE TABLE IF NOT EXISTS meal_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    s3_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
