-- Base Schema for a new database.
-- This file should be updated with the complete, final schema after all migrations are applied.

-- Install necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admins Table to store administrator credentials and permissions
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    can_create_admins BOOLEAN DEFAULT false,
    created_at TIMESTAMMPTZ DEFAULT NOW(),
    updated_at TIMESTAMMPTZ DEFAULT NOW()
);

-- Sessions Table to manage admin sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMMPTZ NOT NULL,
    created_at TIMESTAMMPTZ DEFAULT NOW()
);

-- Admin Settings Table for user-specific preferences
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMMPTZ DEFAULT NOW(),
    updated_at TIMESTAMMPTZ DEFAULT NOW()
);

-- Schema Migrations Table to track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    sql_script TEXT,
    applied_at TIMESTAMMPTZ DEFAULT NOW()
);

-- Initial admin user with creation permissions
-- The password_hash here is a placeholder and should be a real bcrypt hash.
INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES
('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', '$2b$10$T.d/e/2B.a/6e1M5aE8x..rE.Z0iYwz.J0.vB/1yI/3jO2B.a/5m', true)
ON CONFLICT (email) DO NOTHING;
