CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    can_create_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_first_login_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_verification_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_totp_secrets (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_admins ON admins;
CREATE TRIGGER set_timestamp_admins
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_admin_totp_secrets ON admin_totp_secrets;
CREATE TRIGGER set_timestamp_admin_totp_secrets
BEFORE UPDATE ON admin_totp_secrets
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
