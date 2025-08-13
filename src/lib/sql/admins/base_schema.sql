-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    can_create_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin First Login PINs Table
CREATE TABLE IF NOT EXISTS admin_first_login_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Verification PINs (for email change, etc.)
CREATE TABLE IF NOT EXISTS admin_verification_pins (
    admin_id UUID PRIMARY KEY,
    pin TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);


-- Admin TOTP Secrets Table
CREATE TABLE IF NOT EXISTS admin_totp_secrets (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Trigger for updated_at
CREATE TRIGGER trigger_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- Seed Default Admin User
-- The password 'adminivan123' is pre-hashed here.
INSERT INTO admins (name, email, password_hash, can_create_admins)
VALUES (
    'José Angel Iván Rubianes Silva',
    'angelivan34@gmail.com',
    '$2a$10$fVixcT22p48Lp2aX.zmMz.hJz2m3S4n4w5..p.5/5tY5.a.4Q2c3e', -- bcrypt hash for 'adminivan123'
    TRUE
) ON CONFLICT (email) DO NOTHING;
