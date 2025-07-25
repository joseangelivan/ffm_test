-- Migration: 0001_initial_auth_schema.sql
-- Description: Transforms the database from an initial state to the required schema for the application.
-- This script is designed to be idempotent and safe to run multiple times.

-- Step 1: Handle the 'admins' table.
-- If an old 'Usuarios' table exists, rename it to 'admins' to preserve data.
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuarios')
       AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admins') THEN
        ALTER TABLE usuarios RENAME TO admins;
    END IF;
END $$;

-- Ensure the 'admins' table exists with the correct columns.
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the 'name' column to the 'admins' table if it doesn't exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='admins' AND column_name='name') THEN
        ALTER TABLE admins ADD COLUMN name VARCHAR(255);
    END IF;
END $$;


-- Step 2: Create the 'admin_settings' table if it doesn't exist.
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(admin_id)
);


-- Step 3: Create the 'sessions' table if it doesn't exist.
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Step 4: Clean up obsolete tables.
DROP TABLE IF EXISTS user_preferences;
