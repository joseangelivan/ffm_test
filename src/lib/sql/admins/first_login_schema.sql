
-- Table to store temporary PINs for the first login of an admin
CREATE TABLE IF NOT EXISTS admin_first_login_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE,
    pin_hash VARCHAR(255) NOT NULL,
    attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_first_login_pins_admin_id ON admin_first_login_pins(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_first_login_pins_expires_at ON admin_first_login_pins(expires_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_admin_first_login_pins_updated_at') THEN
    CREATE TRIGGER trigger_admin_first_login_pins_updated_at
    BEFORE UPDATE ON admin_first_login_pins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
