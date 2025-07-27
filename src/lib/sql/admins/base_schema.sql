
-- Function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table for main administrators
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    can_create_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for admins table
DROP TRIGGER IF EXISTS set_timestamp_admins ON admins;
CREATE TRIGGER set_timestamp_admins
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Table for user sessions (applies to all user types)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL, -- 'admin', 'resident', 'gatekeeper'
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id_type ON sessions(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);


-- Table for administrator specific settings
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for admin_settings table
DROP TRIGGER IF EXISTS set_timestamp_admin_settings ON admin_settings;
CREATE TRIGGER set_timestamp_admin_settings
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


-- Table for Gatekeeper specific settings
CREATE TABLE IF NOT EXISTS gatekeeper_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gatekeeper_id UUID NOT NULL UNIQUE, -- Foreign key added later if gatekeepers table exists
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for gatekeeper_settings table
DROP TRIGGER IF EXISTS set_timestamp_gatekeeper_settings ON gatekeeper_settings;
CREATE TRIGGER set_timestamp_gatekeeper_settings
BEFORE UPDATE ON gatekeeper_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


-- Table for Resident specific settings
CREATE TABLE IF NOT EXISTS resident_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL UNIQUE, -- Foreign key added later if residents table exists
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for resident_settings table
DROP TRIGGER IF EXISTS set_timestamp_resident_settings ON resident_settings;
CREATE TRIGGER set_timestamp_resident_settings
BEFORE UPDATE ON resident_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Table for storing verification PINs for admin email changes
CREATE TABLE IF NOT EXISTS admin_verification_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    pin VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_verification_pins_admin_id ON admin_verification_pins(admin_id);


    