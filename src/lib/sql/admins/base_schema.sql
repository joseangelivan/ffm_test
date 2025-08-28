-- src/lib/sql/admins/base_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    can_create_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for admins table
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Trigger for admins table
CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- Admin First Login Pins Table
CREATE TABLE IF NOT EXISTS admin_first_login_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Admin TOTP Secrets Table
CREATE TABLE IF NOT EXISTS admin_totp_secrets (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL
);

-- Admin Verification Pins Table for email changes
CREATE TABLE IF NOT EXISTS admin_verification_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
