-- Base schema for the application
-- This file should reflect the initial state of the database for a new installation.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Admins table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    can_create_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for admins updated_at
CREATE TRIGGER update_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Admin Settings table
CREATE TABLE admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light' NOT NULL,
    language VARCHAR(10) DEFAULT 'es' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for admin_settings updated_at
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Admin User
INSERT INTO admins (name, email, password_hash, can_create_admins)
VALUES ('Admin Ivan', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')), TRUE);

-- This table will be created and managed by the migration runner code.
-- It should not be part of the application's schema itself.
-- Keeping it commented here for documentation purposes.
--
-- CREATE TABLE schema_migrations (
--     id SERIAL PRIMARY KEY,
--     migration_name VARCHAR(255) NOT NULL UNIQUE,
--     applied_at TIMESTAMPTZ DEFAULT NOW(),
--     sql_script TEXT
-- );
