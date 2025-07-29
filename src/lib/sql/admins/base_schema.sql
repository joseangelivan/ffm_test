-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to update `updated_at` timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Trigger for admins `updated_at`
DROP TRIGGER IF EXISTS set_timestamp_admins ON admins;
CREATE TRIGGER set_timestamp_admins
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Seed Default Admin
-- The password is NULL, forcing the first-login flow.
INSERT INTO admins (name, email, password_hash, can_create_admins)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', NULL, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL, -- 'admin', 'resident', 'gatekeeper'
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Admin Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'light',
    language VARCHAR(5) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for admin_settings `updated_at`
DROP TRIGGER IF EXISTS set_timestamp_admin_settings ON admin_settings;
CREATE TRIGGER set_timestamp_admin_settings
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- Admin First Login PINs Table
CREATE TABLE IF NOT EXISTS admin_first_login_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Email Verification PINs Table (for changing email)
CREATE TABLE IF NOT EXISTS admin_verification_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

