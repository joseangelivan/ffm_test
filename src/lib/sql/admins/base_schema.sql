
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT,
    can_create_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_first_login_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_totp_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_verification_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    pin VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers para actualizar 'updated_at'
DROP TRIGGER IF EXISTS trigger_update_admins_updated_at ON admins;
CREATE TRIGGER trigger_update_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_admin_totp_secrets_updated_at ON admin_totp_secrets;
CREATE TRIGGER trigger_update_admin_totp_secrets_updated_at
BEFORE UPDATE ON admin_totp_secrets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
