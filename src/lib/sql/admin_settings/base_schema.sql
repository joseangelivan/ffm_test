
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    theme VARCHAR(255) NOT NULL DEFAULT 'light',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(admin_id)
);

-- Apply the trigger
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
