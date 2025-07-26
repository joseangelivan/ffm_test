-- Drops obsolete tables from the base schema if they exist.
DROP TABLE IF EXISTS condominios;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS geocercas;

-- Alters the admins table to remove the unnecessary avatar_url column.
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;

-- Creates the sessions table if it does not exist.
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creates the admin_settings table if it does not exist.
CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light' NOT NULL,
    language VARCHAR(10) DEFAULT 'es' NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert the default admin user if they don't exist.
-- The password 'adminivan123' is hashed securely using bcrypt.
INSERT INTO admins (name, email, password_hash)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;
