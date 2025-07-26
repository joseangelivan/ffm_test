-- Migration from base schema to the new consolidated auth schema.

-- 1. Drop obsolete tables that are no longer in use.
-- These tables were part of the initial design but have been deprecated.
DROP TABLE IF EXISTS condominios CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS dispositivos CASCADE;
DROP TABLE IF EXISTS localizador_dispositivos CASCADE;
DROP TABLE IF EXISTS geofences CASCADE;

-- 2. Modify existing tables to match the new schema.
-- The 'admins' table is simplified, removing unused columns.
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;

-- 3. Create new tables required by the new authentication and settings system.
-- These tables did not exist in the base schema.
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID UNIQUE NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) NOT NULL DEFAULT 'light',
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Insert the default administrator if it does not exist.
-- This ensures the system has a root user from the beginning.
-- Instala la extensión pgcrypto si no está presente, necesaria para el hash de contraseñas.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- hasheando la contraseña con bcrypt para mayor seguridad.
INSERT INTO admins (name, email, password_hash)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;
