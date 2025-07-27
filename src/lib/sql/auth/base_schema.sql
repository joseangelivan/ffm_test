-- Main administrators table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    can_create_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on admins table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_admins_timestamp' AND tgrelid = 'admins'::regclass
    ) THEN
        CREATE TRIGGER set_admins_timestamp
        BEFORE UPDATE ON admins
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END
$$;

-- Table for admin-specific settings
CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for admin_settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_admin_settings_timestamp' AND tgrelid = 'admin_settings'::regclass
    ) THEN
        CREATE TRIGGER set_admin_settings_timestamp
        BEFORE UPDATE ON admin_settings
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END
$$;

-- Table for email change verification PINs
CREATE TABLE IF NOT EXISTS admin_verification_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Sessions table for all user types
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL, -- 'admin', 'resident', 'gatekeeper'
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id_type ON sessions(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Residents table
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gatekeepers table
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resident-specific settings table
CREATE TABLE IF NOT EXISTS resident_settings (
    resident_id UUID PRIMARY KEY REFERENCES residents(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gatekeeper-specific settings table
CREATE TABLE IF NOT EXISTS gatekeeper_settings (
    gatekeeper_id UUID PRIMARY KEY REFERENCES gatekeepers(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for residents, gatekeepers, and their settings
DO $$
BEGIN
    -- Residents
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_residents_timestamp' AND tgrelid = 'residents'::regclass) THEN
        CREATE TRIGGER set_residents_timestamp BEFORE UPDATE ON residents FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
    -- Gatekeepers
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_gatekeepers_timestamp' AND tgrelid = 'gatekeepers'::regclass) THEN
        CREATE TRIGGER set_gatekeepers_timestamp BEFORE UPDATE ON gatekeepers FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
    -- Resident Settings
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_resident_settings_timestamp' AND tgrelid = 'resident_settings'::regclass) THEN
        CREATE TRIGGER set_resident_settings_timestamp BEFORE UPDATE ON resident_settings FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
    -- Gatekeeper Settings
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_gatekeeper_settings_timestamp' AND tgrelid = 'gatekeeper_settings'::regclass) THEN
        CREATE TRIGGER set_gatekeeper_settings_timestamp BEFORE UPDATE ON gatekeeper_settings FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END
$$;
