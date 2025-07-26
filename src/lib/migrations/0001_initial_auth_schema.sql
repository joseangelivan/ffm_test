-- Migration script from base_schema to the new schema

-- Step 1: Drop tables that are no longer in use
DROP TABLE IF EXISTS geofences;
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS condominios;

-- Step 2: Modify existing tables to match the new schema
-- Remove unused avatar_url column from admins
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;


-- Step 3: Create new tables required by the new schema
-- Create sessions table for handling user sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Create admin_settings table for user preferences
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) NOT NULL DEFAULT 'light',
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(admin_id)
);


-- Step 4: Insert initial data required for the application to run
-- Insert a default admin user if it doesn't exist
INSERT INTO admins (id, name, email, password_hash, created_at)
VALUES (
    uuid_generate_v4(),
    'Admin',
    'admin@followforme.com',
    '$2b$10$gL.8oVn8.J2A9G5j2hK/..wX.Z.C/1e.R.a9H/4b.T.d6.S.b5.S', -- Hash for password 'admin'
    NOW()
) ON CONFLICT (email) DO NOTHING;
