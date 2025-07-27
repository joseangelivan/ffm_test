-- Schema for admin account features

-- Table for storing verification pins for email changes
CREATE TABLE IF NOT EXISTS admin_verification_pins (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    pin VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(admin_id) -- Only one active pin per admin at a time
);

-- Index for efficient cleanup of expired pins
CREATE INDEX IF NOT EXISTS idx_admin_verification_pins_expires_at ON admin_verification_pins(expires_at);
