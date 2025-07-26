-- Remove obsolete tables from the old schema
DROP TABLE IF EXISTS condominios;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS geocercas;

-- Modify admins table to match the new schema
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;

-- Create new tables required by the new schema
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    admin_id UUID NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) NOT NULL DEFAULT 'light',
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Install pgcrypto for password hashing if not present
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert default admin user with a securely hashed password.
INSERT INTO admins (name, email, password_hash)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;
