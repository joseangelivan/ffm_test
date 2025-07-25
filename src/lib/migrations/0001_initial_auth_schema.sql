-- Comprehensive Schema Transformation Script
-- Objective: Move the database from any previous state to the final auth-focused schema.

-- Phase 1: Radical Cleanup
-- Drop all tables that are no longer part of the final schema.
-- Using CASCADE to handle any potential foreign key relationships automatically.
DROP TABLE IF EXISTS condominios CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS geofences CASCADE;
DROP TABLE IF EXISTS map_elements CASCADE;
DROP TABLE IF EXISTS element_types CASCADE;
DROP TABLE IF EXISTS "Usuarios" CASCADE; -- Legacy table from previous attempts
DROP TABLE IF EXISTS "user_preferences" CASCADE; -- Legacy table from previous attempts

-- Phase 2: Establish Final Schema
-- Create the tables required for the admin authentication system.
-- Using IF NOT EXISTS to make the script safely rerunnable.

-- Table for administrators
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for admin session management
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing admin-specific settings like theme and language
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_sessions_admin_id ON sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
