-- Combined schema for the entire database after all migrations.
-- This file can be used to set up a new database instance from scratch.

-- From 0000_install_extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- From 0001_initial_auth_schema.sql
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    can_create_admins BOOLEAN NOT NULL DEFAULT FALSE, -- Added in 0002
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID UNIQUE NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sessions_admin_id ON sessions(admin_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_admins_email ON admins(email);
