CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    can_create_admins BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


CREATE TABLE IF NOT EXISTS admin_first_login_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS admin_verification_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_totp_secrets (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON admin_totp_secrets
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- This block ensures the `secret` column is of type TEXT, altering it if it was created with a different type in a previous version.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_totp_secrets'
        AND column_name = 'secret'
        AND data_type <> 'text'
    ) THEN
        ALTER TABLE admin_totp_secrets ALTER COLUMN secret TYPE TEXT;
    END IF;
END $$;
