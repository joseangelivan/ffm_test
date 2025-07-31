
CREATE TABLE IF NOT EXISTS admin_totp_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at_timestamp_admin_totp_secrets()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_admin_totp_secrets
BEFORE UPDATE ON admin_totp_secrets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp_admin_totp_secrets();
