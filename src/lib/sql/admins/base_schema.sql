-- Main administrators table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    can_create_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for admin first login temporary PINs
CREATE TABLE IF NOT EXISTS admin_first_login_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE,
    pin_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_admin
        FOREIGN KEY(admin_id) 
        REFERENCES admins(id)
        ON DELETE CASCADE
);

-- Table for admin email change verification PINs
CREATE TABLE IF NOT EXISTS admin_verification_pins (
    admin_id UUID PRIMARY KEY,
    pin VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_admin
        FOREIGN KEY(admin_id) 
        REFERENCES admins(id)
        ON DELETE CASCADE
);

-- Table for admin-specific settings
CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY,
    theme VARCHAR(10) DEFAULT 'light' NOT NULL,
    language VARCHAR(5) DEFAULT 'pt' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_admin
        FOREIGN KEY(admin_id) 
        REFERENCES admins(id)
        ON DELETE CASCADE
);

-- Table for admin TOTP (2FA) secrets
CREATE TABLE IF NOT EXISTS admin_totp_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE,
    secret TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_admin
        FOREIGN KEY(admin_id) 
        REFERENCES admins(id)
        ON DELETE CASCADE
);

    