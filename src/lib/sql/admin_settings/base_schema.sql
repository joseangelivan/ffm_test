
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'pt-BR' NOT NULL,
    theme VARCHAR(255) DEFAULT 'light' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER trigger_update_admin_settings_updated_at
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
