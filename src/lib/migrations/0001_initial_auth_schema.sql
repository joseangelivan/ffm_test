-- Migration to add authentication and admin settings tables

-- Table for administrators
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table for admin sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table for admin-specific settings
CREATE TABLE admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'light' NOT NULL,
    language VARCHAR(5) DEFAULT 'es' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Pre-populate with a default admin for testing if it doesn't exist
INSERT INTO admins (id, name, email, password_hash)
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'Admin', 'admin@example.com', '$2b$10$f66v.R1uLwpSfrxS342/o.d5KjT./xJzY7i3G0QwK1fHq.1aX.m1K')
ON CONFLICT (email) DO NOTHING;
