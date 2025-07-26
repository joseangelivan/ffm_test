-- Migration from base_schema to the final auth schema.

-- Step 1: Drop obsolete tables that are not in the final schema.
-- These tables are related to condominiums, users, and devices, which are being removed.
DROP TABLE IF EXISTS geofences;
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS condominios;

-- Step 2: Alter the 'admins' table to match the final schema.
-- The 'avatar_url' column is no longer needed.
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;

-- Step 3: Create new tables required by the final schema.
-- The 'sessions' and 'admin_settings' tables are new for managing authentication and user preferences.

-- Sessions Table
-- Stores session tokens for authenticated administrators.
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Admin Settings Table
-- Stores UI/preference settings for each admin.
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID UNIQUE NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
